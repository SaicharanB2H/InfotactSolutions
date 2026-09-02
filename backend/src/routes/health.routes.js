import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'ok',
    service: 'streamweaver-backend',
    database: dbStatusMap[dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    return res.status(200).json({ status: 'ready' });
  }
  return res.status(503).json({ status: 'not_ready', databaseState: dbState });
});

export default router;
