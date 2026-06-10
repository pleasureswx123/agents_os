export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatRequest {
  modelId: string;
  apiKeyRef: string;
  messages: LlmChatMessage[];
  input: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LlmChatResponse {
  content: string;
  raw: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmProvider {
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
}
