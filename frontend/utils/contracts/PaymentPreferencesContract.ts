import { ethers } from 'ethers';
import { getSigner } from '../web3/walletUtils';
import { getContractAddress } from '../config/contracts';

// Import ABI (Simplified - Create a proper ABI file based on your compiled contract)
const PaymentPreferencesABI = [
  "function setPreferencesIPFSHash(string ipfsHash) external",
  "function getPreferencesIPFSHash(address user) external view returns (string, uint256)",
  "function hasPreferences(address user) external view returns (bool)",
  "function removePreferences() external"
];

/**
 * Set or update payment preferences IPFS hash in the contract
 * @param ipfsHash The IPFS hash that points to the user's payment preferences
 * @returns Transaction hash
 */
export const setPreferencesIPFSHash = async (ipfsHash: string): Promise<string> => {
  try {
    const signer = await getSigner();
    const contractAddress = getContractAddress('PaymentPreferences');
    
    const contract = new ethers.Contract(
      contractAddress,
      PaymentPreferencesABI,
      signer
    );
    
    const tx = await contract.setPreferencesIPFSHash(ipfsHash);
    const receipt = await tx.wait();
    
    console.log('Preferences IPFS hash set on contract:', ipfsHash);
    return receipt.transactionHash;
  } catch (error) {
    console.error('Error setting preferences IPFS hash:', error);
    throw error;
  }
};

/**
 * Get a user's payment preferences IPFS hash from the contract
 * @param userAddress The address of the user whose preferences to fetch
 * @returns Object containing the IPFS hash and last update timestamp
 */
export const getPreferencesIPFSHash = async (userAddress: string): Promise<{
  ipfsHash: string;
  lastUpdated: Date;
}> => {
  try {
    const signer = await getSigner();
    const contractAddress = getContractAddress('PaymentPreferences');
    
    const contract = new ethers.Contract(
      contractAddress,
      PaymentPreferencesABI,
      signer
    );
    
    const [ipfsHash, timestamp] = await contract.getPreferencesIPFSHash(userAddress);
    
    return {
      ipfsHash,
      lastUpdated: new Date(timestamp.toNumber() * 1000) // Convert to JavaScript Date
    };
  } catch (error) {
    console.error('Error getting preferences IPFS hash:', error);
    throw error;
  }
};

/**
 * Check if a user has preferences set
 * @param userAddress The address of the user to check
 * @returns Boolean indicating if the user has preferences
 */
export const hasPreferences = async (userAddress: string): Promise<boolean> => {
  try {
    const signer = await getSigner();
    const contractAddress = getContractAddress('PaymentPreferences');
    
    const contract = new ethers.Contract(
      contractAddress,
      PaymentPreferencesABI,
      signer
    );
    
    return await contract.hasPreferences(userAddress);
  } catch (error) {
    console.error('Error checking if user has preferences:', error);
    throw error;
  }
};

/**
 * Remove user's payment preferences from the contract
 * @returns Transaction hash
 */
export const removePreferences = async (): Promise<string> => {
  try {
    const signer = await getSigner();
    const contractAddress = getContractAddress('PaymentPreferences');
    
    const contract = new ethers.Contract(
      contractAddress,
      PaymentPreferencesABI,
      signer
    );
    
    const tx = await contract.removePreferences();
    const receipt = await tx.wait();
    
    console.log('Preferences removed from contract');
    return receipt.transactionHash;
  } catch (error) {
    console.error('Error removing preferences:', error);
    throw error;
  }
}; 