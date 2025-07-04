import { atom } from 'nanostores';

export interface ChatResponse {
  content?: string;
  output?: string;
  [key: string]: any;
}

export interface AgentMemory {
  id: string;
  prompt: string;
  response: string;
  timestamp: number;
  context?: string;
  provider?: string;
}

export interface AgentState {
  provider: string | null;
  memory: AgentMemory[];
  currentFile: string | null;
  lastCommand: string | null;
  context: string;
  isProcessing: boolean;
  capabilities: string[];
}

// Initial Agent State
const initialState: AgentState = {
  provider: null,
  memory: [],
  currentFile: null,
  lastCommand: null,
  context: '',
  isProcessing: false,
  capabilities: [
    'code-analysis',
    'file-operations',
    'project-management',
    'deployment',
    'debugging',
    'optimization'
  ]
};

export const agentStore = atom<AgentState>(initialState);

// Agent Actions
export class AgentManager {
  
  // Set AI Provider
  static onProviderSelect(providerName: string) {
    const currentState = agentStore.get();
    agentStore.set({
      ...currentState,
      provider: providerName,
      memory: [], // Reset memory when switching providers
      context: `Provider switched to: ${providerName}`
    });
  }

  // Get Current Context
  static getCurrentContext(): string {
    const state = agentStore.get();
    const recentMemory = state.memory.slice(-5); // Last 5 interactions
    const contextParts = [
      `Current Provider: ${state.provider || 'None'}`,
      `Current File: ${state.currentFile || 'None'}`,
      `Last Command: ${state.lastCommand || 'None'}`,
      `Recent Interactions: ${recentMemory.length}`,
      ...recentMemory.map(m => `- ${m.prompt.substring(0, 100)}...`)
    ];
    return contextParts.join('\n');
  }

  // Ask Agent with Context
  static async askAgent(prompt: string): Promise<string> {
    const state = agentStore.get();
    
    // Set processing state
    agentStore.set({ ...state, isProcessing: true });

    try {
      const context = this.getCurrentContext();
      const fullPrompt = `CONTEXT:\n${context}\n\nUSER:\n${prompt}`;
      
      const response = await this.callAI(state.provider!, fullPrompt);
      
      // Store in memory
      const memoryEntry: AgentMemory = {
        id: Date.now().toString(),
        prompt,
        response,
        timestamp: Date.now(),
        context,
        provider: state.provider!
      };

      const updatedState = agentStore.get();
      agentStore.set({
        ...updatedState,
        memory: [...updatedState.memory, memoryEntry],
        lastCommand: prompt,
        isProcessing: false
      });

      return response;
    } catch (error) {
      agentStore.set({ ...agentStore.get(), isProcessing: false });
      throw error;
    }
  }

  // AI Provider Router
  static async callAI(provider: string, prompt: string): Promise<string> {
    switch (provider) {
      case 'GPT-4':
        return await this.callOpenAI(prompt);
      case 'Claude-3':
        return await this.callAnthropic(prompt);
      case 'Gemini-Pro':
        return await this.callGoogle(prompt);
      case 'Gemini-CLI':
        return await this.callGeminiViaProxy(prompt);
      case 'Command-R':
        return await this.callCohere(prompt);
      case 'Deepseek':
        return await this.callDeepseek(prompt);
      case 'Mistral':
        return await this.callMistral(prompt);
      case 'Yi-34B':
        return await this.callYi(prompt);
      case 'Local-Model':
        return await this.callLocalLLM(prompt);
      case 'OpenRouter':
        return await this.callOpenRouter(prompt);
      default:
        return await this.callGenericProvider(provider, prompt);
    }
  }

  // Provider-specific implementations
  static async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4',
        provider: 'OpenAI'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from OpenAI';
  }

  static async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-sonnet',
        provider: 'Anthropic'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Anthropic';
  }

  static async callGoogle(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'gemini-pro',
        provider: 'Google'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Google';
  }

  static async callGeminiViaProxy(prompt: string): Promise<string> {
    const response = await fetch('/api/gemini-cli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json() as ChatResponse;
    return data.output || 'Error from Gemini CLI';
  }

  static async callCohere(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'command-r',
        provider: 'Cohere'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Cohere';
  }

  static async callDeepseek(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'deepseek-chat',
        provider: 'Deepseek'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Deepseek';
  }

  static async callMistral(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'mistral-large',
        provider: 'Mistral'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Mistral';
  }

  static async callYi(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'yi-34b-chat',
        provider: 'Yi'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Yi';
  }

  static async callLocalLLM(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'local',
        provider: 'Local'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from Local LLM';
  }

  static async callOpenRouter(prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openrouter/auto',
        provider: 'OpenRouter'
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || 'Error from OpenRouter';
  }

  static async callGenericProvider(provider: string, prompt: string): Promise<string> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        provider
      })
    });
    const data = await response.json() as ChatResponse;
    return data.content || `Error from ${provider}`;
  }

  // Memory Management
  static clearMemory() {
    const state = agentStore.get();
    agentStore.set({ ...state, memory: [] });
  }

  static getMemoryById(id: string): AgentMemory | undefined {
    const state = agentStore.get();
    return state.memory.find(m => m.id === id);
  }

  static exportMemory(): AgentMemory[] {
    return agentStore.get().memory;
  }

  static importMemory(memory: AgentMemory[]) {
    const state = agentStore.get();
    agentStore.set({ ...state, memory });
  }

  // Context Management
  static setCurrentFile(fileName: string) {
    const state = agentStore.get();
    agentStore.set({ ...state, currentFile: fileName });
  }

  static updateContext(context: string) {
    const state = agentStore.get();
    agentStore.set({ ...state, context });
  }

  // Advanced Features
  static async analyzeCode(code: string, language: string): Promise<string> {
    const prompt = `Analyze this ${language} code and provide insights:\n\n${code}`;
    return await this.askAgent(prompt);
  }

  static async suggestImprovements(code: string): Promise<string> {
    const prompt = `Suggest improvements for this code:\n\n${code}`;
    return await this.askAgent(prompt);
  }

  static async debugCode(code: string, error: string): Promise<string> {
    const prompt = `Debug this code. Error: ${error}\n\nCode:\n${code}`;
    return await this.askAgent(prompt);
  }

  static async explainCode(code: string): Promise<string> {
    const prompt = `Explain this code in simple terms:\n\n${code}`;
    return await this.askAgent(prompt);
  }
}