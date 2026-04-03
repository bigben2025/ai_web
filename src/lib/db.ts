import { createClient } from '@libsql/client';

function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function initDB() {
  const db = getDB();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      user_name TEXT,
      user_phone TEXT,
      user_location TEXT,
      service_interest TEXT,
      prospect_status TEXT,
      ai_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
  `);

  // Add new columns to existing tables if they don't exist yet
  for (const sql of [
    "ALTER TABLE conversations ADD COLUMN prospect_status TEXT",
    "ALTER TABLE conversations ADD COLUMN ai_summary TEXT",
    "ALTER TABLE conversations ADD COLUMN follow_up_status TEXT",
    "ALTER TABLE conversations ADD COLUMN notes TEXT",
  ]) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDB();
    initialized = true;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface Conversation {
  id: string;
  session_id: string;
  user_name: string | null;
  user_phone: string | null;
  user_location: string | null;
  service_interest: string | null;
  prospect_status: 'hot' | 'warm' | 'not_a_fit' | null;
  ai_summary: string | null;
  follow_up_status: 'not_contacted' | 'called' | 'no_answer' | 'appointment_set' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function getOrCreateConversation(sessionId: string): Promise<Conversation> {
  await ensureInit();
  const db = getDB();

  const existing = await db.execute({
    sql: 'SELECT * FROM conversations WHERE session_id = ?',
    args: [sessionId],
  });

  if (existing.rows.length > 0) {
    return existing.rows[0] as unknown as Conversation;
  }

  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO conversations (id, session_id) VALUES (?, ?)',
    args: [id, sessionId],
  });

  const created = await db.execute({
    sql: 'SELECT * FROM conversations WHERE id = ?',
    args: [id],
  });
  return created.rows[0] as unknown as Conversation;
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await ensureInit();
  const db = getDB();
  const id = generateId();

  await db.execute({
    sql: 'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
    args: [id, conversationId, role, content],
  });

  await db.execute({
    sql: "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
    args: [conversationId],
  });
}

export async function updateConversationLead(
  sessionId: string,
  leadData: {
    name?: string;
    phone?: string;
    location?: string;
    serviceInterest?: string;
  }
): Promise<void> {
  await ensureInit();
  const db = getDB();

  const updates: string[] = [];
  const values: (string)[] = [];

  if (leadData.name) { updates.push('user_name = ?'); values.push(leadData.name); }
  if (leadData.phone) { updates.push('user_phone = ?'); values.push(leadData.phone); }
  if (leadData.location) { updates.push('user_location = ?'); values.push(leadData.location); }
  if (leadData.serviceInterest) { updates.push('service_interest = ?'); values.push(leadData.serviceInterest); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(sessionId);
    await db.execute({
      sql: `UPDATE conversations SET ${updates.join(', ')} WHERE session_id = ?`,
      args: values,
    });
  }
}

export async function getAllConversationsWithMessages(): Promise<(Conversation & { messages: Message[] })[]> {
  await ensureInit();
  const db = getDB();

  const convResult = await db.execute('SELECT * FROM conversations ORDER BY updated_at DESC');
  const conversations = convResult.rows as unknown as Conversation[];

  return Promise.all(
    conversations.map(async (conv) => {
      const msgResult = await db.execute({
        sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        args: [conv.id],
      });
      return { ...conv, messages: msgResult.rows as unknown as Message[] };
    })
  );
}

export async function saveProspectAnalysis(
  conversationId: string,
  status: 'hot' | 'warm' | 'not_a_fit',
  summary: string
): Promise<void> {
  await ensureInit();
  const db = getDB();
  await db.execute({
    sql: "UPDATE conversations SET prospect_status = ?, ai_summary = ?, updated_at = datetime('now') WHERE id = ?",
    args: [status, summary, conversationId],
  });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await ensureInit();
  const db = getDB();
  await db.execute({
    sql: 'DELETE FROM conversations WHERE id = ?',
    args: [conversationId],
  });
}

export async function updateNotes(conversationId: string, notes: string): Promise<void> {
  await ensureInit();
  const db = getDB();
  await db.execute({
    sql: "UPDATE conversations SET notes = ?, updated_at = datetime('now') WHERE id = ?",
    args: [notes, conversationId],
  });
}

export async function updateFollowUpStatus(
  conversationId: string,
  status: 'not_contacted' | 'called' | 'no_answer' | 'appointment_set'
): Promise<void> {
  await ensureInit();
  const db = getDB();
  await db.execute({
    sql: "UPDATE conversations SET follow_up_status = ?, updated_at = datetime('now') WHERE id = ?",
    args: [status, conversationId],
  });
}

export async function getStats(): Promise<{
  totalConversations: number;
  leadsWithPhone: number;
  todayConversations: number;
  hotLeads: number;
}> {
  await ensureInit();
  const db = getDB();

  const [total, leads, today, hot] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM conversations'),
    db.execute("SELECT COUNT(*) as count FROM conversations WHERE user_phone IS NOT NULL AND user_phone != ''"),
    db.execute("SELECT COUNT(*) as count FROM conversations WHERE date(created_at) = date('now')"),
    db.execute("SELECT COUNT(*) as count FROM conversations WHERE prospect_status = 'hot'"),
  ]);

  return {
    totalConversations: Number(total.rows[0].count),
    leadsWithPhone: Number(leads.rows[0].count),
    todayConversations: Number(today.rows[0].count),
    hotLeads: Number(hot.rows[0].count),
  };
}
