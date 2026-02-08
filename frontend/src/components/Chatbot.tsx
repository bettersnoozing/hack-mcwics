import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { chatApi, type ChatMessage } from '../services/chatApi';
import { useSession } from '../hooks/useSession';

interface ChatbotProps {
  className?: string;
}

function fixMarkdownTables(text: string): string {
  // If the text already has multi-line table rows, leave it untouched.
  const lines = text.split('\n');
  const pipeLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
  if (pipeLines.length >= 3) {
    // Already has at least header + separator + 1 data row on separate lines
    return text;
  }

  return text.replace(
    // Find a stretch of text that looks like a collapsed table
    /(\|[^|\n]*(?:\|[^|\n]*)+\|)/g,
    (match) => {
      // Count how many columns: find the first "| --- |" pattern to detect separator
      const sepMatch = match.match(/\|[\s-]+(?:\|[\s-]+)+\|/);
      if (!sepMatch) return match; // no separator row found — not a table

      const sepPipes = sepMatch[0].split('|').length;
      // Now split the entire match into rows of that many pipes
      const allPipes = match.split('|');
      // Each row has (sepPipes) segments between pipes, so (sepPipes - 1) cells
      const cellsPerRow = sepPipes - 1;
      if (cellsPerRow < 2) return match;

      const rows: string[] = [];
      // Skip the leading empty string from split
      let i = 0;
      if (allPipes[0].trim() === '') i = 1;

      while (i < allPipes.length) {
        const rowCells = allPipes.slice(i, i + cellsPerRow);
        if (rowCells.length === cellsPerRow) {
          rows.push('| ' + rowCells.join(' | ').trim() + ' |');
        } else if (rowCells.length > 0 && rowCells.some(c => c.trim())) {
          rows.push('| ' + rowCells.join(' | ').trim() + ' |');
        }
        i += cellsPerRow;
      }

      return rows.join('\n');
    }
  );
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  const processed = fixMarkdownTables(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-warmGray-800">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="text-sm list-disc list-inside space-y-1 mb-2 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="text-sm list-decimal list-inside space-y-1 mb-2 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h3 className="text-base font-bold text-warmGray-800 mb-1">{children}</h3>,
        h2: ({ children }) => <h3 className="text-sm font-bold text-warmGray-800 mb-1">{children}</h3>,
        h3: ({ children }) => <h4 className="text-sm font-semibold text-warmGray-800 mb-1">{children}</h4>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-warmGray-100 rounded-lg px-3 py-2 my-2 overflow-x-auto text-xs">
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className="bg-warmGray-100 text-brand-600 rounded px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-500 underline hover:text-brand-600">
            {children}
          </a>
        ),
        hr: () => <hr className="my-2 border-warmGray-200" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-brand-300 pl-3 my-2 text-warmGray-500 italic text-sm">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs w-full border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-warmGray-100">{children}</thead>,
        th: ({ children }) => <th className="text-left px-2 py-1 font-semibold text-warmGray-700 border-b border-warmGray-200">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1 border-b border-warmGray-100">{children}</td>,
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

export function Chatbot({ className = '' }: ChatbotProps) {
  const session = useSession();
  
  const user = session.email ? { email: session.email, name: session.name } : null;
  const isAdmin = session.role === 'admin';
  
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
    const welcomeMessage = isAdmin
      ? "Hi! 👋 I'm Ex, your Club Assistant. As an admin, you can ask me about applications to your club, view applicant details, and get recruitment insights. How can I help?"
      : "Hi! 👋 I'm Ex, your Club Assistant. I can help you find clubs, explore open positions, and get personalized recommendations. What are you interested in?";
    setMessages([
      chatApi.createAssistantMessage(welcomeMessage),
    ]);
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = chatApi.createUserMessage(trimmedInput);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(trimmedInput, user?.email);
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

  const suggestedQueries = isAdmin
    ? [
        "Show me applications to my club",
        "Accept the application from [name]",
        "Move [applicant] to interview stage",
        "Summarize our pending applications",
      ]
    : [
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
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 border-b border-warmGray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-calm-400">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-warmGray-800">Club Assistant</h2>
              <p className="text-xs text-warmGray-500">Powered by Snowflake</p>
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
              <MessageContent content={message.content} isUser={message.role === 'user'} />
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