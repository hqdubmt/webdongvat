import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import speciesRoutes from './routes/species';
import userRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { requireSuperadmin } from './middleware/requireAuth';
import { seedSuperadmin } from './services/userSeed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

seedSuperadmin().catch(console.error);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/species', speciesRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/users', requireSuperadmin, userRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`MasterLMS API running on http://localhost:${PORT}`);
});

export default app;
