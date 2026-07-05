import mongoose from 'mongoose';
import { env } from '../src/config/environment';
import Movie from '../src/models/movie.model';

const checkDb = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected!');

    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies in database:`);
    for (const m of movies) {
      console.log(`- Title: ${m.title}`);
      console.log(`  ID: ${m._id}`);
      console.log(`  videoUrl: ${m.videoUrl}`);
      console.log(`  active: ${m.active}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error:', err);
  }
};

checkDb();
