import { getProvider } from './providers';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function analyzeProspect(
  messages: Message[]
): Promise<{ status: 'hot' | 'warm' | 'not_a_fit'; summary: string } | null> {
  // Only analyze if there are enough user messages to judge
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length < 2) return null;

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are analyzing a chat conversation from a home care company (Concierge Care Florida).

Based on the conversation below, respond with ONLY a JSON object in this exact format:
{"status":"hot","summary":"One sentence about who they are and what they need"}

Status rules:
- "hot" = has a specific care need, mentioned urgency, or left contact info
- "warm" = interested but vague, just browsing, or asked general questions
- "not_a_fit" = wrong service, spam, testing, or clearly not a real inquiry

Keep the summary under 15 words. Include name if known.

Conversation:
${transcript}

Respond with only the JSON, nothing else.`;

  try {
    const provider = getProvider();
    let result = '';

    for await (const event of provider.streamChat([{ role: 'user', content: prompt }])) {
      if (event.type === 'text') result += event.text;
    }

    const json = JSON.parse(result.trim());
    if (!json.status || !json.summary) return null;
    if (!['hot', 'warm', 'not_a_fit'].includes(json.status)) return null;

    return { status: json.status, summary: json.summary };
  } catch {
    return null;
  }
}
