import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export class SocketService {
  private io: Server | null = null;

  public initialize(server: HTTPServer): void {
    this.io = new Server(server, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    logger.info('Socket.IO Server initialized successfully.');

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket Client Connected: ${socket.id}`);

      // 1. Join Watch Party room
      socket.on('join-party', ({ partyCode, username, userId }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        socket.join(roomName);
        
        logger.info(`User ${username} (${userId}) joined Watch Party: ${partyCode}`);
        
        // Notify others in room
        socket.to(roomName).emit('participant-joined', {
          userId,
          username,
          socketId: socket.id,
        });
      });

      // 2. Play video sync action
      socket.on('party-play', ({ partyCode, currentTime }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        socket.to(roomName).emit('party-play', { currentTime });
        logger.debug(`[Sync] Party ${partyCode} video play at: ${currentTime}s`);
      });

      // 3. Pause video sync action
      socket.on('party-pause', ({ partyCode }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        socket.to(roomName).emit('party-pause');
        logger.debug(`[Sync] Party ${partyCode} video pause`);
      });

      // 4. Seek timeline sync action
      socket.on('party-seek', ({ partyCode, currentTime }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        socket.to(roomName).emit('party-seek', { currentTime });
        logger.debug(`[Sync] Party ${partyCode} video seek to: ${currentTime}s`);
      });

      // 5. Watch Party group text chat messages
      socket.on('party-message', ({ partyCode, text, username, userId }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        const messagePayload = {
          text,
          username,
          userId,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to all participants in room including sender
        this.io?.to(roomName).emit('party-message', messagePayload);
        logger.debug(`[Chat] Party ${partyCode} msg from ${username}: ${text}`);
      });

      // 6. Leave room explicitly
      socket.on('leave-party', ({ partyCode, username, userId }) => {
        const roomName = `party_${partyCode.toUpperCase()}`;
        socket.leave(roomName);
        
        socket.to(roomName).emit('participant-left', {
          userId,
          username,
        });
        logger.info(`User ${username} left Watch Party room: ${partyCode}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket Client Disconnected: ${socket.id}`);
      });
    });
  }
}

export const socketService = new SocketService();
export default socketService;
