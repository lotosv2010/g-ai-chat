# CORS 问题修复说明

## 问题

和风天气 API 不允许浏览器直接调用自定义请求头（`X-QW-Api-Key`），导致 CORS 错误。

## 解决方案

使用 Vite 开发服务器的代理功能来绕过 CORS 限制。

### 配置

已修改 `vite.config.ts`，添加了和风天气 API 的代理配置：

```typescript
proxy: {
  '/qweather': {
    target: 'https://m97fbtc2ed.re.qweatherapi.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/qweather/, ''),
    configure: (proxy, options) => {
      proxy.on('proxyReq', (proxyReq, req, res) => {
        // 自动添加 API Key 请求头
        proxyReq.setHeader('X-QW-Api-Key', 'f258c77a724d49a9b52df882d638db00');
      });
    }
  }
}
```

### 工作原理

1. 前端请求：`/qweather/v7/weather/now?location=101010100`
2. Vite 代理转发到：`https://m97fbtc2ed.re.qweatherapi.com/v7/weather/now?location=101010100`
3. 代理自动添加 `X-QW-Api-Key` 请求头
4. 返回结果给前端

### 重启开发服务器

修改配置后，需要重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
pnpm dev
```

## 生产环境注意事项

**重要：** 此代理配置仅适用于开发环境！

生产环境部署时，有以下几种方案：

### 方案 1: 使用后端服务代理

创建 Node.js/Python/Go 等后端服务，代理和风天气 API 请求：

```javascript
// Node.js Express 示例
app.get('/api/weather', async (req, res) => {
  const { location } = req.query;
  const response = await fetch(
    `https://m97fbtc2ed.re.qweatherapi.com/v7/weather/now?location=${location}`,
    {
      headers: {
        'X-QW-Api-Key': process.env.QWEATHER_API_KEY
      }
    }
  );
  const data = await response.json();
  res.json(data);
});
```

### 方案 2: 使用反向代理

使用 Nginx、Caddy 等反向代理服务器：

```nginx
# Nginx 配置示例
location /api/qweather/ {
    proxy_pass https://m97fbtc2ed.re.qweatherapi.com/;
    proxy_set_header X-QW-Api-Key your_api_key_here;
}
```

### 方案 3: 使用 Serverless 函数

使用 Vercel、Netlify 等平台的 Serverless 函数：

```javascript
// Vercel API Route
export default async function handler(req, res) {
  const { location } = req.query;
  const response = await fetch(
    `https://m97fbtc2ed.re.qweatherapi.com/v7/weather/now?location=${location}`,
    {
      headers: {
        'X-QW-Api-Key': process.env.QWEATHER_API_KEY
      }
    }
  );
  const data = await response.json();
  res.json(data);
}
```

## 测试

重启服务器后，在聊天界面输入：

```
北京的天气怎么样？
```

应该能看到正确的天气查询结果。
