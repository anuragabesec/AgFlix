import { BaseRepository } from './base.repository';
import { Payment, IPayment } from '../models/payment.model';

export class PaymentRepository extends BaseRepository<IPayment> {
  constructor() {
    super(Payment);
  }

  public async findByUserId(userId: string): Promise<IPayment[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  public async findByTransactionId(transactionId: string): Promise<IPayment | null> {
    return this.model.findOne({ transactionId }).exec();
  }
}
export default PaymentRepository;
