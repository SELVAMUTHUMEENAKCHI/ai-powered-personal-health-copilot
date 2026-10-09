import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root if present, or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().default('super_secret_health_copilot_jwt_key_2026_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  COOKIE_SECRET: z.string().default('health_copilot_cookie_signing_secret_9981'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/health_copilot'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  OCR_FALLBACK_PROVIDER: z.string().default('tesseract'),
});

export const env = envSchema.parse(process.env);
