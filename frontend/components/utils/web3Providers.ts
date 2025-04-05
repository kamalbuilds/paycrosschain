import { ethers } from 'ethers';

// RPC URLs for supported chains
const RPC_URLS: Record<number, string> = {
  1: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
  56: 'https://bsc-dataseed.binance.org',
  137: 'https://polygon-rpc.com',
  250: 'https://rpc.ftm.tools',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org'
};

/**
 * Get a provider for a specific chain
 */
export const getProvider = (chainId: number): ethers.providers.Provider | null => {
  try {
    const rpcUrl = RPC_URLS[chainId];
    if (!rpcUrl) {
      console.error(`No RPC URL available for chain ID ${chainId}`);
      return null;
    }
    
    return new ethers.providers.JsonRpcProvider(rpcUrl);
  } catch (error) {
    console.error(`Error creating provider for chain ${chainId}:`, error);
    return null;
  }
};

/**
 * Get a signer for transactions
 * In a React Native environment, we're using read-only providers
 * Actual transaction signing will be handled by wallets like WalletConnect
 */
export const getSigner = async (chainId: number): Promise<ethers.Signer | null> => {
  console.warn("In React Native, signers are typically handled by external wallets like WalletConnect");
  
  // For development/testing, we can return a dummy signer that will reject all transactions
  const provider = getProvider(chainId);
  if (!provider) return null;
  
  // Return the provider itself, which can be used for read operations
  // Actual transactions will need to be handled via a wallet integration
  return null;
}; 
 