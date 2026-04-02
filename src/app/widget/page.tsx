'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Phone } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const QUICK_STARTS = [
  'Tell me about your services',
  'What areas do you serve?',
  'I need care for my parent',
  'How do I get started?',
];

function generateSessionId(): string {
  if (typeof window === 'undefined') return `session-${Date.now()}`;
  const stored = sessionStorage.getItem('ccf_session_id');
  if (stored) return stored;
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem('ccf_session_id', id);
  return id;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <img
        src="https://conciergecarefl.com/wp-content/uploads/logo-small.webp"
        alt=""
        className="w-8 h-8 rounded-full object-contain bg-white border border-gray-100 p-0.5 flex-shrink-0"
      />
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#78b833' }} />
          <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#78b833' }} />
          <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#78b833' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2.5 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <img
          src="https://conciergecarefl.com/wp-content/uploads/logo-small.webp"
          alt=""
          className="w-8 h-8 rounded-full object-contain bg-white border border-gray-100 p-0.5 flex-shrink-0"
        />
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? 'text-white rounded-br-none'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
        }`}
        style={isUser ? { backgroundColor: '#78b833' } : {}}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.isStreaming && (
          <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse rounded-sm align-middle" style={{ backgroundColor: '#78b833' }} />
        )}
      </div>
    </div>
  );
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState<string>(() => generateSessionId());
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showQuickStarts, setShowQuickStarts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your Care Assistant from Concierge Care Florida.\n\nI'm here to help you explore care options for your loved one — whether that's companion care, Alzheimer's support, 24-hour care, or something in between.\n\nWhat brings you here today?",
        },
      ]);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setShowQuickStarts(false);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue('');
      setIsLoading(true);
      setIsTyping(true);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      const assistantMessageId = `assistant-${Date.now()}`;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok || !response.body) throw new Error('Failed to connect to AI');

        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
        ]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: m.content + data.text } : m
                    )
                  );
                } else if (data.type === 'lead_captured') {
                  setLeadCaptured(true);
                } else if (data.type === 'done') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, isStreaming: false } : m
                    )
                  );
                } else if (data.type === 'error') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content:
                              "I'm sorry, I'm having trouble connecting right now. Please call us directly at 888-205-9940 — we're available 24/7!",
                            isStreaming: false,
                          }
                        : m
                    )
                  );
                }
              } catch {
                // ignore incomplete JSON
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setIsTyping(false);
        setMessages((prev) => {
          const hasAssistant = prev.find((m) => m.id === assistantMessageId);
          const errorMsg =
            "I'm sorry, I'm having trouble connecting right now. Please call us directly at 888-205-9940 — we're available 24/7!";
          if (hasAssistant) {
            return prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: errorMsg, isStreaming: false } : m
            );
          }
          return [...prev, { id: assistantMessageId, role: 'assistant', content: errorMsg }];
        });
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [messages, isLoading, sessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <img
          src="https://conciergecarefl.com/wp-content/uploads/logo-300x113.webp"
          alt="Concierge Care Florida"
          className="h-10 w-auto object-contain"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#78b833' }} />
          <span className="text-xs text-gray-500">Available 24/7</span>
        </div>
        <a
          href="tel:888-205-9940"
          className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-full transition-colors"
          style={{ backgroundColor: '#78b833' }}
          title="Call 888-205-9940"
        >
          <Phone className="w-3.5 h-3.5" />
          888-205-9940
        </a>
      </div>

      {/* Lead captured banner */}
      {leadCaptured && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#78b833' }} />
          <p className="text-green-800 text-xs">
            Your information has been saved. A care coordinator will reach out soon!
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-0">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}

        {/* Quick starts */}
        {showQuickStarts && messages.length <= 1 && !isLoading && (
          <div className="mt-3 mb-2">
            <p className="text-xs text-gray-400 mb-2 text-center">Quick questions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_STARTS.map((qs) => (
                <button
                  key={qs}
                  onClick={() => sendMessage(qs)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-gray-400 hover:text-gray-800 transition-all shadow-sm"
                >
                  {qs}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all max-h-32 min-h-[40px]"
            style={{ ['--tw-ring-color' as any]: '#78b833' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
            style={{ backgroundColor: '#78b833' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Concierge Care Florida · AHCA Licensed Nurse Registry
        </p>
      </div>
    </div>
  );
}
