import { app } from './app';
import { connectDB } from './config/database';
import { env } from './config/env';

async function startServer(): Promise<void> {
  try {
    await connectDB();
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[Server] Health Copilot API running on http://localhost:${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
