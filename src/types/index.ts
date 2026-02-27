// Ollama 配置类型
export type OllamaConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  showThinking: boolean;
};


// 从环境变量读取配置
export const OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
  model: import.meta.env.VITE_OLLAMA_MODEL || 'qwen3:0.6b',
  temperature: Number(import.meta.env.VITE_OLLAMA_TEMPERATURE) || 0.7,
  maxTokens: Number(import.meta.env.VITE_OLLAMA_MAX_TOKENS) || 1000,
  showThinking: import.meta.env.VITE_SHOW_THINKING === 'true',
};


// 聊天消息类型
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  thinking?: string; // 思考过程（仅 assistant 消息有）
  isStreaming?: boolean; // 是否正在流式输出
  toolCall?: boolean; // 是否使用了工具调用
};

// 工具调用结果类型
export type ToolCallResult = {
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
};
