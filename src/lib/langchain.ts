import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { OLLAMA_CONFIG, type OllamaConfig } from '../types';
import { UserSchema, type User } from '../schemas/zod';
import { extractUserInfo } from '../tools/extractUserInfo';
import { getWeatherByCity, type WeatherData } from '../tools/getWeather';

// 流式响应块类型
export interface StreamChunk {
  type: 'thinking' | 'content' | 'tool_call';
  content: string;
  toolCall?: ToolCallResult;
}

// 工具调用结果类型
export interface ToolCallResult {
  toolName: string;
  success: boolean;
  result?: User | WeatherData;
  error?: string;
}

// 当前使用的配置（支持动态更新）
let currentConfig: OllamaConfig = OLLAMA_CONFIG;
let ollamaInstance: ChatOllama | null = null;

/**
 * 更新配置并重建 Ollama 实例
 */
export const updateOllamaConfig = (config: OllamaConfig) => {
  currentConfig = config;
  ollamaInstance = null; // 清除旧实例
};

/**
 * 获取 Ollama 实例（单例模式）
 */
const getOllamaInstance = (): ChatOllama => {
  if (!ollamaInstance) {
    ollamaInstance = new ChatOllama({
      baseUrl: currentConfig.baseUrl,
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      think: currentConfig.showThinking,
    });
  }
  return ollamaInstance;
};

/**
 * 将 chunk.content 转换为字符串
 * LangChain 的 content 可能是 string 或数组
 */
const getContentAsString = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'text' in item) {
          return String((item as { text: string }).text);
        }
        return '';
      })
      .join('');
  }
  return String(content || '');
};

/**
 * 解析 Ollama 原生流式响应格式
 * 支持 message.thinking、additional_kwargs.reasoning_content 和 message.content 分离
 */
const parseStreamChunk = (chunk: { content: unknown; additional_kwargs?: unknown }): StreamChunk[] => {
  const results: StreamChunk[] = [];
  const chunkContent = getContentAsString(chunk.content);

  // 1. 首先检查 additional_kwargs 中的 reasoning_content（LangChain 格式）
  if (chunk.additional_kwargs && typeof chunk.additional_kwargs === 'object') {
    const kwargs = chunk.additional_kwargs as { reasoning_content?: string };
    if (kwargs.reasoning_content) {
      results.push({ type: 'thinking', content: kwargs.reasoning_content });
    }
  }

  // 2. 尝试解析 content 为 JSON（Ollama 原生格式）
  if (chunkContent) {
    try {
      const parsed = JSON.parse(chunkContent);

      if (parsed.message) {
        if (parsed.message.thinking) {
          results.push({ type: 'thinking', content: parsed.message.thinking });
        }
        if (parsed.message.content) {
          results.push({ type: 'content', content: parsed.message.content });
        }
      }
    } catch (e) {
      // 非 JSON 格式，作为普通 content 处理
      console.log('⚠️ [Stream Chunk] JSON 解析失败，作为普通内容处理:', e);
      if (chunkContent) {
        results.push({ type: 'content', content: chunkContent });
      }
    }
  }

  return results;
};

/**
 * 普通聊天 - 非流式
 * 使用 ollama.invoke
 */
export const sendMessage = async (
  content: string,
  systemPrompt?: string
): Promise<{ thinking?: string; content: string }> => {
  const ollama = getOllamaInstance();
  const messages = [];

  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  messages.push(new HumanMessage(content));

  const response = await ollama.invoke(messages);
  const responseText = getContentAsString(response.content);

  const finalContent = responseText;

  return { thinking: undefined, content: finalContent };
};

/**
 * 普通聊天 - 流式
 * 使用 ollama.stream，支持 Ollama 原生思考模式
 */
export const chatStream = async function* (
  content: string,
  systemPrompt?: string
): AsyncGenerator<StreamChunk> {
  const messages = [];
  messages.push(new SystemMessage(systemPrompt || '你是一个AI助手'));
  messages.push(new HumanMessage(content));

  try {
    const ollama = getOllamaInstance();

    for await (const chunk of await ollama.stream(messages)) {
      const chunks = parseStreamChunk(chunk);
      for (const c of chunks) {
        yield c;
      }
    }
  } catch (error) {
    console.error('❌ [Chat Stream] 错误:', error);
    throw new Error('流式响应失败');
  }
};

/**
 * 定义 LangChain 工具
 */

// 天气查询工具
const weatherTool = new DynamicStructuredTool({
  name: 'getWeather',
  description: '查询指定城市的实时天气信息，包括温度、湿度、风向等',
  schema: z.object({
    location: z.string().describe('城市名称，例如：北京、上海、广州等'),
  }),
  func: async ({ location }) => {
    console.log(`🌤️ [Tool Call] 调用天气查询工具: ${location}`);
    const weatherData = await getWeatherByCity({ location });

    if (weatherData) {
      return JSON.stringify(weatherData);
    } else {
      throw new Error('查询天气失败，请检查城市名称是否正确');
    }
  },
});

// 用户信息提取工具
const extractUserTool = new DynamicStructuredTool({
  name: 'extractUserInfo',
  description: '从用户的自然语言描述中提取结构化的用户信息，包括姓名、年龄、邮箱、手机、地址、职业、兴趣爱好等',
  schema: z.object({
    content: z.string().describe('用户的自然语言描述'),
  }),
  func: async ({ content }) => {
    console.log(`👤 [Tool Call] 调用用户信息提取工具`);
    const userInfo = await extractUserInfo({ content });

    if (userInfo) {
      return JSON.stringify(userInfo);
    } else {
      throw new Error('提取用户信息失败，请提供更详细的信息');
    }
  },
});

/**
 * 智能工具调用 - 流式版本，使用 bindTools 方式
 * 让模型自动决定是否调用工具，支持思考过程展示
 * @param content 用户输入内容
 * @returns 流式输出，包含思考内容、普通内容或工具调用结果
 */
export async function* smartChatStream(
  content: string,
  systemPrompt?: string
): AsyncGenerator<StreamChunk, { toolCall?: ToolCallResult }> {
  const ollama = new ChatOllama({
    baseUrl: currentConfig.baseUrl,
    model: currentConfig.model,
    temperature: 0.1,
    think: currentConfig.showThinking,
  });

  // 使用 bindTools 绑定工具
  const ollamaWithTools = ollama.bindTools([weatherTool, extractUserTool]);

  const defaultSystemPrompt = `你是一个智能助手，可以根据用户的需求调用相应的工具来获取信息。

可用的工具：
1. getWeather: 查询城市天气
2. extractUserInfo: 提取用户信息

当用户询问天气或提供个人信息时，请主动调用对应的工具。
其他情况下，直接回答用户的问题。`;

  try {
    const messages = [
      new SystemMessage(systemPrompt || defaultSystemPrompt),
      new HumanMessage(content),
    ];

    // 流式输出思考过程和内容
    for await (const chunk of await ollamaWithTools.stream(messages)) {
      const chunks = parseStreamChunk(chunk);
      for (const c of chunks) {
        yield c;
      }
    }

    // 获取完整的响应以检测工具调用
    const fullResponse = await ollamaWithTools.invoke(messages);

    // 检查是否有工具调用
    if (fullResponse.tool_calls && fullResponse.tool_calls.length > 0) {
      console.log('🔍 [Tool Detection] 检测到工具调用:', fullResponse.tool_calls);

      // 处理工具调用
      for (const toolCall of fullResponse.tool_calls) {
        const toolName = toolCall.name;
        const toolArgs = toolCall.args as Record<string, unknown>;

        let toolResult: ToolCallResult | null = null;

        if (toolName === 'getWeather') {
          yield { type: 'content', content: '\n\n🔍 正在查询天气...\n' };
          const location = toolArgs.location as string;
          const weatherData = await getWeatherByCity({ location });
          if (weatherData) {
            toolResult = {
              toolName: 'getWeather',
              success: true,
              result: weatherData,
            };
          } else {
            toolResult = {
              toolName: 'getWeather',
              success: false,
              error: '查询天气失败，请检查城市名称是否正确',
            };
          }
        } else if (toolName === 'extractUserInfo') {
          yield { type: 'content', content: '\n\n🔍 正在提取用户信息...\n' };
          const content = toolArgs.content as string;
          const userInfo = await extractUserInfo({ content });
          if (userInfo) {
            toolResult = {
              toolName: 'extractUserInfo',
              success: true,
              result: userInfo,
            };
          } else {
            toolResult = {
              toolName: 'extractUserInfo',
              success: false,
              error: '提取用户信息失败，请提供更详细的信息',
            };
          }
        }

        if (toolResult) {
          // 发送工具调用结果
          yield { type: 'tool_call', content: '', toolCall: toolResult };

          // 格式化工具结果并输出
          if (toolResult.success && toolResult.result) {
            let formattedContent = '';

            if (toolResult.toolName === 'getWeather') {
              const weather = toolResult.result as WeatherData;
              formattedContent = `🌤️ ${weather.location.name}天气情况：
温度：${weather.now.temp}°C（体感 ${weather.now.feelsLike}°C）
天气：${weather.now.text}
湿度：${weather.now.humidity}%
风向：${weather.now.windDir}
风力：${weather.now.windScale}
气压：${weather.now.pressure}hPa
能见度：${weather.now.vis}km
降水量：${weather.now.precip}mm
观测时间：${weather.now.obsTime}`;

              if (weather.location.adm2 || weather.location.adm1) {
                const region = [weather.location.adm2, weather.location.adm1].filter(Boolean).join('，');
                formattedContent = `🌤️ ${weather.location.name}（${region}）天气情况：\n` + formattedContent.substring(formattedContent.indexOf('\n') + 1);
              }
            } else if (toolResult.toolName === 'extractUserInfo') {
              const user = toolResult.result as User;
              formattedContent = `👤 用户信息：
姓名：${user.name}
年龄：${user.age}岁
邮箱：${user.email}
手机号：${user.phone}
地址：${user.address.city} ${user.address.district} ${user.address.street}${user.occupation ? `\n职业：${user.occupation}` : ''}
兴趣爱好：${user.hobbies.join('、')}`;
            }

            yield { type: 'content', content: formattedContent };
          } else {
            yield { type: 'content', content: toolResult.error || '工具调用失败' };
          }

          return { toolCall: toolResult };
        }
      }
    }

    // 没有工具调用
    console.log('🔍 [Tool Detection] 未检测到工具调用');
    return {};
  } catch (error) {
    console.error('❌ [Tool Detection] 错误:', error);
    yield { type: 'content', content: '工具调用发生错误' };
    return {};
  }
}

/**
 * Agent 模式 - 流式提取用户信息
 * 从用户自然语言中提取结构化用户信息
 */
export const executeAgentStream = async function* (
  content: string
): AsyncGenerator<StreamChunk, { result?: User; content: string }> {
  const showThinking = currentConfig.showThinking;
  const systemPrompt = `从用户描述中提取以下信息并返回JSON格式：
- 姓名 (name)
- 年龄 (age)
- 邮箱 (email)
- 手机号 (phone)
- 地址 (address): 包含城市(city)、区县(district)、街道(street)
- 职业 (occupation)
- 兴趣爱好 (hobbies) - 数组格式

返回格式示例：

{
  "name": "张三",
  "age": 25,
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "address": {
    "city": "北京",
    "district": "朝阳区",
    "street": "建国路88号"
  },
  "occupation": "软件工程师",
  "hobbies": ["编程", "阅读", "旅行"]
}

注意：如果没有解析到值的字段，请不要返回该字段。
${showThinking ? '\n\n请先思考如何提取这些信息。' : ''}`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(content),
  ];

  let fullText = '';
  try {
    const ollama = getOllamaInstance();

    for await (const chunk of await ollama.stream(messages)) {
      const chunks = parseStreamChunk(chunk);
      for (const c of chunks) {
        yield c;
        fullText += c.content;
      }
    }

    // 解析 JSON 结果
    const finalContent = fullText
    console.log('📄 [Agent Stream] finalContent:', finalContent);
    const jsonMatch = finalContent.match(/```json\n?([\s\S]*?)```/) || finalContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : finalContent;

    const userData = JSON.parse(jsonStr);

    console.log('📄 [Agent Stream] userData:', userData);

    // 使用 Zod 验证
    const validatedUser = UserSchema.parse(userData);

    return {
      result: validatedUser,
      content: '已成功提取用户信息',
    };
  } catch (error) {
    console.error('Agent 执行错误:', error);
    return {
      result: undefined,
      content: '提取用户信息失败',
    };
  }
};
