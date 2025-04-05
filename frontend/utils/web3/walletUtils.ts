import * as ethers from 'ethers';

let cachedSigner: ethers.Signer | null = null;
let provider: any = null;

/**
 * Initialize the wallet provider
 * @param walletProvider The provider from WalletConnect or other wallet connector
 */
export const initializeProvider = (walletProvider: any): void => {
  provider = walletProvider;
  cachedSigner = null; // Reset signer when provider changes
};

/**
 * Get an ethers.js signer from the connected wallet
 * @returns An ethers.js signer instance
 */
export const getSigner = async (): Promise<ethers.Signer> => {
  if (cachedSigner) return cachedSigner;
  
  if (!provider) {
    throw new Error('No wallet connected. Please connect a wallet first.');
  }
  
  try {
    // Create Web3Provider from the connected wallet provider
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();
    
    // Verify we can get the address to ensure the signer is working
    await signer.getAddress();
    
    cachedSigner = signer;
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    throw new Error('Failed to get signer. Make sure your wallet is connected.');
  }
};

/**
 * Get the current connected wallet address
 * @returns The connected wallet address
 */
export const getWalletAddress = async (): Promise<string> => {
  const signer = await getSigner();
  return await signer.getAddress();
};

/**
 * Clear the cached signer (e.g., on wallet disconnect)
 */
export const clearCachedSigner = (): void => {
  cachedSigner = null;
  provider = null;
}; 