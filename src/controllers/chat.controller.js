import * as chatService from '../services/chat.service.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const initializeChat = async (req, res) => {
  try {
    const { userId, fullName } = req.user;

    if (!userId) {
      throw new Error('User ID is missing from request');
    }

    logger.info(chalk.blue('🎯 Initializing chat:'), {
      userId: chalk.cyan(userId),
      userName: chalk.yellow(fullName || 'Anonymous')
    });

    // Generate user token
    const token = await chatService.createUserToken(userId);
    
    if (!token) {
      throw new Error('Failed to generate chat token');
    }

    // Initialize support channel
    const channelData = await chatService.initializeCustomerSupport(
      userId,
      fullName || 'Anonymous User'
    );

    const response = {
      token,
      apiKey: process.env.STREAM_API_KEY,
      userData: {
        id: userId,
        name: fullName || 'Anonymous User'
      },
      channel: channelData
    };

    logger.info(chalk.green('✅ Chat initialized successfully'), {
      userId: chalk.cyan(userId),
      channelId: chalk.yellow(channelData.channelId)
    });

    res.json(response);
  } catch (error) {
    logger.error(chalk.red('❌ Chat initialization failed:'), {
      error: error.message,
      userId: req.user?.userId,
      stack: error.stack
    });

    res.status(500).json({ 
      message: 'Chat initialization failed',
      details: error.message,
      code: 'CHAT_INIT_ERROR'
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const channels = await chatService.getCustomerSupportHistory(req.user.userId);
    res.json({ channels });
  } catch (error) {
    logger.error(chalk.red('❌ Chat history error:'), error.message);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch chat history'
    });
  }
};
