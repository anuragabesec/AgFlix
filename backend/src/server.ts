import app from './app';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import http from 'http';
import { socketService } from './services/socket.service';

const server = http.createServer(app);

// Handle Uncaught Exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}\nStack: ${err.stack}`);
  logger.info('Shutting down server due to uncaught exception...');
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Sockets
    socketService.initialize(server);

    // 3. Start HTTP server
    const port = env.PORT;
    server.listen(port, () => {
      logger.info(`🚀 AgFlix Server running in [${env.NODE_ENV}] mode on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start AgFlix server:', error);
    process.exit(1);
  }
};

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error(`UNHANDLED REJECTION: ${reason.message || reason}\nStack: ${reason.stack || 'No Stack Available'}`);
  logger.info('Shutting down server due to unhandled promise rejection...');
  
  // Close server and exit
  server.close(() => {
    disconnectDatabase().then(() => {
      process.exit(1);
    });
  });
});

// Handle termination signals for graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down server gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDatabase();
    logger.info('Process terminated.');
    process.exit(0);
  });
  
  // Force exit after 10s if connections hanging
  setTimeout(() => {
    logger.error('Force shutdown triggered due to active connections hanging.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
