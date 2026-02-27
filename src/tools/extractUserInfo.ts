/**
 * 用户信息提取工具
 * 使用 LangChain Agent 模式从自然语言中提取结构化用户信息
 */
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { OLLAMA_CONFIG } from '../types';
import { UserSchema, type User } from '../schemas/zod';

/**
 * 用户信息提取工具配置
 */
export interface ExtractUserInfoOptions {
  content: string; // 用户输入的自然语言描述
}

/**
 * 提取用户信息
 * @param options 提取选项
 * @returns 提取的用户信息
 */
export async function extractUserInfo(options: ExtractUserInfoOptions): Promise<User | null> {
  const { content } = options;

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

注意：
1. 如果没有解析到值的字段，请不要返回该字段。
2. 直接返回 JSON，不要使用 markdown 代码块。`;

  try {
    const ollama = new ChatOllama({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      model: OLLAMA_CONFIG.model,
      temperature: 0.3, // 降低温度以获得更稳定的提取结果
    });

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(content),
    ];

    const response = await ollama.invoke(messages);
    const responseText = String(response.content);

    console.log('📄 [Extract User Info] Response:', responseText);

    // 解析 JSON 结果
    let jsonStr = responseText;

    // 尝试提取 JSON（处理可能的 markdown 代码块）
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)```/) || responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    }

    const userData = JSON.parse(jsonStr);
    console.log('📄 [Extract User Info] Parsed Data:', userData);

    // 使用 Zod 验证
    const validatedUser = UserSchema.parse(userData);
    console.log('✅ [Extract User Info] Validated User:', validatedUser);

    return validatedUser;
  } catch (error) {
    console.error('❌ [Extract User Info] Error:', error);
    return null;
  }
}
