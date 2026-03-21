import dotenv from 'dotenv'
import {defineCliConfig} from 'sanity/cli'

dotenv.config({path: '.env.local'})
dotenv.config()

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || 'e9ojweqn'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production'

export default defineCliConfig({
  api: {projectId, dataset},
})
