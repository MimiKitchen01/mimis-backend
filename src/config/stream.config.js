import { StreamChat } from 'stream-chat';
import logger from '../utils/logger.js';
import chalk from 'chalk';

let streamClient;

try {
  if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
    throw new Error('Stream Chat credentials are missing');
  }

  streamClient = StreamChat.getInstance(
    process.env.STREAM_API_KEY,
    process.env.STREAM_API_SECRET
  );

  logger.info(chalk.blue('🔌 Stream Chat initialized'), {
    status: chalk.green('connected'),
    apiKey: chalk.cyan(process.env.STREAM_API_KEY?.substring(0, 8) + '...')
  });
} catch (error) {
  logger.error(chalk.red('❌ Stream Chat initialization failed:'), {
    error: error.message,
    apiKeyPresent: !!process.env.STREAM_API_KEY,
    apiSecretPresent: !!process.env.STREAM_API_SECRET
  });
  throw error;
}

export default streamClient;
