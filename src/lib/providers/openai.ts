import OpenAI from 'openai';
import { systemPrompt } from '../systemPrompt';
import { AIProvider, ChatMessage, captureLeadToolDef, LeadData, ProviderEvent } from './types';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI (ChatGPT)';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<ProviderEvent> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    ];

    const tool: OpenAI.Chat.ChatCompletionTool = {
      type: 'function',
      function: {
        name: captureLeadToolDef.name,
        description: captureLeadToolDef.description,
        parameters: captureLeadToolDef.parameters,
      },
    };

    yield* this.runStream(openaiMessages, tool);
    yield { type: 'done' };
  }

  private async *runStream(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    tool: OpenAI.Chat.ChatCompletionTool
  ): AsyncGenerator<ProviderEvent> {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      tools: [tool],
      messages,
      stream: true,
    });

    let toolCallId = '';
    let toolCallName = '';
    let toolCallArgs = '';
    let hasToolCall = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text', text: delta.content };
      }

      if (delta.tool_calls?.[0]) {
        hasToolCall = true;
        const tc = delta.tool_calls[0];
        if (tc.id) toolCallId = tc.id;
        if (tc.function?.name) toolCallName = tc.function.name;
        if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
      }
    }

    if (hasToolCall && toolCallName === 'capture_lead') {
      const input = JSON.parse(toolCallArgs) as {
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

      // Continue after tool use
      const continueMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        {
          role: 'assistant',
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: { name: toolCallName, arguments: toolCallArgs },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: toolCallId,
          content: 'Lead information saved successfully. Please continue the conversation naturally.',
        },
      ];

      yield* this.runStream(continueMessages, tool);
    }
  }
}
