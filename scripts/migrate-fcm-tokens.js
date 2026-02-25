import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import User from '../src/models/user.model.js';
import logger from '../src/utils/logger.js';

dotenv.config();

const migrateOldTokenFormat = (tokens) => {
  if (!tokens) return [];
  
  return tokens.map(t => {
    if (typeof t === 'string') {
      console.log(chalk.yellow(`  • Migrating token: ${t.substring(0, 10)}...`));
      return {
        token: t,
        platform: 'android', // Assume android for legacy tokens
        createdAt: new Date(),
        lastUsed: new Date()
      };
    }
    return t;
  });
};

const migrateFCMTokens = async () => {
  try {
    console.log(chalk.blue('\n🚀 Starting FCM Token Migration...'));
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.green('✅ Connected to MongoDB'));

    // Find all users with tokens
    const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } });
    console.log(chalk.blue(`\n📊 Found ${users.length} users with FCM tokens`));

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Check if any tokens are still in old string format
        const hasOldFormat = user.fcmTokens.some(t => typeof t === 'string');

        if (hasOldFormat) {
          const oldCount = user.fcmTokens.filter(t => typeof t === 'string').length;
          console.log(chalk.cyan(`\n👤 User: ${user.email} (${user._id})`));
          console.log(chalk.yellow(`  📌 Found ${oldCount} old-format tokens`));

          // Migrate tokens
          user.fcmTokens = migrateOldTokenFormat(user.fcmTokens);
          await user.save();

          console.log(chalk.green(`  ✅ Migrated to new format: ${user.fcmTokens.length} tokens total`));
          migratedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error migrating user ${user.email}:`, error.message));
        errorCount++;
      }
    }

    console.log(chalk.blue('\n📈 Migration Summary:'));
    console.log(chalk.green(`  ✅ Migrated: ${migratedCount} users`));
    console.log(chalk.yellow(`  ⏭️  Skipped: ${skippedCount} users (already migrated)`));
    console.log(chalk.red(`  ❌ Errors: ${errorCount} users`));

    // Verify migration
    const nonMigratedUsers = await User.find({
      fcmTokens: {
        $exists: true,
        $ne: [],
        $elemMatch: { token: { $exists: false } }
      }
    });

    if (nonMigratedUsers.length === 0) {
      console.log(chalk.green('\n🎉 All tokens successfully migrated to new format!'));
    } else {
      console.log(chalk.red(`\n⚠️  Warning: ${nonMigratedUsers.length} users still have incomplete migrations`));
    }

    await mongoose.connection.close();
    console.log(chalk.green('\n✅ Migration complete!\n'));
  } catch (error) {
    console.error(chalk.red('Fatal error during migration:'), error);
    process.exit(1);
  }
};

// Run migration
migrateFCMTokens().catch(error => {
  console.error(chalk.red('Migration failed:'), error);
  process.exit(1);
});
