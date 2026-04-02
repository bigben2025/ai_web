import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'concierge_care.db');

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      user_name TEXT,
      user_phone TEXT,
      user_location TEXT,
      service_interest TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
  `);

  return db;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface Conversation {
  id: string;
  session_id: string;
  user_name: string | null;
  user_phone: string | null;
  user_location: string | null;
  service_interest: string | null;
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

export function getOrCreateConversation(sessionId: string): Conversation {
  const database = getDB();

  let conversation = database
    .prepare('SELECT * FROM conversations WHERE session_id = ?')
    .get(sessionId) as Conversation | undefined;

  if (!conversation) {
    const id = generateId();
    database
      .prepare(
        'INSERT INTO conversations (id, session_id) VALUES (?, ?)'
      )
      .run(id, sessionId);
    conversation = database
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as Conversation;
  }

  return conversation;
}

export function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Message {
  const database = getDB();
  const id = generateId();

  database
    .prepare(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
    )
    .run(id, conversationId, role, content);

  // Update conversation updated_at
  database
    .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
    .run(conversationId);

  return database
    .prepare('SELECT * FROM messages WHERE id = ?')
    .get(id) as Message;
}

export function updateConversationLead(
  sessionId: string,
  leadData: {
    name?: string;
    phone?: string;
    location?: string;
    serviceInterest?: string;
  }
): void {
  const database = getDB();

  const updates: string[] = [];
  const values: string[] = [];

  if (leadData.name) {
    updates.push('user_name = ?');
    values.push(leadData.name);
  }
  if (leadData.phone) {
    updates.push('user_phone = ?');
    values.push(leadData.phone);
  }
  if (leadData.location) {
    updates.push('user_location = ?');
    values.push(leadData.location);
  }
  if (leadData.serviceInterest) {
    updates.push('service_interest = ?');
    values.push(leadData.serviceInterest);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(sessionId);

    database
      .prepare(
        `UPDATE conversations SET ${updates.join(', ')} WHERE session_id = ?`
      )
      .run(...values);
  }
}

export function getAllConversationsWithMessages(): (Conversation & {
  messages: Message[];
})[] {
  const database = getDB();

  const conversations = database
    .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
    .all() as Conversation[];

  return conversations.map((conv) => {
    const messages = database
      .prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      )
      .all(conv.id) as Message[];

    return { ...conv, messages };
  });
}

export function getStats(): {
  totalConversations: number;
  leadsWithPhone: number;
  todayConversations: number;
} {
  const database = getDB();

  const totalConversations = (
    database
      .prepare('SELECT COUNT(*) as count FROM conversations')
      .get() as { count: number }
  ).count;

  const leadsWithPhone = (
    database
      .prepare(
        "SELECT COUNT(*) as count FROM conversations WHERE user_phone IS NOT NULL AND user_phone != ''"
      )
      .get() as { count: number }
  ).count;

  const todayConversations = (
    database
      .prepare(
        "SELECT COUNT(*) as count FROM conversations WHERE date(created_at) = date('now')"
      )
      .get() as { count: number }
  ).count;

  return { totalConversations, leadsWithPhone, todayConversations };
}
