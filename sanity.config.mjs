import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas/schemaTypes.js';

function readEnv(key) {
  try {
    if (typeof process !== 'undefined' && process?.env && typeof process.env[key] === 'string') {
      return process.env[key];
    }
  } catch {
    // ignore
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env && typeof import.meta.env[key] === 'string') {
      return import.meta.env[key];
    }
  } catch {
    // ignore
  }

  return undefined;
}

// In Sanity Studio, env vars intended for the browser should be prefixed with SANITY_STUDIO_.
// We also support falling back to the app's vars for local dev.
const projectId =
  readEnv('SANITY_STUDIO_PROJECT_ID') ||
  readEnv('NEXT_PUBLIC_SANITY_PROJECT_ID') ||
  readEnv('SANITY_PROJECT_ID') ||
  'e9ojweqn';

const dataset =
  readEnv('SANITY_STUDIO_DATASET') ||
  readEnv('NEXT_PUBLIC_SANITY_DATASET') ||
  readEnv('SANITY_DATASET') ||
  'production';

export default defineConfig({
  name: 'default',
  title: 'STVS Gallery',
  projectId,
  dataset,
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
