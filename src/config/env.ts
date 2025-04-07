import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface EnvConfig {
  port: number;
  supabaseJwtSecret: string;
  googleCloudProject: string;
  googleCloudLocation: string;
  gcpServiceAccountKeyJsonB64: string;
}

const config: EnvConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || '',
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || '',
  gcpServiceAccountKeyJsonB64: process.env.GCP_SERVICE_ACCOUNT_KEY_JSON_B64 || '',
};

// Validate required environment variables
if (!config.supabaseJwtSecret) {
  console.error('SUPABASE_JWT_SECRET is required but not provided in environment variables');
  process.exit(1);
}

if (!config.googleCloudProject) {
  console.error('GOOGLE_CLOUD_PROJECT is required but not provided in environment variables');
  process.exit(1);
}

if (!config.googleCloudLocation) {
  console.error('GOOGLE_CLOUD_LOCATION is required but not provided in environment variables');
  process.exit(1);
}

if (!config.gcpServiceAccountKeyJsonB64) {
  console.error('GCP_SERVICE_ACCOUNT_KEY_JSON_B64 is required but not provided in environment variables');
  process.exit(1);
}

if (!config.googleCloudProject) {
  console.error('GOOGLE_CLOUD_PROJECT is required but not provided in environment variables');
  process.exit(1);
}

if (!config.googleCloudLocation) {
  console.error('GOOGLE_CLOUD_LOCATION is required but not provided in environment variables');
  process.exit(1);
}

export default config; 