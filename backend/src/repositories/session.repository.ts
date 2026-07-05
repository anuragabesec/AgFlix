import { BaseRepository } from './base.repository';
import { ActiveSession, IActiveSession } from '../models/session.model';

export class SessionRepository extends BaseRepository<IActiveSession> {
  constructor() {
    super(ActiveSession);
  }

  public async findByTokenFamily(tokenFamily: string): Promise<IActiveSession[]> {
    return this.model.find({ tokenFamily }).exec();
  }

  public async findSessionByDevice(userId: string, deviceId: string): Promise<IActiveSession | null> {
    return this.model.findOne({ userId, deviceId }).exec();
  }

  public async getActiveSessionCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId }).exec();
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.model.deleteMany({ userId }).exec();
  }

  public async revokeSessionByDevice(userId: string, deviceId: string): Promise<void> {
    await this.model.deleteOne({ userId, deviceId }).exec();
  }

  public async findByRefreshTokenHash(refreshTokenHash: string): Promise<IActiveSession | null> {
    return this.model.findOne({ refreshTokenHash }).exec();
  }
}
export default SessionRepository;
