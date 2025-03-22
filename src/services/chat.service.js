import { StreamChat } from 'stream-chat';
import logger from '../utils/logger.js';
import chalk from 'chalk';

const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

const createSupportAdmin = async () => {
  try {
    // Create support admin user if not exists
    await streamClient.upsertUser({
      id: 'support_admin',
      role: 'admin',
      name: 'Customer Support',
      image: 'https://ui-avatars.com/api/?name=Customer+Support'
    });

    logger.info(chalk.green('✅ Support admin user created/updated'));
  } catch (error) {
    logger.error(chalk.red('❌ Failed to create support admin:'), error);
    throw error;
  }
};

export const initializeCustomerChat = async (userId, userName) => {
  try {
    logger.info(chalk.blue('🎯 Initializing customer chat:'), {
      userId: chalk.cyan(userId),
      userName: chalk.yellow(userName || 'Anonymous')
    });

    // Create user token
    const token = streamClient.createToken(userId);

    // Ensure support admin exists
    await createSupportAdmin();

    // Create or update Stream user
    const user = {
      id: userId,
      role: 'user',
      name: userName || 'Anonymous User',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}`
    };

    await streamClient.upsertUser(user);

    // Create unique channel ID
    const channelId = `support_${userId}_${Date.now()}`;

    // Create support channel
    const channel = streamClient.channel('messaging', channelId, {
      name: `Support for ${userName || 'Anonymous User'}`,
      members: [userId, 'support_admin'],
      created_by: { id: 'support_admin' },
      custom: {
        support_channel: true,
        customer_id: userId
      }
    });

    // Create channel and get response
    const response = await channel.create();

    // Send initial message from support
    await channel.sendMessage({
      text: 'Hello! How can we help you today?',
      user_id: 'support_admin'
    });

    logger.info(chalk.green('✅ Chat initialized:'), {
      channelId: chalk.cyan(channelId),
      user: chalk.yellow(userName || 'Anonymous')
    });

    return {
      token,
      channelId,
      apiKey: process.env.STREAM_API_KEY,
      userData: user,
      channelData: response.channel
    };
  } catch (error) {
    logger.error(chalk.red('❌ Chat initialization failed:'), {
      error: error.message,
      userId,
      userName,
      stack: error.stack
    });
    throw error;
  }
};

export const getSupportChannels = async (userId, status = 'open') => {
  try {
    const filter = { type: 'messaging', members: { $in: [userId] } };
    const sort = [{ field: 'last_message_at', direction: -1 }];

    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 10,
      state: true
    });

    return channels.map(channel => ({
      id: channel.id,
      name: channel.data.name,
      lastMessage: channel.state.messages[channel.state.messages.length - 1],
      createdAt: channel.data.created_at,
      memberCount: channel.data.member_count
    }));
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching support channels:'), error);
    throw error;
  }
};

export const initializeAdminChat = async (adminId, adminName) => {
  try {
    logger.info(chalk.blue('👨‍💼 Initializing admin chat:'), {
      adminId: chalk.cyan(adminId)
    });

    const token = streamClient.createToken(adminId);

    // Create or update admin user
    await streamClient.upsertUser({
      id: adminId,
      role: 'admin',
      name: adminName,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=FF5722`
    });

    // Get all support channels
    const filter = { type: 'messaging', member_count: 2 };
    const sort = [{ field: 'created_at', direction: -1 }];
    const channels = await streamClient.queryChannels(filter, sort);

    logger.info(chalk.green('✅ Admin chat initialized:'), {
      adminId: chalk.cyan(adminId),
      activeChannels: chalk.yellow(channels.length)
    });

    return {
      token,
      apiKey: process.env.STREAM_API_KEY,
      channels: channels.map(channel => ({
        id: channel.id,
        name: channel.data.name,
        customerName: channel.data.name.replace('Support for ', ''),
        lastMessage: channel.state.messages[channel.state.messages.length - 1],
        createdAt: channel.data.created_at
      }))
    };
  } catch (error) {
    logger.error(chalk.red('❌ Admin chat initialization failed:'), error);
    throw error;
  }
};

export const sendAdminMessage = async (adminId, channelId, message) => {
  try {
    const channel = streamClient.channel('messaging', channelId);
    await channel.sendMessage({
      text: message,
      user_id: adminId
    });

    return {
      success: true,
      channelId,
      message
    };
  } catch (error) {
    logger.error(chalk.red('❌ Failed to send admin message:'), error);
    throw error;
  }
};
