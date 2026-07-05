import { BaseRepository } from './base.repository';
import { Movie, IMovie } from '../models/movie.model';

export class MovieRepository extends BaseRepository<IMovie> {
  constructor() {
    super(Movie);
  }

  public async findTrending(limit = 10): Promise<IMovie[]> {
    return this.model.find({ isTrending: true, active: true }).limit(limit).exec();
  }

  public async findOriginals(limit = 10): Promise<IMovie[]> {
    return this.model.find({ isOriginal: true, active: true }).limit(limit).exec();
  }

  public async findFeatured(): Promise<IMovie | null> {
    return this.model.findOne({ featured: true, active: true }).exec();
  }

  public async searchMovies(query: string, limit = 20): Promise<IMovie[]> {
    return this.model.find(
      { $text: { $search: query }, active: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  public async findByGenre(genre: string, limit = 10): Promise<IMovie[]> {
    return this.model.find({ genres: genre, active: true }).limit(limit).exec();
  }

  public async incrementViews(movieId: string): Promise<void> {
    await this.model.findByIdAndUpdate(movieId, { $inc: { views: 1 } }).exec();
  }
}
export default MovieRepository;
