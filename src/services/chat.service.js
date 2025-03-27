import { StreamChat } from 'stream-chat';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import { ApiError } from '../middleware/error.middleware.js';
import User from '../models/user.model.js';

const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

export const initializeCustomerChat = async (userId, userName) => {
  try {
    // Verify user is not an admin
    const user = await User.findById(userId);
    if (user.role === 'admin') {
      throw new ApiError(403, 'Admins cannot initiate customer support chats');
    }

    // Check for existing active channel less than 24 hours old
    const existingChannel = await findActiveUserChannel(userId);
    if (existingChannel) {
      logger.info(chalk.blue('🔄 Reconnecting to existing chat:'), {
        channelId: chalk.cyan(existingChannel.id),
        userName: chalk.yellow(userName || 'Anonymous')
      });

      return {
        token: streamClient.createToken(userId),
        channelId: existingChannel.id,
        apiKey: process.env.STREAM_API_KEY,
        userData: {
          id: userId,
          name: userName || 'Anonymous User'
        },
        channelData: existingChannel
      };
    }

    logger.info(chalk.blue('🎯 Initializing customer chat:'), {
      userId: chalk.cyan(userId),
      userName: chalk.yellow(userName || 'Anonymous')
    });

    // Create user token and update user
    const token = streamClient.createToken(userId);
    await streamClient.upsertUser({
      id: userId,
      role: 'user',
      name: userName || 'Anonymous User',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}`
    });

    // Create channel
    const channelId = `support_${userId}_${Date.now()}`;
    const channel = streamClient.channel('messaging', channelId, {
      name: `Support for ${userName || 'Anonymous User'}`,
      members: [userId],
      created_by: { id: userId },
      custom: {
        support_channel: true,
        customer_id: userId,
        status: 'waiting'
      }
    });

    const response = await channel.create();
    await channel.sendMessage({
      text: 'Hi, I need help with something.',
      user_id: userId
    });

    return {
      token,
      channelId,
      apiKey: process.env.STREAM_API_KEY,
      userData: {
        id: userId,
        name: userName || 'Anonymous User'
      },
      channelData: response.channel
    };
  } catch (error) {
    logger.error(chalk.red('❌ Chat initialization failed:'), {
      error: error.message,
      userId
    });
    throw error;
  }
};

const findActiveUserChannel = async (userId) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const filter = {
      type: 'messaging',
      'custom.customer_id': userId,
      'custom.support_channel': true,
      created_at: { $gt: twentyFourHoursAgo.toISOString() }
    };

    const sort = [{ last_message_at: -1 }];
    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 1,
      state: true
    });

    return channels.length > 0 ? channels[0] : null;
  } catch (error) {
    logger.error(chalk.red('❌ Error finding active channel:'), error);
    return null;
  }
};

export const getActiveCustomers = async () => {
  try {
    const filter = { type: 'messaging' };
    const sort = [{ last_message_at: -1 }];

    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 50,
      state: true,
      watch: true,
      message_limit: 1
    });

    return channels
      .filter(channel => channel.data.name?.includes('Support for'))
      .map(channel => ({
        channelId: channel.id,
        customer: {
          id: channel.data.custom?.customer_id,
          name: channel.data.name?.replace('Support for ', '') || 'Anonymous',
          lastActive: channel.data.last_message_at
        },
        status: channel.data.custom?.status || 'waiting',
        lastMessage: channel.state.messages?.[0],
        unreadCount: channel.state.unreadCount || 0,
        createdAt: channel.data.created_at
      }));
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching customers:'), error);
    throw error;
  }
};

export const sendAdminMessage = async (adminId, channelId, message) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    const response = await channel.sendMessage({
      text: message,
      user_id: adminId
    });

    return {
      success: true,
      channelId,
      message: response.message
    };
  } catch (error) {
    logger.error(chalk.red('❌ Failed to send message:'), error);
    throw error;
  }
};
