import { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { UserInfoCard } from './components/UserInfoCard';
import { OLLAMA_CONFIG, type OllamaConfig } from './types';
import { updateOllamaConfig } from './lib/langchain';
import './App.css';

function App() {
  // 状态管理
  const [enableStream, setEnableStream] = useState(true);
  const [useAgent, setUseAgent] = useState(false);
  const [useSmartTool, setUseSmartTool] = useState(true); // 默认启用智能工具调用
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<OllamaConfig>(() => {
    const savedConfig = localStorage.getItem('ollamaConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig) as OllamaConfig;
      } catch {
        // 解析失败，使用默认配置
        return OLLAMA_CONFIG;
      }
    }
    return OLLAMA_CONFIG;
  });

  // currentConfig 变化时同步到 langchain
  useEffect(() => {
    updateOllamaConfig(currentConfig);
  }, [currentConfig]);

  // 使用聊天 hook
  const { messages, isLoading, error, streamingResponse, streamingThinking, extractedUser, toolCallResult, sendMessage, clearMessages } = useChat();

  // 发送消息处理
  const handleSendMessage = async (message: string) => {
    await sendMessage(message, {
      systemPrompt: systemPrompt || undefined,
      stream: enableStream && !useSmartTool, // 智能工具调用时不使用流式
      useAgent,
      useSmartTool,
    });
  };

  // 保存配置
  const handleSaveConfig = (config: OllamaConfig) => {
    setCurrentConfig(config);
    updateOllamaConfig(config);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Chat - LangChain + Ollama</h1>
        <div className="header-controls">
          <button onClick={() => setIsSettingsOpen(true)}>设置</button>
          <button onClick={clearMessages}>清空聊天</button>
        </div>
      </header>

      <Sidebar
        enableStream={enableStream}
        enableThinking={currentConfig.showThinking}
        useAgent={useAgent}
        useSmartTool={useSmartTool}
        systemPrompt={systemPrompt}
        messageCount={messages.length}
        toolCallResult={toolCallResult}
        isCollapsed={isSidebarCollapsed}
        ollamaConfig={currentConfig}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onEnableStreamChange={setEnableStream}
        onEnableThinkingChange={() => {}}
        onUseAgentChange={setUseAgent}
        onUseSmartToolChange={setUseSmartTool}
        onSystemPromptChange={setSystemPrompt}
      />

      <main className="chat-main">
        {/* 用户信息卡片（Agent 模式下显示） */}
        {extractedUser && <UserInfoCard user={extractedUser} />}

        {/* 聊天容器 */}
        <ChatContainer
          messages={messages}
          streamingResponse={streamingResponse}
          streamingThinking={streamingThinking}
        />

        {/* 输入框 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
        />
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
      />
    </div>
  );
}

export default App;
