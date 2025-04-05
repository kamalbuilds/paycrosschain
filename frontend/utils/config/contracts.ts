/**
 * Contract addresses by network
 */
interface ContractAddresses {
  [key: string]: {
    [networkId: string]: string;
  };
}

// Contract addresses for different networks
// This would be populated with actual contract addresses after deployment
const CONTRACT_ADDRESSES: ContractAddresses = {
  PaymentPreferences: {
    '1': '0x0000000000000000000000000000000000000000', // Ethereum mainnet
    '137': '0x0000000000000000000000000000000000000000', // Polygon
    '56': '0x0000000000000000000000000000000000000000', // BSC
    '43114': '0x0000000000000000000000000000000000000000', // Avalanche
    '8453': '0x0000000000000000000000000000000000000000', // Base
    '42161': '0x0000000000000000000000000000000000000000', // Arbitrum
    // Add testnet addresses as needed
    '5': '0x0000000000000000000000000000000000000000', // Goerli
    '80001': '0x0000000000000000000000000000000000000000', // Mumbai
  },
  CrossChainPayment: {
    '1': '0x0000000000000000000000000000000000000000',
    '137': '0x0000000000000000000000000000000000000000',
    // Add other networks as needed
  },
  InvestmentVaults: {
    '1': '0x0000000000000000000000000000000000000000',
    '137': '0x0000000000000000000000000000000000000000',
    // Add other networks as needed
  }
};

/**
 * Current network ID (defaults to Ethereum mainnet)
 */
let currentNetworkId = '1';

/**
 * Set the current network ID
 * @param networkId The network ID to set
 */
export const setCurrentNetwork = (networkId: string): void => {
  currentNetworkId = networkId;
};

/**
 * Get the current network ID
 * @returns The current network ID
 */
export const getCurrentNetwork = (): string => {
  return currentNetworkId;
};

/**
 * Get a contract address for the current network
 * @param contractName The name of the contract
 * @returns The contract address for the current network
 */
export const getContractAddress = (contractName: string): string => {
  const addresses = CONTRACT_ADDRESSES[contractName];
  
  if (!addresses) {
    throw new Error(`Contract ${contractName} not found in configuration`);
  }
  
  const address = addresses[currentNetworkId];
  
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on network ${currentNetworkId}`);
  }
  
  return address;
};

/**
 * Get a contract address for a specific network
 * @param contractName The name of the contract
 * @param networkId The network ID
 * @returns The contract address for the specified network
 */
export const getContractAddressForNetwork = (contractName: string, networkId: string): string => {
  const addresses = CONTRACT_ADDRESSES[contractName];
  
  if (!addresses) {
    throw new Error(`Contract ${contractName} not found in configuration`);
  }
  
  const address = addresses[networkId];
  
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on network ${networkId}`);
  }
  
  return address;
}; 