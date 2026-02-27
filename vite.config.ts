import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { ProxyOptions } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// 和风天气 API 配置验证
const QWEATHER_API_KEY = 'f258c77a724d49a9b52df882d638db00'
if (!QWEATHER_API_KEY) {
  console.warn('⚠️  [Vite Config] VITE_QWEATHER_API_KEY 环境变量未设置，天气查询功能将无法使用')
  console.warn('⚠️  [Vite Config] 请在 .env 文件中添加: VITE_QWEATHER_API_KEY=your_api_key')
}

// 和风天气代理配置
const qweatherProxy: ProxyOptions = {
  target: 'https://m97fbtc2ed.re.qweatherapi.com',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/qweather/, ''),
  configure: (proxy) => {
    // 监听代理请求，添加必要的请求头
    proxy.on('proxyReq', (proxyReq) => {
      try {
        // 添加 API Key 请求头（仅当配置了 API Key 时）
        if (QWEATHER_API_KEY) {
          proxyReq.setHeader('X-QW-Api-Key', QWEATHER_API_KEY)
        }
        // 添加接受编码头，支持 gzip 压缩
        proxyReq.setHeader('Accept-Encoding', 'gzip')
      } catch (error) {
        console.error('❌ [Vite Proxy] 请求头设置失败:', error)
      }
    })

    // 监听代理响应错误
    proxy.on('error', (err, _req, res) => {
      console.error('❌ [Vite Proxy] 代理请求失败:', err)
      // 检查是否为 ServerResponse 类型
      const serverRes = res as ServerResponse<IncomingMessage>
      if (!serverRes.headersSent) {
        serverRes.writeHead(500, { 'Content-Type': 'application/json' })
        serverRes.end(JSON.stringify({ error: '代理请求失败', message: err.message }))
      }
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/qweather': qweatherProxy,
    },
  },
})
