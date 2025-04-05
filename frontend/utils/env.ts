// Try to import from @env, but fall back to process.env if that fails
let envVars: Record<string, string> = {};

try {
  // Try to import from @env
  envVars = require('@env');
} catch (error) {
  console.warn('Could not import from @env, using process.env instead');
  
  // Fallback to process.env
  envVars = {
    PINATA_API_KEY: process.env.PINATA_API_KEY || '',
    PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',
    IPFS_GATEWAY: process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    PINATA_JWT: process.env.PINATA_JWT || '',
    APP_NAME: process.env.APP_NAME || 'PayCrossChain',
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
    API_URL: process.env.API_URL || 'http://localhost:3001',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001/v1',
    DEFAULT_CHAIN_ID: process.env.DEFAULT_CHAIN_ID || '1',
    REOWN_PROJECT_ID: process.env.REOWN_PROJECT_ID || 'b1e1aefc0165086def75803b4e1cda7e'
  };
}

export const {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  IPFS_GATEWAY,
  PINATA_JWT,
  APP_NAME,
  APP_VERSION,
  API_URL,
  BACKEND_URL,
  DEFAULT_CHAIN_ID,
  REOWN_PROJECT_ID
} = envVars; 