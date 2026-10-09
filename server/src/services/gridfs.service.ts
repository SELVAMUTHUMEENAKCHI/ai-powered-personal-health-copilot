import mongoose from 'mongoose';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/database';

export class GridFsService {
  static async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<mongoose.Types.ObjectId> {
    const bucket = getGridFSBucket();
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const uploadStream = bucket.openUploadStream(fileName, {
      contentType,
      metadata: { uploadedAt: new Date() },
    });

    return new Promise((resolve, reject) => {
      readable
        .pipe(uploadStream)
        .on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId))
        .on('error', (err) => reject(err));
    });
  }

  static downloadStream(fileId: mongoose.Types.ObjectId | string) {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    return bucket.openDownloadStream(objectId);
  }

  static async deleteFile(fileId: mongoose.Types.ObjectId | string): Promise<void> {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    await bucket.delete(objectId);
  }
}
