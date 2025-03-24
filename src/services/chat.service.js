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

    // Create or update customer user
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
      members: [userId],  // Start with just the user
      created_by: { id: userId },
      custom: {
        support_channel: true,
        customer_id: userId,
        status: 'waiting' // Add status to track channel state
      }
    });

    // Create channel and get response
    const response = await channel.create();

    // Send initial message from user
    await channel.sendMessage({
      text: 'Hi, I need help with something.',
      user_id: userId
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
      userName
    });
    throw error;
  }
};

export const getSupportChannels = async (userId, status = 'open') => {
  try {
    const filter = { type: 'messaging', members: { $in: [userId] } };
    const sort = [{ last_message_at: -1 }]; // Updated sort format

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

export const getActiveCustomers = async () => {
  try {
    logger.info(chalk.blue('🔍 Fetching active chat customers'));

    // Simplified filter to match any support channels
    const filter = {
      type: 'messaging'
    };

    // Use correct sort format for Stream Chat
    const sort = [
      { last_message_at: -1 }
    ];

    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 50,
      state: true,
      watch: true,
      message_limit: 1
    });

    logger.info(chalk.cyan('Found channels:'), {
      count: channels.length,
      channelIds: channels.map(c => c.id)
    });

    const customers = channels
      .filter(channel => channel.data.name?.includes('Support for')) // Filter support channels
      .map(channel => ({
        channelId: channel.id,
        customer: {
          id: channel.data.custom?.customer_id || channel.data.created_by?.id,
          name: channel.data.name?.replace('Support for ', '') || 'Anonymous',
          lastActive: channel.data.last_message_at,
          image: channel.data.created_by?.image
        },
        status: channel.data.custom?.status || 'waiting',
        lastMessage: channel.state.messages?.[0],
        unreadCount: channel.state.unreadCount || 0,
        createdAt: channel.data.created_at,
        members: channel.state.members
      }));

    logger.info(chalk.green('✅ Retrieved customers:'), {
      count: chalk.yellow(customers.length),
      statuses: customers.map(c => c.status)
    });

    return customers;
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching active customers:'), {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const joinCustomerChat = async (adminId, channelId) => {
  try {
    const channel = streamClient.channel('messaging', channelId);

    // Add admin to channel members
    await channel.addMembers([adminId]);

    // Update channel status
    await channel.updatePartial({
      set: {
        'custom.status': 'active',
        'custom.admin_id': adminId
      }
    });

    // Send system message
    await channel.sendMessage({
      text: 'An admin has joined the chat.',
      type: 'system'
    });

    return channel.state;
  } catch (error) {
    logger.error(chalk.red('❌ Failed to join customer chat:'), error);
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

export const getCustomerChatHistory = async (customerId) => {
  try {
    logger.info(chalk.blue('📚 Fetching chat history for customer:'),
      chalk.cyan(customerId)
    );

    const filter = {
      type: 'messaging',
      'custom.customer_id': customerId
    };
    const sort = [{ created_at: -1 }]; // Updated sort format

    const channels = await streamClient.queryChannels(filter, sort, {
      limit: 10,
      state: true,
      messages: {
        limit: 50
      }
    });

    return channels.map(channel => ({
      channelId: channel.id,
      messages: channel.state.messages,
      createdAt: channel.data.created_at,
      status: channel.data.frozen ? 'closed' : 'active'
    }));
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching customer chat history:'), error);
    throw error;
  }
};
