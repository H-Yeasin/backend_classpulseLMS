import app from './app'
import './config/env'
import { connectDB } from './config/db'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { setupMessageSocket } from './sockets/message.socket'
import { setupWebRTCSocket } from './sockets/webrtc.socket'
import { socketAuthMiddleware } from './sockets/socketAuth'

const PORT = process.env.PORT || 5000

const httpserver = createServer(app)

export const io = new Server(httpserver, {
  cors: {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  },
})

io.use(socketAuthMiddleware as any)

setupMessageSocket(io)
setupWebRTCSocket(io)

connectDB().then(() => {
  httpserver.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`)
  })
})
