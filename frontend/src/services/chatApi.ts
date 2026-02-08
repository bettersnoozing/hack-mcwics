import { GoogleGenAI } from '@google/genai';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Function to execute tool calls against the backend
async function executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  let url = `${BACKEND_URL}`;

  switch (name) {
    case 'get_clubs': {
      const params = new URLSearchParams();
      if (args.tag) params.set('tag', String(args.tag));
      if (args.recruiting) params.set('recruiting', String(args.recruiting));
      if (args.min_members) params.set('min_members', String(args.min_members));
      url += `/clubs?${params.toString()}`;
      break;
    }
    case 'get_club_by_slug':
      url += `/clubs/${args.slug}`;
      break;
    case 'get_positions': {
      const params = new URLSearchParams();
      if (args.club_id) params.set('club_id', String(args.club_id));
      if (args.is_open) params.set('is_open', String(args.is_open));
      url += `/positions?${params.toString()}`;
      break;
    }
    case 'get_recruitment':
      url += '/recruitment';
      break;
    case 'search':
      url += `/search?q=${encodeURIComponent(String(args.q))}`;
      break;
    case 'get_stats':
      url += '/stats';
      break;
    case 'recommend_clubs':
      url += `/recommend?interests=${encodeURIComponent(String(args.interests))}`;
      break;
    default:
      return { error: `Unknown function: ${name}` };
  }

  console.log('Fetching:', url);
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `Backend returned ${res.status}` };
  }
  return res.json();
}

const systemInstruction = `You are a helpful assistant for McGill University's club recruitment platform.
You help students find clubs and positions that match their interests.

You have access to tools to query the database:
- get_clubs: List clubs with optional filters (tag, recruiting status, min members)
- get_club_by_slug: Get details about a specific club
- get_positions: List open positions with optional filters
- get_recruitment: Get all recruitment info (clubs with their positions)
- search: Search across clubs and positions by keyword
- get_stats: Get platform statistics and analytics
- recommend_clubs: Get personalized recommendations based on interests

When users ask about clubs, positions, deadlines, or want recommendations, use the appropriate tools.
Be friendly and helpful. Format responses in a clear, readable way.
If a user asks about applying, guide them but note you cannot submit applications for them.
Always provide relevant details like deadlines, requirements, and member counts when available.`;

// Tool declarations for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_clubs',
        description: 'Get list of clubs with optional filters',
        parameters: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag (e.g., AI, Hackathons)' },
            recruiting: { type: 'string', description: 'Filter by recruiting status (true or false)' },
            min_members: { type: 'number', description: 'Filter by minimum member count' },
          },
        },
      },
      {
        name: 'get_club_by_slug',
        description: 'Get details about a specific club',
        parameters: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'The club slug identifier' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'get_positions',
        description: 'Get list of open positions with optional filters',
        parameters: {
          type: 'object',
          properties: {
            club_id: { type: 'string', description: 'Filter by club ID' },
            is_open: { type: 'string', description: 'Filter by open status (true or false)' },
          },
        },
      },
      {
        name: 'get_recruitment',
        description: 'Get all recruitment info showing clubs with their open positions',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'search',
        description: 'Search across clubs and positions by keyword',
        parameters: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_stats',
        description: 'Get platform statistics and analytics',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'recommend_clubs',
        description: 'Get personalized club and position recommendations based on interests',
        parameters: {
          type: 'object',
          properties: {
            interests: { type: 'string', description: 'Comma-separated list of interest tags (e.g., AI,Robotics,ML)' },
          },
          required: ['interests'],
        },
      },
    ],
  },
];

// Store conversation history
interface ConversationPart {
  role: 'user' | 'model' | 'function';
  parts: { text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }[];
}

let conversationHistory: ConversationPart[] = [];

async function sendMessageToGemini(message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Add user message to history
  conversationHistory.push({
    role: 'user',
    parts: [{ text: message }],
  });

  try {
    // Build contents array with history
    const contents = conversationHistory.map(entry => ({
      role: entry.role === 'model' ? 'model' : entry.role === 'function' ? 'function' : 'user',
      parts: entry.parts,
    }));

    let response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    console.log('Gemini response:', response);

    // Check if there are function calls
    let functionCalls = response.candidates?.[0]?.content?.parts?.filter(
      (part: { functionCall?: unknown }) => part.functionCall
    );

    // Handle function calls in a loop
    while (functionCalls && functionCalls.length > 0) {
      const functionResponses: { name: string; response: unknown }[] = [];

      for (const part of functionCalls) {
        const fc = part.functionCall as { name: string; args: Record<string, unknown> };
        console.log('Calling function:', fc.name, 'with args:', fc.args);
        const result = await executeToolCall(fc.name, fc.args || {});
        console.log('Function result:', result);
        functionResponses.push({
          name: fc.name,
          response: result,
        });
      }

      // Add model's function call to history
      conversationHistory.push({
        role: 'model',
        parts: functionCalls.map((part: { functionCall: { name: string; args: Record<string, unknown> } }) => ({
          functionCall: part.functionCall,
        })),
      });

      // Add function responses to history
      conversationHistory.push({
        role: 'function',
        parts: functionResponses.map(fr => ({
          functionResponse: fr,
        })),
      });

      // Rebuild contents and send again
      const newContents = conversationHistory.map(entry => ({
        role: entry.role === 'model' ? 'model' : entry.role === 'function' ? 'function' : 'user',
        parts: entry.parts,
      }));

      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: newContents,
        config: {
          systemInstruction,
          tools,
        },
      });

      console.log('Response after function call:', response);

      functionCalls = response.candidates?.[0]?.content?.parts?.filter(
        (part: { functionCall?: unknown }) => part.functionCall
      );
    }

    // Extract text response
    const textPart = response.candidates?.[0]?.content?.parts?.find(
      (part: { text?: string }) => part.text
    );
    const text = textPart?.text || response.text || '';

    // Add model response to history
    if (text) {
      conversationHistory.push({
        role: 'model',
        parts: [{ text }],
      });
    }

    console.log('Final text:', text);
    return text || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

export const chatApi = {
  sendMessage: async (message: string): Promise<string> => {
    return sendMessageToGemini(message);
  },

  resetSession: (): void => {
    conversationHistory = [];
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
