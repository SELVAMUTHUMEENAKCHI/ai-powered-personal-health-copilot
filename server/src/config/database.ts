import mongoose from 'mongoose';
import { env } from './env';

let gridFSBucket: mongoose.mongo.GridFSBucket | null = null;
let mongoMemoryServerInstance: any = null;

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);

    if (conn.connection.db) {
      gridFSBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
        bucketName: 'medical_documents',
      });
      console.log('[Database] GridFS Bucket initialized: medical_documents');
    }

    // Auto-seed demo accounts if primary database is completely empty
    try {
      const { UserModel } = await import('../models/user.model');
      const count = await UserModel.countDocuments();
      if (count === 0) {
        const { runSeed } = await import('../seeds/seed');
        await runSeed();
        console.log('[Database] Auto-seeded demo accounts in primary database.');
      }
    } catch {
      // Non-fatal if seeding check skipped
    }

    return conn;
  } catch (err: any) {
    console.warn(`[Database] Could not connect to primary MongoDB at ${uri} (${err?.message || 'Connection failed'}).`);

    try {
      if (!mongoMemoryServerInstance) {
        console.log('[Database] Initializing in-memory MongoDB server for development/demo environment...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoMemoryServerInstance = await MongoMemoryServer.create();
      }
      const memUri = mongoMemoryServerInstance.getUri();
      console.log(`[Database] In-memory MongoDB running at: ${memUri}`);

      const conn = await mongoose.connect(memUri);
      if (conn.connection.db) {
        gridFSBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
          bucketName: 'medical_documents',
        });
        console.log('[Database] GridFS Bucket initialized: medical_documents (in-memory)');
      }

      // Auto-seed initial demo accounts so login and tests work immediately
      const { runSeed } = await import('../seeds/seed');
      await runSeed();
      console.log('[Database] Auto-seeded demo accounts in in-memory database.');

      return conn;
    } catch (fallbackErr: any) {
      console.error('[Database] In-memory MongoDB fallback failed:', fallbackErr);
      throw err;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  gridFSBucket = null;
  if (mongoMemoryServerInstance) {
    await mongoMemoryServerInstance.stop();
    mongoMemoryServerInstance = null;
  }
}

export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  if (!gridFSBucket) {
    if (mongoose.connection.db) {
      gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'medical_documents',
      });
      return gridFSBucket;
    }
    throw new Error('[Database] GridFS Bucket not initialized. Ensure connectDB() has resolved.');
  }
  return gridFSBucket;
}
