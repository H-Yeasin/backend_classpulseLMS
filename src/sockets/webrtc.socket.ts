import { Server, Socket } from 'socket.io'
import { canAccessRoom } from '../utils/chatAccess'

interface AuthenticatedUser {
  _id: { toString(): string }
  type?: string
  username?: string
  avatar?: { url?: string } | string
}

interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser
}

interface Rooms {
  [roomId: string]: string[]
}

interface UserSockets {
  [userId: string]: string[]
}

interface CallInvitePayload {
  roomId: string
  calleeId: string
  callType?: 'audio' | 'video'
  callLogId?: string
}

interface CallResponsePayload {
  roomId: string
  callerId: string
  callLogId?: string
  reason?: string
}

interface CallEndPayload {
  roomId: string
  targetUserId?: string
  callLogId?: string
}

const rooms: Rooms = {}
const userSockets: UserSockets = {}

const normalizeAvatar = (avatar?: { url?: string } | string) => {
  if (!avatar) return ''
  if (typeof avatar === 'string') return avatar
  return avatar.url || ''
}

const addUserSocket = (userId: string, socketId: string) => {
  if (!userSockets[userId]) {
    userSockets[userId] = []
  }

  if (!userSockets[userId].includes(socketId)) {
    userSockets[userId].push(socketId)
  }
}

const removeUserSocket = (userId: string, socketId: string) => {
  if (!userSockets[userId]) return

  userSockets[userId] = userSockets[userId].filter((id) => id !== socketId)
  if (!userSockets[userId].length) {
    delete userSockets[userId]
  }
}

const emitToUser = (
  io: Server,
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => {
  const socketIds = userSockets[userId] || []
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, payload)
  })
}

const removeSocketFromRoom = (
  socket: Socket,
  roomId: string | null,
  socketId: string,
) => {
  if (!roomId) return

  socket.leave(roomId)

  if (!rooms[roomId]) return

  rooms[roomId] = rooms[roomId].filter((id) => id !== socketId)
  socket.to(roomId).emit('user-left', socketId)

  if (!rooms[roomId].length) {
    delete rooms[roomId]
  }
}

export const setupWebRTCSocket = (io: Server) => {
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket
    const authUser = socket.user
    const authUserId = authUser?._id?.toString()

    if (!authUserId) {
      socket.disconnect()
      return
    }

    addUserSocket(authUserId, socket.id)
    console.log('WebRTC Connected:', socket.id, authUserId)

    let currentRoom: string | null = null

    socket.on(
      'join',
      async (
        roomId: string,
        callback?: (res: Record<string, unknown>) => void,
      ) => {
        try {
          await canAccessRoom(authUserId, roomId)
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unable to join call room'
          if (typeof callback === 'function') {
            callback({ success: false, error: errorMessage })
          }
          return
        }

        removeSocketFromRoom(socket, currentRoom, socket.id)
        currentRoom = null
        currentRoom = roomId
        socket.join(roomId)

        if (!rooms[roomId]) {
          rooms[roomId] = []
        }

        if (!rooms[roomId].includes(socket.id)) {
          rooms[roomId].push(socket.id)
        }

        if (typeof callback === 'function') {
          callback({ success: true })
        }

        const otherUsers = rooms[roomId].filter((id) => id !== socket.id)
        socket.emit('all-users', otherUsers)
        socket.to(roomId).emit('user-joined', socket.id)
      },
    )

    socket.on('leave-call', () => {
      removeSocketFromRoom(socket, currentRoom, socket.id)
      currentRoom = null
    })

    socket.on(
      'call-user',
      async (
        payload: CallInvitePayload,
        callback?: (res: Record<string, unknown>) => void,
      ) => {
        try {
          if (payload.callType && payload.callType !== 'audio') {
            throw new Error('Audio calls only are supported')
          }

          const room = await canAccessRoom(authUserId, payload.roomId)
          const isDirectRoom =
            room.type === 'direct' && room.participants.length === 2

          if (!isDirectRoom) {
            throw new Error('Only direct rooms support calling right now')
          }

          const isCalleeParticipant = room.participants.some(
            (participant) => participant.userId.toString() === payload.calleeId,
          )

          if (!isCalleeParticipant || payload.calleeId === authUserId) {
            throw new Error('Invalid call recipient')
          }

          emitToUser(io, payload.calleeId, 'incoming-call', {
            roomId: payload.roomId,
            callType: 'audio',
            callLogId: payload.callLogId || null,
            caller: {
              id: authUserId,
              name: authUser?.username || 'Unknown caller',
              avatar: normalizeAvatar(authUser?.avatar),
              type: authUser?.type || '',
            },
          })

          if (typeof callback === 'function') {
            callback({ success: true })
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unable to place call'
          if (typeof callback === 'function') {
            callback({ success: false, error: errorMessage })
          }
        }
      },
    )

    socket.on(
      'accept-call',
      async (
        payload: CallResponsePayload,
        callback?: (res: Record<string, unknown>) => void,
      ) => {
        try {
          await canAccessRoom(authUserId, payload.roomId)
          emitToUser(io, payload.callerId, 'call-accepted', {
            roomId: payload.roomId,
            callLogId: payload.callLogId || null,
            answeredBy: {
              id: authUserId,
              name: authUser?.username || 'Unknown user',
              avatar: normalizeAvatar(authUser?.avatar),
            },
          })

          if (typeof callback === 'function') {
            callback({ success: true })
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unable to accept call'
          if (typeof callback === 'function') {
            callback({ success: false, error: errorMessage })
          }
        }
      },
    )

    socket.on(
      'decline-call',
      async (
        payload: CallResponsePayload,
        callback?: (res: Record<string, unknown>) => void,
      ) => {
        try {
          await canAccessRoom(authUserId, payload.roomId)
          emitToUser(io, payload.callerId, 'call-declined', {
            roomId: payload.roomId,
            callLogId: payload.callLogId || null,
            declinedBy: {
              id: authUserId,
              name: authUser?.username || 'Unknown user',
            },
            reason: payload.reason || 'declined',
          })

          if (typeof callback === 'function') {
            callback({ success: true })
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unable to decline call'
          if (typeof callback === 'function') {
            callback({ success: false, error: errorMessage })
          }
        }
      },
    )

    socket.on(
      'end-call',
      async (
        payload: CallEndPayload,
        callback?: (res: Record<string, unknown>) => void,
      ) => {
        try {
          await canAccessRoom(authUserId, payload.roomId)

          const endPayload = {
            roomId: payload.roomId,
            callLogId: payload.callLogId || null,
            endedBy: {
              id: authUserId,
              name: authUser?.username || 'Unknown user',
            },
          }

          if (payload.targetUserId) {
            emitToUser(io, payload.targetUserId, 'call-ended', endPayload)
          }

          socket.to(payload.roomId).emit('call-ended', endPayload)

          if (typeof callback === 'function') {
            callback({ success: true })
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unable to end call'
          if (typeof callback === 'function') {
            callback({ success: false, error: errorMessage })
          }
        }
      },
    )

    socket.on(
      'sending-signal',
      (payload: {
        userToSignal: string
        callerId: string
        signal: unknown
      }) => {
        io.to(payload.userToSignal).emit('user-signal', {
          signal: payload.signal,
          callerId: payload.callerId,
        })
      },
    )

    socket.on(
      'returning-signal',
      (payload: { callerId: string; signal: unknown }) => {
        io.to(payload.callerId).emit('receiving-returned-signal', {
          signal: payload.signal,
          id: socket.id,
        })
      },
    )

    socket.on('disconnect', () => {
      removeUserSocket(authUserId, socket.id)
      removeSocketFromRoom(socket, currentRoom, socket.id)
      currentRoom = null
    })
  })
}
