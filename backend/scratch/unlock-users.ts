import mongoose from 'mongoose';
import { env } from '../src/config/environment';
import User from '../src/models/user.model';

const unlockUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected!');

    const res = await User.updateMany(
      {},
      {
        $set: {
          failedLoginAttempts: 0,
          isVerified: true,
          status: 'active'
        },
        $unset: {
          lockUntil: 1
        }
      }
    );

    console.log(`Unlocked all users. Modified count: ${res.modifiedCount}`);

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error:', err);
  }
};

unlockUsers();
