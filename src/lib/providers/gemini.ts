import { GoogleGenAI, Type } from '@google/genai';
import { systemPrompt } from '../systemPrompt';
import { AIProvider, ChatMessage, captureLeadToolDef, LeadData, ProviderEvent } from './types';

export class GeminiProvider implements AIProvider {
  name = 'Google (Gemini)';
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<ProviderEvent> {
    // Build contents array — drop leading assistant messages (Gemini requires user-first)
    const firstUserIdx = messages.findIndex((m) => m.role === 'user');
    const validMessages = firstUserIdx === -1 ? messages : messages.slice(firstUserIdx);

    const contents = validMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const tools = [
      {
        functionDeclarations: [
          {
            name: captureLeadToolDef.name,
            description: captureLeadToolDef.description,
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'The full name of the person inquiring about care' },
                phone: { type: Type.STRING, description: 'Their phone number for follow-up' },
                location: { type: Type.STRING, description: 'Their city or region in Florida' },
                service_interest: { type: Type.STRING, description: "The type of care they're interested in" },
              },
              required: ['name', 'phone', 'location'],
            },
          },
        ],
      },
    ];

    yield* this.runStream(contents, tools);
    yield { type: 'done' };
  }

  private async *runStream(
    contents: any[],
    tools: object[]
  ): AsyncGenerator<ProviderEvent> {
    const response = await this.ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
        tools: tools as any,
      },
      contents,
    });

    let functionCall: { name: string; args: Record<string, string> } | null = null;

    for await (const chunk of response) {
      const part = chunk.candidates?.[0]?.content?.parts?.[0];
      if (!part) continue;

      if (part.text) {
        yield { type: 'text', text: part.text };
      } else if (part.functionCall) {
        functionCall = {
          name: part.functionCall.name!,
          args: (part.functionCall.args ?? {}) as Record<string, string>,
        };
      }
    }

    if (functionCall?.name === 'capture_lead') {
      const args = functionCall.args;
      const leadData: LeadData = {
        name: args.name,
        phone: args.phone,
        location: args.location,
        serviceInterest: args.service_interest,
      };
      yield { type: 'lead_captured', data: leadData };

      // Continue with tool result
      const continueContents = [
        ...contents,
        { role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { result: 'Lead information saved successfully. Please continue the conversation naturally.' },
              },
            },
          ],
        },
      ];

      yield* this.runStream(continueContents, tools);
    }
  }
}
