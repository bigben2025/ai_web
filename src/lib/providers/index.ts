import { AIProvider, ChatMessage, ProviderEvent } from './types';

function isKeySet(key: string | undefined): boolean {
  return !!key && key !== 'your_key_here' && key.trim() !== '';
}

function buildProviderList(): AIProvider[] {
  const override = process.env.AI_PROVIDER?.toLowerCase();
  const providers: AIProvider[] = [];

  if (override) {
    // Forced provider first, others as fallback
    const ordered = [override, 'anthropic', 'openai', 'gemini'].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    for (const name of ordered) {
      if (name === 'anthropic' && isKeySet(process.env.ANTHROPIC_API_KEY)) {
        const { AnthropicProvider } = require('./anthropic');
        providers.push(new AnthropicProvider());
      } else if (name === 'openai' && isKeySet(process.env.OPENAI_API_KEY)) {
        const { OpenAIProvider } = require('./openai');
        providers.push(new OpenAIProvider());
      } else if (name === 'gemini' && isKeySet(process.env.GEMINI_API_KEY)) {
        const { GeminiProvider } = require('./gemini');
        providers.push(new GeminiProvider());
      }
    }
  } else {
    // Auto-detect priority: Anthropic → OpenAI → Gemini
    if (isKeySet(process.env.ANTHROPIC_API_KEY)) {
      const { AnthropicProvider } = require('./anthropic');
      providers.push(new AnthropicProvider());
    }
    if (isKeySet(process.env.OPENAI_API_KEY)) {
      const { OpenAIProvider } = require('./openai');
      providers.push(new OpenAIProvider());
    }
    if (isKeySet(process.env.GEMINI_API_KEY)) {
      const { GeminiProvider } = require('./gemini');
      providers.push(new GeminiProvider());
    }
  }

  return providers;
}

/** Wraps multiple providers with automatic fallback on error. */
class FallbackProvider implements AIProvider {
  name: string;
  constructor(private providers: AIProvider[]) {
    this.name = providers.map((p) => p.name).join(' → ');
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<ProviderEvent> {
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const isLast = i === this.providers.length - 1;
      try {
        let yielded = false;
        for await (const event of provider.streamChat(messages)) {
          yielded = true;
          yield event;
        }
        if (yielded) return; // success
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[${provider.name}] failed: ${msg}${isLast ? '' : ' — trying next provider'}`);
        if (isLast) throw err;
      }
    }
  }
}

export function getProvider(): AIProvider {
  const providers = buildProviderList();

  if (providers.length === 0) {
    throw new Error(
      'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env.local'
    );
  }

  return new FallbackProvider(providers);
}

export type { AIProvider, ChatMessage, ProviderEvent, LeadData } from './types';
