import express from 'express';
import config from './config/env';
import chatRoutes from './routes/chat.routes';
import authenticateToken from './middleware/auth.middleware';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware (skips for health endpoint)
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return authenticateToken(req, res, next);
});

// Routes
app.use('/api', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
}); 