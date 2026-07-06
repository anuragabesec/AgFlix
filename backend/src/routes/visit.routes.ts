import { Router, Request, Response } from 'express';
import { VisitCounter } from '../models/visit-counter.model';

const router = Router();

// GET /api/v1/visits/count - Returns the current visit count
router.get('/count', async (req: Request, res: Response) => {
  try {
    const counter = await VisitCounter.findOne({ key: 'visitor_count' });
    res.status(200).json({
      success: true,
      count: counter ? counter.count : 0,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch visit count',
    });
  }
});

// POST /api/v1/visits/increment - Increments the visit count by 1
router.post('/increment', async (req: Request, res: Response) => {
  try {
    const counter = await VisitCounter.findOneAndUpdate(
      { key: 'visitor_count' },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    res.status(200).json({
      success: true,
      count: counter.count,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to increment visit count',
    });
  }
});

export default router;
