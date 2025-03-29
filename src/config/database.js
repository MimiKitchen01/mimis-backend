import mongoose from 'mongoose';
import chalk from 'chalk';
import logger from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 50,
      connectTimeoutMS: 10000,
      retryWrites: true
    };

    const connection = await mongoose.connect(process.env.MONGODB_URI, options);
    
    // Set default timeout for operations
    mongoose.set('bufferTimeoutMS', 15000);

    // Log detailed connection info
    logger.info({
      message: chalk.green.bold('🎉 MongoDB Connected Successfully'),
      details: {
        host: connection.connection.host,
        port: connection.connection.port,
        name: connection.connection.name,
        models: Object.keys(connection.models),
        status: connection.connection.readyState === 1 ? 'connected' : 'disconnected',
        features: {
          ssl: connection.connection.config?.ssl || false,
          auth: !!connection.connection.config?.auth,
          replicaSet: !!connection.connection.config?.replicaSet
        }
      }
    });

    // Monitor database events
    mongoose.connection.on('error', (err) => {
      logger.error({
        message: chalk.red('MongoDB Connection Error'),
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack
        }
      });
    });

    mongoose.connection.on('timeout', () => {
      logger.error({
        message: chalk.red('MongoDB Operation Timeout'),
        timestamp: new Date().toISOString()
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn({
        message: chalk.yellow('MongoDB Disconnected'),
        timestamp: new Date().toISOString(),
        attempt: 'Attempting to reconnect...'
      });
    });

    mongoose.connection.on('reconnected', () => {
      logger.info({
        message: chalk.green('MongoDB Reconnected'),
        timestamp: new Date().toISOString(),
        status: 'Connection restored'
      });
    });

  } catch (error) {
    logger.error({
      message: chalk.red.bold('❌ MongoDB Connection Failed'),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      config: {
        uri: process.env.MONGODB_URI?.replace(
          /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
          'mongodb$1://*****:*****@'
        )
      }
    });
    process.exit(1);
  }
};
