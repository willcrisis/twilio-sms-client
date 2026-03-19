import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'http'

function twilioIncomingPlugin(): PluginOption {
  const sseClients = new Set<ServerResponse>()

  return {
    name: 'twilio-incoming',
    configureServer(server) {
      // SSE endpoint — browser subscribes here
      server.middlewares.use('/incoming-stream', (_req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        sseClients.add(res)
        res.on('close', () => sseClients.delete(res))
      })

      // Twilio webhook endpoint
      server.middlewares.use('/incoming', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let rawBody = ''
        req.on('data', (chunk: Buffer) => (rawBody += chunk.toString()))
        req.on('end', () => {
          const params = new URLSearchParams(rawBody)
          const message = {
            from: params.get('From') ?? '',
            to: params.get('To') ?? '',
            body: params.get('Body') ?? '',
            sid: params.get('MessageSid') ?? '',
            timestamp: new Date().toISOString(),
          }

          // Push to all SSE clients
          const data = JSON.stringify(message)
          for (const client of sseClients) {
            client.write(`data: ${data}\n\n`)
          }

          // Respond with empty TwiML so Twilio doesn't retry
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end('<Response></Response>')
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), twilioIncomingPlugin()],
  server: {
    proxy: {
      '/twilio-api': {
        target: 'https://api.twilio.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/twilio-api/, ''),
      },
    },
  },
})
