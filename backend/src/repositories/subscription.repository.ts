import { BaseRepository } from './base.repository';
import { Subscription, ISubscription } from '../models/subscription.model';

export class SubscriptionRepository extends BaseRepository<ISubscription> {
  constructor() {
    super(Subscription);
  }

  public async findActiveByUserId(userId: string): Promise<ISubscription | null> {
    return this.model.findOne({
      userId,
      status: { $in: ['active', 'trialing'] },
    }).exec();
  }

  public async findByStripeSubId(stripeSubscriptionId: string): Promise<ISubscription | null> {
    return this.model.findOne({ stripeSubscriptionId }).exec();
  }

  public async findByRazorpaySubId(razorpaySubscriptionId: string): Promise<ISubscription | null> {
    return this.model.findOne({ razorpaySubscriptionId }).exec();
  }
}
export default SubscriptionRepository;
