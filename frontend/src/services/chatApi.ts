const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Session ID for the current chat
let currentSessionId = `session_${generateId()}_${Date.now()}`;

export const chatApi = {
  sendMessage: async (message: string): Promise<string> => {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        session_id: currentSessionId 
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? 'Chat request failed');
    }

    const data = await res.json();
    return data.response;
  },

  resetSession: async (): Promise<void> => {
    try {
      await fetch(`${BACKEND_URL}/chat/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId }),
      });
    } catch {
      // Ignore reset errors
    }
    // Generate new session ID
    currentSessionId = `session_${generateId()}_${Date.now()}`;
  },

  generateSessionId: (): string => {
    return `session_${generateId()}_${Date.now()}`;
  },

  createUserMessage: (content: string): ChatMessage => ({
    id: generateId(),
    role: 'user',
    content,
    timestamp: new Date(),
  }),

  createAssistantMessage: (content: string): ChatMessage => ({
    id: generateId(),
    role: 'assistant',
    content,
    timestamp: new Date(),
  }),
};
