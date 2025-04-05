import axios from 'axios';

// Define supported chains
export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', protocol: 'ethereum', network: 'mainnet' },
  { id: 8453, name: 'Base', protocol: 'base', network: 'mainnet' },
  { id: 137, name: 'Polygon', protocol: 'polygon', network: 'mainnet' },
  { id: 56, name: 'BSC', protocol: 'bsc', network: 'mainnet' },
  { id: 42161, name: 'Arbitrum', protocol: 'arbitrum', network: 'mainnet' },
];

// Nodit API base URL - UPDATED!
const NODIT_API_URL = 'https://web3.nodit.io';

// API key (should be stored securely in production)
const NODIT_API_KEY = 'nEJFUENxX3A5-JnSWJiEfgOCfeTADsMy';

// Create axios instance with default headers
const noditClient = axios.create({
  baseURL: NODIT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': NODIT_API_KEY
  }
});

// Helper to get protocol and network from chainId
const getChainDetails = (chainId: number) => {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return { protocol: chain.protocol, network: chain.network };
};

class NoditService {
  /**
   * Get the ENS name for an Ethereum address
   */
  static async getEnsNameByAddress(address: string) {
    try {
      // ENS is only on Ethereum
      const response = await noditClient.post('/v1/ethereum/mainnet/ens/getENSByAccount', {
        accountAddress: address
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ENS name:', error);
      throw error;
    }
  }

  /**
   * Get an Ethereum address for an ENS name
   */
  static async getAddressByEnsName(ensName: string) {
    try {
      // ENS is only on Ethereum
      const response = await noditClient.post('/v1/ethereum/mainnet/ens/getAccountByENS', {
        ensName: ensName
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching address from ENS name:', error);
      throw error;
    }
  }

  /**
   * Get native token balance for an address
   */
  static async getNativeBalance(address: string, chainId: number) {
    try {
      const { protocol, network } = getChainDetails(chainId);
      
      const response = await noditClient.post(
        `/v1/${protocol}/${network}/native/getNativeBalanceByAccount`, 
        { accountAddress: address }
      );
      
      return {
        balance: response.data.balance || '0',
        balanceUSD: response.data.balanceUSD || '0'
      };
    } catch (error) {
      console.error(`Error fetching native balance for chain ${chainId}:`, error);
      return { balance: '0', balanceUSD: '0' };
    }
  }

  /**
   * Get ERC20 token balances for an address
   */
  static async getTokenBalances(address: string, chainId: number) {
    try {
      const { protocol, network } = getChainDetails(chainId);
      
      const response = await noditClient.post(
        `/v1/${protocol}/${network}/token/getTokensOwnedByAccount`, 
        { 
          accountAddress: address,
          withCount: false
        }
      );
      
      return response.data.items.map((item: any) => ({
        address: item.contract?.address || '',
        name: item.contract?.name || 'Unknown Token',
        symbol: item.contract?.symbol || '???',
        decimals: item.contract?.decimals || 18,
        balance: item.balance || '0',
        balanceUSD: item.balanceUSD || '0',
        logo: item.contract?.logo || ''
      })) || [];
    } catch (error) {
      console.error(`Error fetching token balances for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get NFTs for an address
   */
  static async getNFTs(address: string, chainId: number) {
    try {
      const { protocol, network } = getChainDetails(chainId);
      
      const response = await noditClient.post(
        `/v1/${protocol}/${network}/nft/getNFTsOwnedByAccount`, 
        { 
          accountAddress: address,
          withCount: false
        }
      );
      
      return response.data.items.map((item: any) => ({
        address: item.contract?.address || '',
        name: item.contract?.name || 'Unknown NFT',
        tokenId: item.tokenId || '',
        tokenType: item.tokenType || 'ERC721',
        metadata: item.metadata || {},
        imageUrl: item.metadata?.image || ''
      })) || [];
    } catch (error) {
      console.error(`Error fetching NFTs for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get account statistics
   */
  static async getAccountStats(address: string, chainId: number) {
    try {
      const { protocol, network } = getChainDetails(chainId);
      
      const response = await noditClient.post(
        `/v1/${protocol}/${network}/stats/getAccountStats`, 
        { address }
      );
      
      return {
        transactionCounts: {
          external: response.data.transactionCounts?.external || 0,
          internal: response.data.transactionCounts?.internal || 0
        },
        transferCounts: {
          tokens: response.data.transferCounts?.tokens || 0,
          nfts: response.data.transferCounts?.nfts || 0
        },
        assets: {
          tokens: response.data.assets?.tokens || 0,
          nfts: response.data.assets?.nfts || 0,
          nftContracts: response.data.assets?.nftContracts || 0
        }
      };
    } catch (error) {
      console.error(`Error fetching account stats for chain ${chainId}:`, error);
      return {
        transactionCounts: { external: 0, internal: 0 },
        transferCounts: { tokens: 0, nfts: 0 },
        assets: { tokens: 0, nfts: 0, nftContracts: 0 }
      };
    }
  }

  /**
   * Get transactions for an address
   */
  static async getTransactions(address: string, chainId: number, limit: number = 10) {
    try {
      const { protocol, network } = getChainDetails(chainId);
      
      const response = await noditClient.post(
        `/v1/${protocol}/${network}/blockchain/getTransactionsByAccount`, 
        { 
          accountAddress: address,
          rpp: limit,
          withCount: false,
          withLogs: false,
          withDecode: true
        }
      );
      
      return response.data.items.map((tx: any) => ({
        hash: tx.transactionHash || '',
        blockNumber: tx.blockNumber || 0,
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value || '0',
        timestamp: tx.timeStamp || 0,
        gasUsed: tx.gasUsed || '0',
        gasPrice: tx.gasPrice || '0',
        status: tx.status === '1' ? 'Success' : 'Failed',
        contractAddress: tx.contractAddress || null,
        functionName: tx.decodedInput?.name || ''
      })) || [];
    } catch (error) {
      console.error(`Error fetching transactions for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get multi-chain portfolio for an address
   * This combines native, token, and NFT data for all supported chains
   */
  static async getMultiChainPortfolio(address: string) {
    try {
      const portfolioData = await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          try {
            // Get native balance
            const nativeBalanceData = await this.getNativeBalance(address, chain.id);
            
            // Get token balances
            const tokens = await this.getTokenBalances(address, chain.id);
            
            // Get NFTs
            const nfts = await this.getNFTs(address, chain.id);
            
            // Get account stats
            const stats = await this.getAccountStats(address, chain.id);
            
            return {
              chainId: chain.id,
              chainName: chain.name,
              nativeBalance: {
                balance: nativeBalanceData.balance || '0',
                balanceUSD: nativeBalanceData.balanceUSD || '0'
              },
              tokens,
              nfts,
              stats
            };
          } catch (error) {
            console.error(`Error fetching data for chain ${chain.name}:`, error);
            return {
              chainId: chain.id,
              chainName: chain.name,
              nativeBalance: {
                balance: '0',
                balanceUSD: '0'
              },
              tokens: [],
              nfts: [],
              stats: {
                transactionCounts: { external: 0, internal: 0 },
                transferCounts: { tokens: 0, nfts: 0 },
                assets: { tokens: 0, nfts: 0, nftContracts: 0 }
              }
            };
          }
        })
      );
      
      return portfolioData;
    } catch (error) {
      console.error('Error fetching multi-chain portfolio:', error);
      throw error;
    }
  }
}

export default NoditService; 
 