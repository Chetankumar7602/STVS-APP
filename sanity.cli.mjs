import dotenv from 'dotenv';
import { defineCliConfig } from 'sanity/cli';

// Align CLI with Next.js env usage.
dotenv.config({ path: '.env.local' });
dotenv.config();

const projectId = process.env.SANITY_PROJECT_ID || 'e9ojweqn';
const dataset = process.env.SANITY_DATASET || 'production';

export default defineCliConfig({
  api: { projectId, dataset },
});
