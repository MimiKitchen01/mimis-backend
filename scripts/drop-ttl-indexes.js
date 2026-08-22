import mongoose from 'mongoose';
import 'dotenv/config';
import chalk from 'chalk';

// MongoDB TTL indexes delete whole documents, not subfields. The indexes that
// used to live on user.model.js ('otp.expiresAt_1', 'resetOTP.expiresAt_1')
// therefore deleted any user whose OTP/reset window elapsed. Removing them
// from the schema does not drop them from an existing database — run this
// script once per environment to remove the live indexes.

const TTL_INDEXES = ['otp.expiresAt_1', 'resetOTP.expiresAt_1'];

const dropTtlIndexes = async () => {
  if (!process.env.MONGODB_URI) {
    console.error(chalk.red('❌ MONGODB_URI is not set'));
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(chalk.green('✅ Connected to MongoDB'));

  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();

  for (const indexName of TTL_INDEXES) {
    const exists = indexes.some((idx) => idx.name === indexName);
    if (!exists) {
      console.log(chalk.yellow(`⚠️  Index ${indexName} not found — skipping`));
      continue;
    }

    await collection.dropIndex(indexName);
    console.log(chalk.green(`🗑️  Dropped index ${indexName}`));
  }

  // Users who were saved while the TTL indexes were active may still carry
  // expired OTP fields; they are harmless (rejected by expiry checks) but we
  // tidy the ones that are already expired.
  const now = new Date();
  const otpResult = await collection.updateMany(
    { 'otp.expiresAt': { $lt: now } },
    { $unset: { otp: '' } }
  );
  const resetResult = await collection.updateMany(
    { 'resetOTP.expiresAt': { $lt: now } },
    { $unset: { resetOTP: '' } }
  );
  console.log(
    chalk.blue(`🧹 Cleared ${otpResult.modifiedCount} expired OTP and ${resetResult.modifiedCount} expired reset OTP fields`)
  );

  await mongoose.disconnect();
  console.log(chalk.green('✅ Done'));
};

dropTtlIndexes().catch((error) => {
  console.error(chalk.red('❌ Migration failed:'), error);
  process.exit(1);
});
