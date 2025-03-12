import streamClient from '../config/stream.config.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const createUserToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    logger.info(chalk.blue('🔑 Creating chat token for user:'), chalk.cyan(userId));
    const token = streamClient.createToken(userId);
    
    if (!token) {
      throw new Error('Failed to generate chat token');
    }
    
    return token;
  } catch (error) {
    logger.error(chalk.red('Error creating chat token:'), {
      error: error.message,
      userId
    });
    throw new Error(`Chat token creation failed: ${error.message}`);
  }
};

export const initializeCustomerSupport = async (userId, userName) => {
  try {
    if (!userId || !userName) {
      throw new Error('User ID and name are required');
    }

    logger.info(chalk.blue('👤 Creating Stream Chat user:'), {
      userId: chalk.cyan(userId),
      userName: chalk.yellow(userName)
    });

    // Create user with more details
    const userResponse = await streamClient.upsertUser({
      id: userId,
      role: 'user',
      name: userName,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`,
      created_at: new Date().toISOString()
    });

    logger.info(chalk.green('✅ User created:'), chalk.cyan(userId));

    // Create unique channel ID
    const channelId = `support_${userId}_${Date.now()}`;
    
    logger.info(chalk.blue('📝 Creating support channel:'), chalk.cyan(channelId));

    // Create channel with more configuration
    const channel = streamClient.channel('messaging', channelId, {
      created_by_id: userId,
      name: `Support for ${userName}`,
      members: [userId],
      type: 'messaging',
      created_at: new Date().toISOString(),
      custom: {
        support_channel: true,
        customer_id: userId
      }
    });

    const channelResponse = await channel.create();

    logger.info(chalk.green('✅ Channel created successfully:'), {
      channelId: chalk.cyan(channelId),
      members: chalk.yellow(channelResponse.channel.members.length)
    });

    return {
      channelId: channelResponse.channel.id,
      channelType: channelResponse.channel.type,
      channelData: {
        name: channelResponse.channel.name,
        created_at: channelResponse.channel.created_at
      }
    };
  } catch (error) {
    logger.error(chalk.red('❌ Support chat initialization failed:'), {
      error: error.message,
      userId,
      userName,
      stack: error.stack
    });
    throw new Error(`Support chat initialization failed: ${error.message}`);
  }
};

export const getCustomerSupportHistory = async (userId) => {
  try {
    const filter = { type: 'messaging', members: { $in: [userId] } };
    const sort = [{ field: 'created_at', direction: -1 }];
    
    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 10,
      offset: 0
    });

    // Return only necessary channel data
    return channels.map(channel => ({
      id: channel.id,
      type: channel.type,
      name: channel.data.name,
      created_at: channel.data.created_at,
      last_message_at: channel.data.last_message_at
    }));
  } catch (error) {
    logger.error(chalk.red('Error fetching support history:'), error.message);
    throw new Error('Failed to fetch chat history');
  }
};
