import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/environment';
import User from '../src/models/user.model';

const resetPasswords = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected!');

    const emails = ['anurag161286@gmail.com', 'anuraggupta@abes.ac.in', 'engineer.anurag@gmail.com'];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    for (const email of emails) {
      const user = await User.findOne({ email });
      if (user) {
        user.passwordHash = passwordHash;
        user.isVerified = true; // force verify just in case
        await user.save();
        console.log(`Successfully reset password for ${email} to "Password123!"`);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error:', err);
  }
};

resetPasswords();
