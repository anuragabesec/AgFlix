import mongoose from 'mongoose';
import { env } from '../src/config/environment';
import User from '../src/models/user.model';

const checkUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected!');

    const users = await User.find({});
    console.log(`Found ${users.length} users in database:`);
    for (const u of users) {
      console.log(`- Email: ${u.email}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Verified: ${u.isVerified}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Status: ${u.status}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error:', err);
  }
};

checkUsers();
