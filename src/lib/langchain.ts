import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { OLLAMA_CONFIG, type OllamaConfig } from '../types';
import { UserSchema, type User } from '../schemas/zod';
import { extractUserInfo } from '../tools/extractUserInfo';
import { getWeatherByCity, type WeatherData } from '../tools/getWeather';

// 流式响应块类型
export interface StreamChunk {
  type: 'thinking' | 'content';
  content: string;
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
 * 智能工具调用 - 检测用户意图并调用相应工具
 * @param content 用户输入内容
 * @returns 工具调用结果，如果没有匹配的工具则返回 null
 */
export async function detectAndCallTool(content: string): Promise<ToolCallResult | null> {
  const ollama = new ChatOllama({
    baseUrl: OLLAMA_CONFIG.baseUrl,
    model: OLLAMA_CONFIG.model,
    temperature: 0.1, // 降低温度以获得更稳定的意图识别
  });

  const systemPrompt = `你是一个智能工具路由助手。根据用户的输入，判断是否需要调用工具。

如果用户询问天气（包含：天气、气温、温度、下雨、晴天、多云等关键词），请返回：WEATHER
如果用户提供个人信息（包含：我叫、今年岁、邮箱、手机、住在、地址、职业等关键词），请返回：EXTRACT_USER
其他情况，请返回：NONE

只返回工具类型，不要解释原因。`;

  try {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(content),
    ];

    const response = await ollama.invoke(messages);
    const responseText = String(response.content).trim().toUpperCase();

    console.log('🔍 [Tool Detection] 检测结果:', responseText);

    // 根据检测结果调用相应工具
    if (responseText.includes('WEATHER')) {
      console.log('🌤️ [Tool Call] 调用天气查询工具');
      // 提取城市名称
      const cityPrompt = `从用户输入中提取城市名称，只返回城市名称：${content}`;
      const cityMessages = [new SystemMessage('只返回城市名称，不要其他文字'), new HumanMessage(cityPrompt)];
      const cityResponse = await ollama.invoke(cityMessages);
      const cityName = String(cityResponse.content).trim();

      const weatherData = await getWeatherByCity({ location: cityName });

      if (weatherData) {
        return {
          toolName: 'getWeather',
          success: true,
          result: weatherData,
        };
      } else {
        return {
          toolName: 'getWeather',
          success: false,
          error: '查询天气失败，请检查城市名称是否正确',
        };
      }
    } else if (responseText.includes('EXTRACT_USER')) {
      console.log('👤 [Tool Call] 调用用户信息提取工具');
      const userInfo = await extractUserInfo({ content });

      if (userInfo) {
        return {
          toolName: 'extractUserInfo',
          success: true,
          result: userInfo,
        };
      } else {
        return {
          toolName: 'extractUserInfo',
          success: false,
          error: '提取用户信息失败，请提供更详细的信息',
        };
      }
    }

    return null; // 没有匹配的工具
  } catch (error) {
    console.error('❌ [Tool Detection] 错误:', error);
    return null;
  }
}

/**
 * 智能聊天 - 自动检测并调用工具
 * @param content 用户输入内容
 * @param systemPrompt 系统提示词
 * @returns AI回复，可能包含工具调用结果
 */
export const smartChat = async (
  content: string,
  systemPrompt?: string
): Promise<{ thinking?: string; content: string; toolCall?: ToolCallResult }> => {
  // 先检测是否需要调用工具
  const toolResult = await detectAndCallTool(content);

  if (toolResult) {
    // 如果调用了工具，返回工具结果
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

        // 如果有行政区划信息，添加到标题中
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

      return {
        thinking: undefined,
        content: formattedContent,
        toolCall: toolResult,
      };
    } else {
      // 工具调用失败
      return {
        thinking: undefined,
        content: toolResult.error || '工具调用失败',
        toolCall: toolResult,
      };
    }
  }

  // 没有匹配的工具，使用普通聊天
  const result = await sendMessage(content, systemPrompt);
  return {
    thinking: result.thinking,
    content: result.content,
  };
};

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
