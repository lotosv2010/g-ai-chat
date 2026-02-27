import { type FC } from 'react';

interface ThinkingDisplayProps {
  thinking: string;
  isStreaming?: boolean;
}

/**
 * 思考过程展示组件（类似 DeepSeek）
 */
export const ThinkingDisplay: FC<ThinkingDisplayProps> = ({ thinking, isStreaming = false }) => {
  return (
    <div className={`thinking-content ${isStreaming ? 'streaming' : ''}`}>
      <details open>
        <summary>
          <span className="thinking-label">思考过程</span>
        </summary>
        <div className="thinking-text">{thinking}</div>
      </details>
    </div>
  );
};
