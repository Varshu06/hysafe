import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from backend/.env
// Try multiple possible paths
const envPaths = [
  path.resolve(process.cwd(), '.env'), // From backend directory
  path.resolve(__dirname, '../../.env'), // Relative to this file
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️ .env file not found, trying default dotenv.config()');
  dotenv.config(); // Fallback to default behavior
}

/**
 * Validate required environment variables
 */
export const validateEnv = (): void => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'PORT'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export default {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hysafe',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

