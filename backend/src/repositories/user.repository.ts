import { BaseRepository } from './base.repository';
import { User, IUser } from '../models/user.model';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  public async incrementFailedLoginAttempts(user: IUser): Promise<IUser> {
    const attempts = user.failedLoginAttempts + 1;
    const update: any = { failedLoginAttempts: attempts };

    // Lock account if failed attempts exceed 5
    if (attempts >= 5) {
      const lockDurationMs = 30 * 60 * 1000; // 30 minutes lock
      update.lockUntil = new Date(Date.now() + lockDurationMs);
    }

    const updatedUser = await this.model.findByIdAndUpdate(user._id, update, { new: true }).exec();
    return updatedUser!;
  }

  public async resetFailedAttempts(user: IUser): Promise<IUser> {
    const updatedUser = await this.model.findByIdAndUpdate(
      user._id,
      { failedLoginAttempts: 0, $unset: { lockUntil: 1 } },
      { new: true }
    ).exec();
    return updatedUser!;
  }
}
export default UserRepository;
