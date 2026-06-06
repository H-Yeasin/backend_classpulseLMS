import { Socket } from 'socket.io'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { User } from '../models/user.model'

type SocketAuthPayload = JwtPayload & {
  userId?: string
  tokenVersion?: number
}

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  const socketId = socket.id;
  console.log(`[Socket ${socketId}] Handshake attempt starting...`);
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      console.error(`[Socket ${socketId}] Auth failed: No token provided`);
      return next(new Error('Authentication error: Token not found'));
    }

    console.log(`[Socket ${socketId}] Token found, verifying JWT...`);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as SocketAuthPayload;

    console.log(`[Socket ${socketId}] JWT verified for userId: ${decoded.userId}. Fetching user from DB...`);
    const user = await User.findById(decoded.userId).select('_id type username avatar tokenVersion');
    
    if (!user) {
      console.error(`[Socket ${socketId}] Auth failed: User ${decoded.userId} not found in database`);
      return next(new Error('Authentication error: User not found'));
    }

    const currentTokenVersion = user.tokenVersion ?? 0;
    const decodedTokenVersion = decoded.tokenVersion ?? 0;
    
    if (currentTokenVersion !== decodedTokenVersion) {
      console.error(`[Socket ${socketId}] Auth failed: Session expired (version mismatch: ${currentTokenVersion} vs ${decodedTokenVersion})`);
      return next(new Error('Authentication error: Session expired'));
    }

    console.log(`[Socket ${socketId}] Auth SUCCESS for ${user.username}`);
    (socket as any).user = user;
    next();
  } catch (err) {
    console.error(`[Socket ${socketId}] Auth failed: Unexpected error:`, err);
    next(new Error('Authentication error: Invalid or expired token'));
  }
}
