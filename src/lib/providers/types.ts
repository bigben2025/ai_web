export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LeadData {
  name?: string;
  phone?: string;
  location?: string;
  serviceInterest?: string;
}

export type ProviderEvent =
  | { type: 'text'; text: string }
  | { type: 'lead_captured'; data: LeadData }
  | { type: 'done' };

export interface AIProvider {
  name: string;
  streamChat(messages: ChatMessage[]): AsyncGenerator<ProviderEvent>;
}

export const captureLeadToolDef = {
  name: 'capture_lead',
  description:
    'Capture lead information when a potential client shares their name, phone number, and location. Call this tool as soon as you have collected all three pieces of information.',
  parameters: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'The full name of the person inquiring about care' },
      phone: { type: 'string', description: 'Their phone number for follow-up' },
      location: { type: 'string', description: 'Their city or region in Florida' },
      service_interest: {
        type: 'string',
        description: "The type of care they're interested in",
      },
    },
    required: ['name', 'phone', 'location'],
  },
};
