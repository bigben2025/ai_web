import { NextRequest } from 'next/server';
import { getOrCreateConversation, saveMessage, updateConversationLead, saveProspectAnalysis } from '@/lib/db';
import { getProvider } from '@/lib/providers';
import { analyzeProspect } from '@/lib/analyzeProspect';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, sessionId } = body as {
      messages: ChatMessage[];
      sessionId: string;
    };

    if (!messages || !Array.isArray(messages) || !sessionId) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const conversation = await getOrCreateConversation(sessionId);

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      await saveMessage(conversation.id, 'user', lastMessage.content);
    }

    let provider;
    try {
      provider = getProvider();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No AI provider configured';
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let fullAssistantResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          for await (const event of provider.streamChat(messages)) {
            if (event.type === 'text') {
              fullAssistantResponse += event.text;
              sendEvent({ type: 'text', text: event.text });
            } else if (event.type === 'lead_captured') {
              await updateConversationLead(sessionId, event.data);
              sendEvent({ type: 'lead_captured', data: event.data });
            } else if (event.type === 'done') {
              if (fullAssistantResponse) {
                await saveMessage(conversation.id, 'assistant', fullAssistantResponse);
              }
              const allMessages = [...messages, { role: 'assistant' as const, content: fullAssistantResponse }];
              analyzeProspect(allMessages).then((analysis) => {
                if (analysis) saveProspectAnalysis(conversation.id, analysis.status, analysis.summary);
              }).catch(() => {});
              sendEvent({ type: 'done' });
              controller.close();
              return;
            }
          }

          // Fallback close if generator finishes without 'done'
          if (fullAssistantResponse) {
            await saveMessage(conversation.id, 'assistant', fullAssistantResponse);
          }
          // Analyze prospect in background (don't block response)
          const allMessages = [...messages, { role: 'assistant' as const, content: fullAssistantResponse }];
          analyzeProspect(allMessages).then((analysis) => {
            if (analysis) saveProspectAnalysis(conversation.id, analysis.status, analysis.summary);
          }).catch(() => {});
          sendEvent({ type: 'done' });
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          sendEvent({ type: 'error', message: errorMsg });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
