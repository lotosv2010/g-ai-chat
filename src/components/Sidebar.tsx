import React from 'react';
import type { OllamaConfig } from '../types';

interface SidebarProps {
  enableStream: boolean;
  enableThinking: boolean;
  useAgent: boolean;
  useSmartTool: boolean;
  systemPrompt: string;
  messageCount: number;
  toolCallResult?: { toolName: string; success: boolean } | null;
  isCollapsed: boolean;
  ollamaConfig: OllamaConfig;
  onToggleCollapse: () => void;
  onEnableStreamChange: (enabled: boolean) => void;
  onEnableThinkingChange: (enabled: boolean) => void;
  onUseAgentChange: (enabled: boolean) => void;
  onUseSmartToolChange: (enabled: boolean) => void;
  onSystemPromptChange: (prompt: string) => void;
}

/**
 * 侧边栏组件：提供快捷配置选项
 */
export const Sidebar: React.FC<SidebarProps> = ({
  enableStream,
  enableThinking,
  useAgent,
  useSmartTool,
  systemPrompt,
  messageCount,
  toolCallResult,
  isCollapsed,
  ollamaConfig,
  onToggleCollapse,
  onEnableStreamChange,
  onEnableThinkingChange,
  onUseAgentChange,
  onUseSmartToolChange,
  onSystemPromptChange,
}) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>

      <div className="sidebar-content">
        <ToggleSection
          title="流式输出"
          checked={enableStream}
          onChange={onEnableStreamChange}
          label="启用流式输出"
        />

        <ToggleSection
          title="思考过程"
          checked={enableThinking}
          onChange={onEnableThinkingChange}
          label="显示思考过程"
          hint="模型会先输出思考内容（如果模型支持）"
        />

        <ToggleSection
          title="Agent 模式"
          checked={useAgent}
          onChange={onUseAgentChange}
          label="使用 Agent 提取用户信息"
          hint="启用后将从用户输入中提取结构化的用户信息"
        />

        <ToggleSection
          title="智能工具调用"
          checked={useSmartTool}
          onChange={onUseSmartToolChange}
          label="自动识别并调用工具"
          hint="自动检测天气查询、用户信息提取等场景"
        />

        <TextareaSection
          title="系统提示词"
          value={systemPrompt}
          onChange={onSystemPromptChange}
          placeholder="输入系统提示词（可选）..."
          maxLength={1000}
          rows={5}
        />

        <ConfigInfo config={ollamaConfig} />

        <StatsSection
          messageCount={messageCount}
          enableStream={enableStream}
          enableThinking={enableThinking}
          useAgent={useAgent}
          useSmartTool={useSmartTool}
          toolCallResult={toolCallResult}
        />
      </div>
    </aside>
  );
};

// 子组件：开关控制
const ToggleSection: React.FC<{
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}> = ({ title, checked, onChange, label, hint }) => (
  <div className="sidebar-section">
    <h3>{title}</h3>
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
    {hint && <p className="hint">{hint}</p>}
  </div>
);

// 子组件：文本输入
const TextareaSection: React.FC<{
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  rows?: number;
}> = ({ title, value, onChange, placeholder, maxLength, rows = 5 }) => (
  <div className="sidebar-section">
    <h3>{title}</h3>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
    />
  </div>
);

// 子组件：当前配置信息展示
const ConfigInfo: React.FC<{ config: OllamaConfig }> = ({ config }) => (
  <div className="sidebar-section">
    <h3>当前模型配置</h3>
    <div className="config-info">
      <p><strong>模型:</strong> {config.model}</p>
      <p><strong>地址:</strong> {config.baseUrl}</p>
      <p><strong>温度:</strong> {config.temperature}</p>
      <p><strong>最大Token:</strong> {config.maxTokens}</p>
    </div>
  </div>
);

// 子组件：统计信息
const StatsSection: React.FC<{
  messageCount: number;
  enableStream: boolean;
  enableThinking: boolean;
  useAgent: boolean;
  useSmartTool: boolean;
  toolCallResult?: { toolName: string; success: boolean } | null;
}> = ({ messageCount, enableStream, enableThinking, useAgent, useSmartTool, toolCallResult }) => (
  <div className="sidebar-section">
    <h3>统计</h3>
    <div className="stats">
      <p>消息数: {messageCount}</p>
      <p>流式输出: {enableStream ? '已启用' : '已禁用'}</p>
      <p>思考过程: {enableThinking ? '已启用' : '已禁用'}</p>
      <p>Agent 模式: {useAgent ? '已启用' : '已禁用'}</p>
      <p>智能工具: {useSmartTool ? '已启用' : '已禁用'}</p>
      {toolCallResult && (
        <p className="tool-call-status">
          最近工具: {toolCallResult.toolName} ({toolCallResult.success ? '✅ 成功' : '❌ 失败'})
        </p>
      )}
    </div>
  </div>
);
