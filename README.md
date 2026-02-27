# AI Chat App

一个使用 React + TypeScript + Vite + Zod + LangChain + Ollama 构建的现代化 AI 聊天应用。

## ✨ 特性

- 🤖 **多种 AI 交互模式** - 支持普通聊天、流式输出、Agent 模式
- 🔄 **实时流式响应** - 更好的用户体验，类似 ChatGPT 的流畅输出
- 🧠 **思考过程展示** - DeepSeek 风格的可折叠思考过程展示
- ✅ **Zod 类型验证** - 完整的运行时类型安全保障
- ⚙️ **灵活配置** - 自定义系统提示词、温度、最大令牌数等参数
- 🎨 **现代化 UI** - 渐变色设计、流畅动画、毛玻璃效果、响应式布局
- 💾 **持久化配置** - 配置保存到浏览器本地存储

## 🛠 技术栈

| 技术     | 版本 | 说明                   |
|----------|------|------------------------|
| React    | 19.x | UI 框架               |
| TypeScript | 5.x | 类型安全              |
| Vite     | 7.x  | 构建工具               |
| Zod      | 3.x  | Schema 验证            |
| LangChain | 1.x | AI 框架               |
| @langchain/ollama | 1.x | Ollama 集成            |
| Ollama   | -    | 本地 LLM 服务          |

## 📁 项目结构

```text
src/
├── components/              # React 组件
│   ├── ChatContainer.tsx    # 聊天消息容器
│   ├── ChatInput.tsx        # 聊天输入框
│   ├── Sidebar.tsx          # 侧边栏（快捷配置）
│   ├── SettingsPanel.tsx    # 设置面板
│   ├── ThinkingDisplay.tsx  # 思考过程展示
│   └── UserInfoCard.tsx     # 用户信息卡片（Agent 模式）
├── hooks/                   # React Hooks
│   └── useChat.ts           # 聊天逻辑 Hook
├── lib/                     # 核心库
│   └── langchain.ts         # LangChain 集成
├── schemas/                 # Zod Schemas
│   └── zod.ts               # 数据验证 Schema
├── tools/                   # 工具函数
│   ├── extractUserInfo.ts   # 用户信息提取工具
│   ├── getWeather.ts        # 天气查询工具
│   └── index.ts             # 工具统一导出
├── types/                   # TypeScript 类型
│   └── index.ts             # 全局类型定义
├── App.tsx                  # 主应用组件
├── App.css                  # 应用样式
├── main.tsx                 # 应用入口
└── index.css                # 全局样式
```

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.x
- **pnpm** 或 npm
- **Ollama** 已安装并运行

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 Ollama

下载并安装 Ollama：[https://ollama.ai](https://ollama.ai)

```bash
# 拉取模型（示例：qwen3）
ollama pull qwen3-coder:480b-cloud

# 启动 Ollama 服务
ollama serve
```

### 3. 配置环境变量

创建 `.env` 文件（可选，有默认值）：

```bash
# Ollama 配置
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen3-coder:480b-cloud
VITE_OLLAMA_TEMPERATURE=0.7
VITE_OLLAMA_MAX_TOKENS=1000
VITE_SHOW_THINKING=true

# 和风天气配置
VITE_QWEATHER_API_KEY=your_api_key_here
VITE_QWEATHER_API_HOST=https://devapi.qweatherapi.com
```

### 4. 运行开发服务器

```bash
pnpm dev
```

访问 <http://localhost:5173>

### 5. 构建生产版本

```bash
pnpm build
```

### 6. 预览构建

```bash
pnpm preview
```

## 💡 使用说明

### 普通聊天模式

1. 直接输入消息发送
2. 系统会返回 AI 的回复
3. 可设置自定义系统提示词

### 流式输出模式

1. 在侧边栏开启「流式输出」
2. 发送消息后，AI 回复会实时逐字显示
3. 体验类似 ChatGPT 的流畅输出

### Agent 模式

1. 在侧边栏开启「Agent 模式」
2. 输入包含用户信息的自然语言文本
3. 系统会自动提取并展示结构化的用户信息卡片

**示例输入：**

```text
我叫张三，今年25岁，邮箱是zhangsan@example.com，手机号13800138000，住在北京朝阳区建国路88号，是软件工程师，喜欢编程、阅读和旅行。
```

### 智能工具调用

1. 在侧边栏开启「智能工具调用」（默认已启用）
2. 输入问题，系统会自动识别是否需要调用工具
3. 支持的工具：
   - **天气查询**：输入"北京天气"、"上海现在多少度"等
   - **用户信息提取**：输入包含个人信息的描述

**示例输入：**

```text
北京的天气怎么样？
```

```text
我叫李四，今年30岁，是前端工程师
```

## 📚 API 文档

### sendMessage

普通聊天 - 非流式

```typescript
import { sendMessage } from './lib/langchain';

const result = await sendMessage("你好", "你是一个AI助手");

console.log(result.content);   // AI 回复内容
console.log(result.thinking);  // 思考过程（如果有）
```

### chatStream

普通聊天 - 流式

```typescript
import { chatStream } from './lib/langchain';

for await (const chunk of chatStream("你好", "你是一个AI助手")) {
  if (chunk.type === 'thinking') {
    console.log('思考:', chunk.content);
  } else {
    console.log('内容:', chunk.content);
  }
}
```

### executeAgentStream

Agent 模式 - 流式提取用户信息

```typescript
import { executeAgentStream } from './lib/langchain';

const stream = executeAgentStream("我叫张三，今年25岁");

for await (const chunk of stream) {
  if (chunk.type === 'thinking') {
    console.log('思考:', chunk.content);
  }
}

// 获取最终结果
const final = await stream.next();
console.log('提取的用户信息:', final.value?.result);
```

### smartChat

智能聊天 - 自动检测并调用工具

```typescript
import { smartChat } from './lib/langchain';

const result = await smartChat("北京的天气怎么样？");

console.log('AI 回复:', result.content);
if (result.toolCall) {
  console.log('调用的工具:', result.toolCall.toolName);
  console.log('工具是否成功:', result.toolCall.success);
}
```

## 🛠 工具函数

项目提供了两个实用的工具函数，可以方便地集成到你的应用中。

### 用户信息提取工具 (`extractUserInfo`)

从用户的自然语言描述中提取结构化的用户信息。

```typescript
import { extractUserInfo } from './tools';

const userText = '我叫张三，今年25岁，邮箱是zhangsan@example.com，手机号13800138000，住在北京朝阳区建国路88号，是软件工程师，喜欢编程、阅读和旅行。';

const userInfo = await extractUserInfo({ content: userText });

if (userInfo) {
  console.log('姓名:', userInfo.name);
  console.log('年龄:', userInfo.age);
  console.log('邮箱:', userInfo.email);
  console.log('手机号:', userInfo.phone);
  console.log('地址:', userInfo.address);
  console.log('职业:', userInfo.occupation);
  console.log('兴趣爱好:', userInfo.hobbies);
}
```

**返回数据结构：**

```typescript
{
  name: string;        // 姓名
  age: number;         // 年龄
  email: string;       // 邮箱
  phone: string;       // 手机号
  address: {
    city: string;      // 城市
    district: string;  // 区县
    street: string;    // 街道
  };
  occupation?: string; // 职业（可选）
  hobbies: string[];   // 兴趣爱好数组
}
```

### 天气查询工具 (`getWeatherByCity`)

调用和风天气 API 查询指定城市的实时天气。

```typescript
import { getWeatherByCity } from './tools';

// 方法1: 使用城市名称
const weather = await getWeatherByCity({ location: '北京' });

// 方法2: 使用城市ID（注意：当前版本仅支持城市名称查询）
// const weather = await getWeatherByCity({ location: '101010100' });

if (weather) {
  console.log('城市:', weather.location.name);
  console.log('温度:', weather.now.temp, '°C');
  console.log('天气:', weather.now.text);
  console.log('体感温度:', weather.now.feelsLike, '°C');
  console.log('湿度:', weather.now.humidity, '%');
  console.log('风向:', weather.now.windDir);
  console.log('风力:', weather.now.windScale);
}
```

**返回数据结构：**

```typescript
{
  location: {
    name: string;    // 城市名称
    id: string;      // 城市ID
    lat: number;     // 纬度
    lon: number;     // 经度
    adm1: string;    // 一级行政区域（省份）
    adm2: string;    // 二级行政区域（城市/区县）
    country: string; // 国家
  };
  now: {
    temp: number;        // 实时气温（摄氏度）
    feelsLike: number;   // 体感温度（摄氏度）
    text: string;        // 天气现象文字（如：晴、多云、小雨等）
    windDir: string;     // 风向（如：东北风、西风等）
    windScale: string;   // 风力等级（如：3级、5-6级等）
    windSpeed: number;   // 风速（公里/小时）
    humidity: number;     // 相对湿度（%）
    precip: number;       // 当前小时累计降水量（毫米）
    pressure: number;     // 大气压强（百帕）
    vis: number;          // 能见度（公里）
    obsTime: string;      // 数据观测时间
    fxLink: string;       // 天气预报网页链接
  };
}
```

**常见城市 ID 参考：**

| 城市 | 城市ID |
|------|--------|
| 北京 | 101010100 |
| 上海 | 101020100 |
| 广州 | 101280101 |
| 深圳 | 101280601 |
| 杭州 | 101210101 |
| 南京 | 101190101 |
| 武汉 | 101200101 |
| 成都 | 101270101 |

**配置说明：**

天气查询工具通过 Vite 开发服务器代理访问和风天气 API，无需额外配置。

API Key 已在 `vite.config.ts` 中配置，开发服务器会自动添加必要的请求头。

**注意：** 此功能仅适用于开发环境。生产环境部署时，需要实现后端 API 服务来代理和风天气 API 请求。

**统一导入：**

可以通过 `src/tools/index.ts` 统一导入所有工具：

```typescript
import { extractUserInfo, getWeatherByCity } from './tools';
```

## 🤔 常见问题

### LangGraph 和 LangChain 的区别是什么？

| 特性     | LangChain                | LangGraph               |
|----------|-------------------------|------------------------|
| 定位     | 基础 AI 框架           | 工作流编排框架          |
| 核心概念 | Chain（链）              | Graph（图）             |
| 适用场景 | 简单到中等复杂度的 AI 应用 | 复杂的多步骤、条件分支、循环等场景 |
| 灵活度   | 较高，线性流程           | 极高，支持复杂的流程控制  |
| 学习曲线 | 较低                    | 较高                   |
| 示例     | 单轮问答、文档问答       | 多轮对话、工具调用、状态机 |

**何时选择 LangChain：**

- 简单的问答场景
- 单链式处理（Prompt -> LLM -> Response）
- 快速原型开发
- 不需要复杂的流程控制

**何时选择 LangGraph：**

- 需要多步骤、条件分支的处理流程
- 需要循环、回溯等复杂逻辑
- 需要 Agent 工具调用
- 需要管理和维护复杂状态

**注意事项：**

- LangGraph 是建立在 LangChain 之上的，不是完全替代关系
- 可以在同一项目中同时使用 LangChain 和 LangGraph
- LangChain 的 Chain 可以嵌入到 LangGraph 的 Node 中使用
- LangGraph 的状态管理更复杂，需要定义 StateSchema

### 本项目使用的流式方式和 SSE (Server-Sent Events) 有什么区别？

本项目使用的不是 SSE，而是 **LangChain 的流式 API**，两者有本质区别。

#### 技术架构对比

| 特性 | 本项目 (LangChain 流式) | SSE (Server-Sent Events) |
|------|------------------------|-------------------------|
| **技术实现** | LangChain `ollama.stream()` 返回 AsyncGenerator，使用 `for await...of` 迭代 | HTTP 长连接 + EventSource API，服务器推送 `text/event-stream` 格式数据 |
| **通信方向** | 客户端主动请求 + 服务端流式响应 | 服务端主动推送（单向） |
| **连接方式** | 客户端直接调用 Ollama API，通过 LangChain 封装 | 客户端建立持久 HTTP 连接到服务器 |
| **数据格式** | LangChain 标准化流式块，解析思考过程和内容 | SSE 标准格式 (`data: ...\n\n`) |
| **代码示例** | `for await (const chunk of await ollama.stream(messages)) { ... }` | `const eventSource = new EventSource('/api/stream'); eventSource.onmessage = ...` |
| **后端需求** | 不需要后端服务器（客户端直连 Ollama） | 需要后端服务器实现 SSE 端点 |
| **跨域支持** | 客户端直接请求，受 CORS 限制 | 原生支持跨域 |
| **重连机制** | 需要手动实现 | 自动重连（内置机制） |
| **适用场景** | 本地开发、简单应用、无需中转 | 生产环境、需要鉴权、需要统一管理 |

#### 代码实现对比

**本项目使用的 LangChain 流式方式：**

```typescript
// src/lib/langchain.ts
export const chatStream = async function* (
  content: string,
  systemPrompt?: string
): AsyncGenerator<StreamChunk> {
  const messages = [
    new SystemMessage(systemPrompt || '你是一个AI助手'),
    new HumanMessage(content),
  ];

  const ollama = getOllamaInstance();

  // 使用 LangChain 的 stream API
  for await (const chunk of await ollama.stream(messages)) {
    const chunks = parseStreamChunk(chunk);
    for (const c of chunks) {
      yield c;
    }
  }
};

// src/hooks/useChat.ts
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
```

**SSE 实现方式（如果使用 SSE）：**

```typescript
// 前端：使用 EventSource API
const eventSource = new EventSource('http://localhost:3000/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'thinking') {
    setStreamingThinking(prev => prev + data.content);
  } else if (data.type === 'content') {
    setStreamingResponse(prev => prev + data.content);
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};

// 后端：Node.js + Express 实现 SSE
app.get('/api/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await ollama.stream(messages);

  try {
    for await (const chunk of stream) {
      // 转换为 SSE 格式
      const data = JSON.stringify({
        type: chunk.type,
        content: chunk.content,
      });
      res.write(`data: ${data}\n\n`);
    }
    res.write('event: done\ndata: {}\n\n');
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});
```

#### SSE 数据格式示例

SSE 协议要求特定的格式：

```
data: {"type":"thinking","content":"我需要分析这个问题..."}\n\n
data: {"type":"content","content："根据你的问题，"}\n\n
data: {"type":"content","content："我可以给出以下建议："}\n\n
event: done\ndata: {}\n\n
```

每条消息必须以 `\n\n` 结尾，`data:` 前缀表示数据内容，`event:` 前缀表示事件类型。

#### 本项目选择 LangChain 流式的原因

1. **架构简单**：客户端直连 Ollama，无需后端服务器
2. **开发效率**：快速原型，无需实现 SSE 服务器
3. **本地优先**：适合本地开发和个人使用
4. **LangChain 封装**：自动处理模型差异、思考过程解析等复杂逻辑

#### 何时应该使用 SSE

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 本地开发、个人项目 | LangChain 流式 | 架构简单，无需后端 |
| 生产环境部署 | SSE | 统一管理、鉴权、监控 |
| 多用户访问 | SSE | 避免 CORS 问题，统一流量控制 |
| 需要鉴权/限流 | SSE | 后端可以统一控制 |
| 客户端复杂逻辑 | SSE | 后端处理复杂逻辑，前端只负责展示 |
| 嵌入第三方应用 | SSE | 更好的安全性控制 |

#### SSE 的优势

- **自动重连**：网络断开后自动重新连接
- **事件类型**：支持不同类型的事件（`event: done`, `event: error` 等）
- **服务器推送**：真正的服务端推送，无需客户端轮询
- **标准化**：W3C 标准，浏览器原生支持
- **轻量级**：比 WebSocket 更轻量，适合单向数据流

#### SSE 的局限性

- **单向通信**：只能从服务器到客户端，客户端无法发送数据
- **连接数限制**：浏览器对同一域名的 SSE 连接数有限制
- **需要后端**：必须实现后端服务器来处理 SSE 请求
- **CORS 处理**：跨域场景需要额外的 CORS 配置

### ollama.stream 和 Ollama's native streaming API 有什么区别？

| 特性     | ollama.stream (LangChain) | Ollama Native API     |
|----------|--------------------------|----------------------|
| 接口     | LangChain 封装           | Ollama 原生 HTTP API |
| 使用方式 | `ollama.stream(messages)`  | `fetch('/api/generate', { stream: true })` |
| 数据处理 | 自动解析、标准化          | 需要手动处理流式数据  |
| 思考过程 | 自动解析 `reasoning_content` | 需要手动解析 JSON    |
| 抽象层级 | 高级抽象                 | 底层 API             |
| 跨模型   | 统一接口，支持多种 LLM   | 仅支持 Ollama 模型    |

**LangChain stream 优势：**

- 统一的 API，无需关心底层 LLM 类型
- 自动处理思考过程（`reasoning_content`）
- 支持多种 LLM，易于切换
- 内置错误处理和重试

**Ollama Native API 优势：**

- 更轻量，无需额外依赖
- 完全控制请求参数
- 更直接，适合特殊需求

**注意事项：**

- LangChain 的 `think: true` 参数会被转换为 Ollama 的 `options: { think: true }`
- Ollama 原生 API 中，思考过程通过 `message.thinking` 或 `response.reasoning_content` 返回
- 不同 Ollama 模型对思考过程的支持程度不同
- 流式响应中，思考内容和正式内容可能交替出现

### Zod Schema 验证失败怎么办？

可能的原因和解决方案：

1. **字段类型不匹配**：检查输入数据的类型是否符合 Schema 定义
2. **必填字段缺失**：确保所有非可选字段都有值
3. **正则验证失败**：检查格式是否正确（如邮箱、手机号）
4. **数组字段为空**：确保数组类型字段至少包含一个元素

在 `langchain.ts` 中使用了 `UserSchema.parse()`，验证失败会抛出错误。你可以：

- 使用 `UserSchema.safeParse()` 获取验证结果而不抛出错误
- 使用 `UserSchema.partial()` 使所有字段变为可选
- 调整 Schema 使其更灵活

### Temperature 参数如何影响输出？

- **0.0 - 0.3**：输出更加确定和一致，适合代码生成、技术文档等需要准确性的场景
- **0.3 - 0.7**：平衡创造性和一致性，适合一般的对话和文本生成
- **0.7 - 1.0**：输出更加随机和多样化，适合创意写作、头脑风暴等场景
- **1.0 - 2.0**：高度随机，可能导致输出不稳定

### Max Tokens 如何设置？

- **对话聊天**：建议 1000-2000 tokens
- **代码生成**：建议 2000-4000 tokens
- **长文档处理**：建议 4000-8192 tokens（取决于模型上下文窗口）

注意：Max Tokens 过大可能导致：

- 响应时间变长
- 消耗更多资源
- 可能超出模型上下文窗口

### 如何启用模型的思考过程？

1. **在设置面板中开启**：「显示思考过程」开关
2. **或在 .env 文件中配置**：`VITE_SHOW_THINKING=true`
3. **或在代码中配置**：`{ think: true }`

注意：不是所有模型都支持思考过程。支持思考的模型包括：

- DeepSeek-R1 系列
- Qwen-Coder 系列（部分版本）
- 其他支持 `reasoning_content` 的模型

### 为什么流式输出时思考过程和内容分离？

这是 LangChain 的设计，为了更好地处理不同模型的思考过程：

1. **标准化**：统一处理不同模型的思考格式
2. **实时性**：思考过程和内容可以独立流式输出
3. **用户体验**：用户可以同时看到思考过程和最终结果
4. **兼容性**：兼容多种 LLM 的思考格式

### 如何切换不同的 Ollama 模型？

有三种方式：

1. **修改 .env 文件**：

   ```bash
   VITE_OLLAMA_MODEL=qwen3-coder:480b-cloud
   ```

2. **使用设置面板**：

   - 点击右上角「设置」
   - 修改「Model」字段
   - 点击「保存配置」

3. **代码中修改**：

   ```typescript
   updateOllamaConfig({
     ...OLLAMA_CONFIG,
     model: 'llama3'
   });
   ```

### Agent 模式提取信息失败怎么办？

可能的原因和解决方案：

1. **模型不支持**：使用支持结构化输出的模型（如 Qwen-Coder）
2. **输入格式不标准**：确保输入包含明确的信息字段
3. **JSON 解析失败**：查看控制台日志，检查原始输出
4. **Schema 不匹配**：调整 Zod Schema 使其更灵活

### 如何调试流式输出？

在浏览器控制台中，可以看到详细的日志：

```javascript
// 启用思考过程
🔍 [Send Message] 流式聊天模式

// 查看流式块
[Stream Chunk] JSON 解析失败，作为普通内容处理: ...

// Agent 模式
🔍 [Send Message] Agent 模式
📄 [Agent Stream] finalContent: ...
📄 [Agent Stream] userData: ...
```

### 配置不生效怎么办？

1. **检查 .env 文件**：确保文件在项目根目录，且变量名正确（需要以 `VITE_` 开头）
2. **重启开发服务器**：修改 .env 后需要 `pnpm dev` 重新启动
3. **清除浏览器缓存**：有时需要清除 localStorage 中的旧配置
4. **检查 Ollama 服务**：确保 `ollama serve` 正在运行

## 🔧 开发指南

### 添加新的 Zod Schema

在 `src/schemas/zod.ts` 中定义：

```typescript
import { z } from 'zod';

export const CustomSchema = z.object({
  field: z.string().describe('字段描述'),
}).describe('Schema 描述');

export type Custom = z.infer<typeof CustomSchema>;
```

### 添加新的 AI 模式

在 `src/lib/langchain.ts` 中添加新函数：

```typescript
export const customFunction = async function* (
  content: string
): AsyncGenerator<StreamChunk, { result?: Custom; content: string }> {
  // 实现
};
```

### 自定义样式

主要样式文件：

- `src/App.css` - 应用主体样式
- `src/index.css` - 全局样式

设计变量：

- 主色调：`#667eea` → `#764ba2`（渐变）
- 圆角：12-20px
- 阴影：0 4px 20px rgba(0, 0, 0, 0.15)

## 📝 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题，请提交 Issue 或联系作者。
