import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface EnvConfig {
  port: number;
  geminiApiKey: string;
  supabaseJwtSecret: string;
}

const config: EnvConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
};

// Validate required environment variables
if (!config.geminiApiKey) {
  console.error('GEMINI_API_KEY is required but not provided in environment variables');
  process.exit(1);
}

if (!config.supabaseJwtSecret) {
  console.error('SUPABASE_JWT_SECRET is required but not provided in environment variables');
  process.exit(1);
}

export default config; 