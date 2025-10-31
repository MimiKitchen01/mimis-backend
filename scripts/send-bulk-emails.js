import 'dotenv/config';
import mongoose from 'mongoose';
import { MailtrapClient } from 'mailtrap';
import User from '../src/models/user.model.js';

async function main() {
  const token = process.env.MAILTRAP_TOKEN;
  if (!token) {
    console.error('MAILTRAP_TOKEN is not set in .env');
    process.exit(1);
  }

  const sender = { email: 'hello@mimiskitchenuk.com', name: "Mimi's Kitchen" };
  const subject = process.argv[2] || 'You are awesome!';
  const text = process.argv[3] || 'Congrats for sending test email with Mailtrap!';
  const dryRun = process.argv.includes('--dry-run');

  const client = new MailtrapClient({ token });

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  try {
    // Fetch active users who opted into email notifications
    const users = await User.find({
      isActive: true,
      email: { $exists: true, $ne: null },
      'preferences.notifications.email': { $ne: false }
    }).select('email');

    const emails = [...new Set(users.map(u => u.email).filter(Boolean))];
    console.log(`Preparing to ${dryRun ? 'simulate sending' : 'send'} to ${emails.length} recipients...`);

    if (dryRun) {
      console.log('Sample recipients:', emails.slice(0, 10));
      return;
    }

    let success = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await client.send({
          from: sender,
          to: [{ email }],
          subject,
          text,
          category: 'Bulk Notification'
        });
        success++;
        console.log(`✓ Sent to ${email}`);
      } catch (err) {
        failed++;
        console.error(`✗ Failed for ${email}:`, err?.response?.data || err.message);
      }
      // small delay to be nice to the API
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`Done. Success: ${success}, Failed: ${failed}`);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
