import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Bot, User, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { chatApi, type ChatMessage } from '../services/chatApi';

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className = '' }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message on mount
    setMessages([
      chatApi.createAssistantMessage(
        "Hi! 👋 I'm your McGill Club Assistant. I can help you find clubs, explore open positions, and get personalized recommendations. What are you interested in?"
      ),
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = chatApi.createUserMessage(trimmedInput);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(trimmedInput);
      console.log('Chatbot received response:', response);
      const assistantMessage = chatApi.createAssistantMessage(response);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = chatApi.createAssistantMessage(
        "Sorry, I'm having trouble connecting right now. Please try again in a moment."
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = async () => {
    await chatApi.resetSession();
    setMessages([
      chatApi.createAssistantMessage(
        "Chat reset! 🔄 How can I help you find clubs and positions today?"
      ),
    ]);
  };

  const suggestedQueries = [
    "What AI clubs are recruiting?",
    "Show me software developer positions",
    "What clubs have upcoming deadlines?",
    "Recommend clubs for someone interested in robotics",
  ];

  const handleSuggestionClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="flex-shrink-0 border-b border-warmGray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-calm-400">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-warmGray-800">Club Assistant</h2>
              <p className="text-xs text-warmGray-500">Powered by Gemini AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-warmGray-500 hover:text-warmGray-700"
            title="Reset conversation"
          >
            <RefreshCw size={16} />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100">
                <Sparkles size={14} className="text-brand-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-brand-500 to-calm-500 text-white'
                  : 'bg-warmGray-50 text-warmGray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`mt-1 text-xs ${
                  message.role === 'user' ? 'text-white/70' : 'text-warmGray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cozy-100 to-brand-100">
                <User size={14} className="text-cozy-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100">
              <Sparkles size={14} className="text-brand-600 animate-pulse" />
            </div>
            <div className="bg-warmGray-50 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-warmGray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-warmGray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-warmGray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {messages.length === 1 && (
          <div className="mt-4">
            <p className="text-xs text-warmGray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => handleSuggestionClick(query)}
                  className="text-xs bg-warmGray-50 hover:bg-warmGray-100 text-warmGray-600 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about clubs, positions, or recommendations..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-warmGray-200 bg-white px-4 py-2.5 text-sm text-warmGray-800 placeholder:text-warmGray-400 transition-colors focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30 disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="cozyGradient"
            disabled={isLoading || !input.trim()}
            icon={<Send size={16} />}
          >
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
