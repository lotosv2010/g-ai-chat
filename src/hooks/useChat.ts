import { useState, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendMessage, chatStream, executeAgentStream, smartChat, type ToolCallResult } from '../lib/langchain';
import type { User } from '../schemas/zod';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');
  const [extractedUser, setExtractedUser] = useState<User | null>(null);
  const [toolCallResult, setToolCallResult] = useState<ToolCallResult | null>(null);

  // 添加消息到聊天记录
  const addMessage = useCallback((role: ChatMessage['role'], content: string, thinking?: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
      thinking: role === 'assistant' ? thinking : undefined,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // 发送消息到 AI
  const sendMessageToAI = useCallback(async (
    userMessage: string,
    options?: {
    systemPrompt?: string;    // 系统提示词
    stream?: boolean;         // 是否流式输出
    useAgent?: boolean;       // 是否使用 Agent 模式
    useSmartTool?: boolean;   // 是否使用智能工具调用
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setStreamingResponse('');
    setStreamingThinking('');
    setExtractedUser(null);
    setToolCallResult(null);

    addMessage('user', userMessage);

    try {
      let response = '';
      let thinking = '';

      if (options?.useSmartTool) {
        // 智能工具调用模式
        console.log('🤖 [Send Message] 智能工具调用模式');
        const result = await smartChat(userMessage, options.systemPrompt);
        thinking = result.thinking || '';
        response = result.content;

        if (result.toolCall) {
          setToolCallResult(result.toolCall);
          // 如果是用户信息提取，也设置到 extractedUser
          if (result.toolCall.success && result.toolCall.toolName === 'extractUserInfo') {
            setExtractedUser(result.toolCall.result as User);
          }
        }
      } else if (options?.useAgent) {
        // Agent 模式：提取用户信息
        console.log('🔍 [Send Message] Agent 模式');
        const agentStream = executeAgentStream(userMessage);
        for await (const chunk of agentStream) {
          if (chunk.type === 'thinking') {
            thinking += chunk.content;
            setStreamingThinking(thinking);
          } else {
            response += chunk.content;
            setStreamingResponse(response);
          }
        }
        // 获取最终提取的用户信息
        const final = await agentStream.next();
        if (final.done && final.value?.result) {
          setExtractedUser(final.value.result);
        }
      } else if (options?.stream) {
        // 流式聊天模式
        console.log('🔍 [Send Message] 流式聊天模式');
        const stream = chatStream(userMessage, options.systemPrompt);
        for await (const chunk of stream) {
          if (chunk.type === 'thinking') {
            thinking += chunk.content;
            setStreamingThinking(thinking);
          } else {
            response += chunk.content;
            setStreamingResponse(response);
          }
        }
      } else {
        // 非流式模式
        console.log('🔍 [Send Message] 非流式模式');
        const result = await sendMessage(userMessage, options?.systemPrompt);
        thinking = result.thinking || '';
        response = result.content;
      }

      // 完成后保存 assistant 消息，包含思考过程
      addMessage('assistant', response, thinking);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setStreamingResponse('');
      setStreamingThinking('');
    }
  }, [addMessage]);

  // 清空聊天记录
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    streamingResponse,
    streamingThinking,
    extractedUser,
    toolCallResult,
    sendMessage: sendMessageToAI,
    clearMessages,
  };
};
