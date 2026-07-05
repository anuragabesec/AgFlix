import request from 'supertest';
import app from '../app';
import User from '../models/user.model';
import Otp from '../models/otp.model';
import ActiveSession from '../models/session.model';
import bcrypt from 'bcryptjs';

// Mock mongoose models
jest.mock('../models/user.model');
jest.mock('../models/otp.model');
jest.mock('../models/session.model');
jest.mock('../models/audit-log.model');

describe('🔑 Authentication Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should fail registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@domain.com',
          password: '123',
          confirmPassword: '123',
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Request validation failed');
    });

    it('should fail registration when passwords do not match', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@domain.com',
          password: 'SecurePassword123!',
          confirmPassword: 'MismatchedPassword1!',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors[0].field).toBe('confirmPassword');
      expect(response.body.errors[0].message).toBe('Passwords do not match');
    });

    it('should return 409 conflict if email already registered', async () => {
      // Mock user exists check
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'existing_user_id' }),
      });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@domain.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already registered');
    });

    it('should register successfully and generate signup OTP', async () => {
      // Mock no user exists
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      // Mock create user
      (User.create as jest.Mock).mockResolvedValue({
        _id: 'mocked_user_id',
        name: 'Jane Doe',
        email: 'jane@domain.com',
      });
      // Mock OTP creation
      (Otp.create as jest.Mock).mockResolvedValue({
        email: 'jane@domain.com',
      });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@domain.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Signup successful');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 401 when user credentials do not match', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'user_id',
          email: 'jane@domain.com',
          passwordHash: 'hashedPassword',
          failedLoginAttempts: 0,
        }),
      });

      // Mock password match as false
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      // Mock save to database
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ failedLoginAttempts: 1 }),
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@domain.com',
          password: 'WrongPassword!',
          deviceId: 'device_fingerprint_id',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should login successfully and set access cookies', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'mocked_user_id',
          name: 'Jane Doe',
          email: 'jane@domain.com',
          role: 'user',
          passwordHash: 'hashedPassword',
          isVerified: true,
          failedLoginAttempts: 0,
        }),
      });

      // Mock password match as true
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ failedLoginAttempts: 0 }),
      });
      // Mock existing sessions checking
      (ActiveSession.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          deleteOne: jest.fn().mockResolvedValue(true),
        }),
      });
      (ActiveSession.create as jest.Mock).mockResolvedValue({
        id: 'session_id',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@domain.com',
          password: 'SecurePassword123!',
          deviceId: 'device_fingerprint_id',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      
      // Verify secure HTTP-only cookies are returned
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('accessToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });
  });
});
