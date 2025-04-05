import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  IPFS_GATEWAY
} from '../env';

// Use environment variables for configuration
const IPFS_GATEWAY_URL = IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
const PINATA_API_URL = 'https://api.pinata.cloud';
const API_KEY = PINATA_API_KEY || '';
const SECRET_KEY = PINATA_SECRET_KEY || '';

// Storage keys
const PREFERENCES_STORAGE_KEY = 'payment_preferences';
const IPFS_HASH_STORAGE_KEY = 'payment_preferences_hash';

// Define preference-related types
interface Condition {
  type: string;
  operator: string;
  value: number;
  token: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
}

interface ChainInfo {
  id: number;
  name: string;
  symbol: string;
  icon: string;
}

interface Preference {
  id: string;
  name: string;
  wallet: string;
  chainid: number;
  preferredTokens: TokenInfo[];
  isDefault: boolean;
  minAmount: number;
  maxAmount: number;
}

// Pinata API response type
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Check if Pinata API keys are configured
 */
const isPinataConfigured = (): boolean => {
  return !!API_KEY && !!SECRET_KEY;
};

/**
 * Log environment status for debugging
 */
const logEnvironmentStatus = (): void => {
  if (__DEV__) {
    console.log('IPFS Environment Status:');
    console.log('- IPFS Gateway:', IPFS_GATEWAY_URL);
    console.log('- Pinata API Key configured:', !!API_KEY);
    console.log('- Pinata Secret Key configured:', !!SECRET_KEY);
    console.log('- Platform:', Platform.OS);
  }
};

// Log environment status in development
logEnvironmentStatus();

/**
 * Save preferences to IPFS via Pinata and store the IPFS hash locally
 * @param preferences Array of payment preferences
 * @returns The IPFS hash of the uploaded content
 */
export const savePreferencesToIPFS = async (preferences: Preference[]): Promise<string> => {
  try {
    // First, save preferences to local storage as a backup
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    
    // Check if Pinata is configured
    if (!isPinataConfigured()) {
      console.warn('Pinata API keys not configured. Using local storage only.');
      const mockHash = 'local-' + Date.now().toString();
      await AsyncStorage.setItem(IPFS_HASH_STORAGE_KEY, mockHash);
      return mockHash;
    }
    
    // Upload to Pinata
    const response = await axios.post<PinataResponse>(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: preferences,
        pinataMetadata: {
          name: 'PayCrossChain_Preferences',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': API_KEY,
          'pinata_secret_api_key': SECRET_KEY,
        },
      }
    );
    
    // Store the IPFS hash locally
    const ipfsHash = response.data.IpfsHash;
    await AsyncStorage.setItem(IPFS_HASH_STORAGE_KEY, ipfsHash);
    
    console.log('Preferences saved to IPFS with hash:', ipfsHash);
    return ipfsHash;
  } catch (error) {
    console.error('Error saving preferences to IPFS:', error);
    // If we're in development mode, mock a successful response
    if (__DEV__) {
      console.log('Development mode: Mocking IPFS response');
      const mockHash = 'QmDevelopmentMockHash' + Date.now().toString();
      await AsyncStorage.setItem(IPFS_HASH_STORAGE_KEY, mockHash);
      return mockHash;
    }
    throw error;
  }
};

/**
 * Load preferences from IPFS using stored hash
 * @returns Array of payment preferences
 */
export const loadPreferencesFromIPFS = async (ipfsHash: string): Promise<Preference[]> => {
  try {
    
    if (!ipfsHash) {
      // If no hash, try to load from local storage as fallback
      const localPreferences = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      return localPreferences ? JSON.parse(localPreferences) : [];
    }
    
    // If hash starts with 'local-', it's not an IPFS hash but a local storage reference
    if (ipfsHash.startsWith('local-') || ipfsHash.startsWith('QmDevelopmentMockHash')) {
      const localPreferences = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      return localPreferences ? JSON.parse(localPreferences) : [];
    }
    
    // Fetch preferences from IPFS gateway
    const response = await axios.get<Preference[]>(`${IPFS_GATEWAY_URL}${ipfsHash}`);
    console.log("fetched response from IPFS", response.data);
    // Save to local storage as a backup
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(response.data));
    
    return response.data;
  } catch (error) {
    console.error('Error loading preferences from IPFS:', error);
    
    // Fallback to local storage
    const localPreferences = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    return localPreferences ? JSON.parse(localPreferences) : [];
  }
};

/**
 * Update existing preferences on IPFS
 * @param preferences Updated array of payment preferences
 * @returns The new IPFS hash
 */
export const updatePreferencesOnIPFS = async (preferences: Preference[]): Promise<string> => {
  try {
    // Always save to local storage first as a backup
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    
    // If Pinata is not configured, just use local storage
    if (!isPinataConfigured()) {
      console.warn('Pinata API keys not configured. Using local storage only.');
      const mockHash = 'local-' + Date.now().toString();
      await AsyncStorage.setItem(IPFS_HASH_STORAGE_KEY, mockHash);
      return mockHash;
    }
    
    // Remove existing pin (if any)
    const existingHash = await AsyncStorage.getItem(IPFS_HASH_STORAGE_KEY);
    if (existingHash && !existingHash.startsWith('local-') && !existingHash.startsWith('QmDevelopmentMockHash')) {
      try {
        await axios.delete(
          `${PINATA_API_URL}/pinning/unpin/${existingHash}`,
          {
            headers: {
              'pinata_api_key': API_KEY,
              'pinata_secret_api_key': SECRET_KEY,
            },
          }
        );
      } catch (unpinError) {
        console.warn('Error unpinning old content:', unpinError);
        // Continue even if unpinning fails
      }
    }
    
    // Upload new content
    return await savePreferencesToIPFS(preferences);
  } catch (error) {
    console.error('Error updating preferences on IPFS:', error);
    
    // In development mode, just return a mock hash
    if (__DEV__) {
      console.log('Development mode: Mocking IPFS update');
      const mockHash = 'QmDevelopmentMockHash' + Date.now().toString();
      await AsyncStorage.setItem(IPFS_HASH_STORAGE_KEY, mockHash);
      return mockHash;
    }
    
    throw error;
  }
}; 