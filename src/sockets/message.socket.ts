import { Server, Socket } from 'socket.io'
import { canAccessRoom } from '../utils/chatAccess'

export const setupMessageSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const authUser = (socket as any).user;
    console.log('User connected', socket.id, authUser?._id);

    socket.on('joinRoom', async (roomId: string, callback?: (res: any) => void) => {
      try {
        await canAccessRoom(authUser._id.toString(), roomId)
        socket.join(roomId)
        if (typeof callback === 'function') callback({ success: true })
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message })
      }
    })

    socket.on('joinNotification', (userId: string, callback?: (res: any) => void) => {
      if (authUser?._id?.toString() === userId) {
        socket.join(userId)
        if (typeof callback === 'function') callback({ success: true })
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized notification channel access' })
      }
    })

    socket.on('leaveRoom', (roomId: string, callback?: (res: any) => void) => {
      socket.leave(roomId)
      if (typeof callback === 'function') callback({ success: true })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected :', socket.id)
    })
  })
}
