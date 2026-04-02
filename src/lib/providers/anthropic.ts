import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../systemPrompt';
import { AIProvider, ChatMessage, captureLeadToolDef, LeadData, ProviderEvent } from './types';

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic (Claude)';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<ProviderEvent> {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const tool = {
      name: captureLeadToolDef.name,
      description: captureLeadToolDef.description,
      input_schema: captureLeadToolDef.parameters as Anthropic.Tool['input_schema'],
    };

    const runStream = async function* (
      msgs: Anthropic.MessageParam[],
      client: Anthropic
    ): AsyncGenerator<ProviderEvent> {
      const stream = client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [tool],
        messages: msgs,
      });

      stream.on('text', (text) => {
        // handled via yielding below
      });

      // Yield text as it streams
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield { type: 'text', text: chunk.delta.text };
        }
      }

      const finalMsg = await stream.finalMessage();

      // Handle tool use
      for (const block of finalMsg.content) {
        if (block.type === 'tool_use' && block.name === 'capture_lead') {
          const input = block.input as {
            name?: string;
            phone?: string;
            location?: string;
            service_interest?: string;
          };
          const leadData: LeadData = {
            name: input.name,
            phone: input.phone,
            location: input.location,
            serviceInterest: input.service_interest,
          };
          yield { type: 'lead_captured', data: leadData };

          // Continue with tool result
          const continueMessages: Anthropic.MessageParam[] = [
            ...msgs,
            { role: 'assistant', content: finalMsg.content },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result' as const,
                  tool_use_id: block.id,
                  content: 'Lead information saved successfully. Please continue the conversation naturally.',
                },
              ],
            },
          ];

          yield* runStream(continueMessages, client);
          return;
        }
      }
    };

    yield* runStream(anthropicMessages, this.client);
    yield { type: 'done' };
  }
}
