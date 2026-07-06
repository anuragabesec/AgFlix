import mongoose from 'mongoose';
import { env } from '../src/config/environment';

const wipeUsersData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established.');
    }

    // Collections to wipe
    const collectionsToClear = ['users', 'profiles', 'otps', 'subscriptions', 'sessions', 'auditlogs'];

    for (const name of collectionsToClear) {
      const collection = db.collection(name);
      const count = await collection.countDocuments({});
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`🧹 Cleared ${count} documents from "${name}" collection.`);
      } else {
        console.log(`ℹ️ Collection "${name}" is already empty.`);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected! Database is clean.');
  } catch (err) {
    console.error('Error during database wipe:', err);
  }
};

wipeUsersData();
