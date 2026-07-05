import request from 'supertest';
import app from '../app';
import Movie from '../models/movie.model';
import WatchParty from '../models/watch-party.model';
import User from '../models/user.model';
import ActiveSession from '../models/session.model';
import jwt from 'jsonwebtoken';

// Mock mongoose models
jest.mock('../models/movie.model');
jest.mock('../models/watch-party.model');
jest.mock('../models/user.model');
jest.mock('../models/session.model');
jest.mock('../models/audit-log.model');

describe('🎬 Media Streaming & Watch Parties Routes Integration Tests', () => {
  let mockToken = 'mock_jwt_auth_token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock jwt.verify to bypass token check
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({
      userId: 'mocked_user_id',
      email: 'jane@domain.com',
      role: 'user',
      tokenFamily: 'mock_token_family',
    }));

    // Mock User check in authenticateUser middleware
    (User.findById as jest.Mock).mockImplementation(() => {
      const userDoc = {
        _id: 'mocked_user_id',
        name: 'Jane Doe',
        email: 'jane@domain.com',
        role: 'user',
        isVerified: true,
        status: 'active',
      };
      const query: any = Promise.resolve(userDoc);
      query.exec = jest.fn().mockResolvedValue(userDoc);
      return query;
    });

    // Mock ActiveSession query check inside middleware
    (ActiveSession.findOne as jest.Mock).mockImplementation(() => {
      const sessionDoc = {
        userId: 'mocked_user_id',
        deviceId: 'mock_device_fingerprint_id',
        tokenFamily: 'mock_token_family',
        save: jest.fn().mockResolvedValue(true),
      };
      const query: any = Promise.resolve(sessionDoc);
      query.exec = jest.fn().mockResolvedValue(sessionDoc);
      return query;
    });
  });

  describe('GET /api/v1/movies', () => {
    it('should retrieve all available movie catalogs', async () => {
      const mockMovies = [
        { _id: 'movie_1', title: 'Tears of Steel', active: true },
        { _id: 'movie_2', title: 'Sintel', active: true },
      ];

      (Movie.find as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(mockMovies);
        query.exec = jest.fn().mockResolvedValue(mockMovies);
        return query;
      });

      const response = await request(app)
        .get('/api/v1/movies')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.movies.length).toBe(2);
      expect(response.body.movies[0].title).toBe('Tears of Steel');
    });
  });

  describe('GET /api/v1/movies/:id', () => {
    it('should retrieve a single movie detail by id', async () => {
      const mockMovie = {
        _id: 'movie_1',
        title: 'Tears of Steel',
        active: true,
        views: 10,
        save: jest.fn().mockResolvedValue(true),
      };

      (Movie.findById as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(mockMovie);
        query.exec = jest.fn().mockResolvedValue(mockMovie);
        return query;
      });

      // Mock increment views update
      (Movie.findByIdAndUpdate as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve({});
        query.exec = jest.fn().mockResolvedValue({});
        return query;
      });

      const response = await request(app)
        .get('/api/v1/movies/movie_1')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.movie.title).toBe('Tears of Steel');
    });
  });

  describe('POST /api/v1/movies/:id/like', () => {
    it('should increment likes count for a movie', async () => {
      const mockMovie = {
        _id: 'movie_1',
        title: 'Tears of Steel',
        active: true,
        likes: 5,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      (Movie.findById as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(mockMovie);
        query.exec = jest.fn().mockResolvedValue(mockMovie);
        return query;
      });

      const response = await request(app)
        .post('/api/v1/movies/movie_1/like')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.likes).toBe(6);
    });
  });

  describe('POST /api/v1/movies/watch-party', () => {
    it('should generate a watch party room and return code', async () => {
      const mockMovie = { _id: 'movie_1', title: 'Tears of Steel', active: true };
      (Movie.findById as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(mockMovie);
        query.exec = jest.fn().mockResolvedValue(mockMovie);
        return query;
      });

      (WatchParty.create as jest.Mock).mockResolvedValue({
        partyCode: 'WP-MOCK123',
        movieId: 'movie_1',
        hostId: 'mocked_user_id',
      });

      const response = await request(app)
        .post('/api/v1/movies/watch-party')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id')
        .send({ movieId: 'movie_1' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.partyCode).toBe('WP-MOCK123');
    });
  });
});
