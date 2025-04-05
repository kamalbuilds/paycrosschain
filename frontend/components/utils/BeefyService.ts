import axios from 'axios';
import { ethers } from 'ethers';
import { getProvider, getSigner } from './web3Providers';

// Beefy Finance API endpoints
const BEEFY_API_URL = 'https://api.beefy.finance';

// ABI for Beefy Vault interactions
const BEEFY_VAULT_ABI = [
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _shares) external',
  'function getPricePerFullShare() external view returns (uint256)',
  'function balance() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function want() external view returns (address)',
  'function strategy() external view returns (address)',
  'function balanceOf(address) external view returns (uint256)'
];

// ABI for ERC20 token interactions
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

// Chain ID to name mapping
const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  250: 'fantom',
  43114: 'avalanche',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base'
};

// Types for API responses
export interface BeefyVault {
  id: string;
  name: string;
  chain: string;
  chainId: number;
  earnedToken: string;
  earnedTokenAddress: string;
  earnContractAddress: string;
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenProviderId: string;
  tokenIcon: string;
  pricePerFullShare: string;
  tvl: number;
  oracle: string;
  oracleId: string;
  apy: number;
  strategy: string;
  assets: string[];
  platform: string;
  depositFee: number;
  withdrawalFee: number;
  status: string;
  createdAt: number;
  network: string;
  description?: string;
  risks?: string[];
  isActive?: boolean;
  strategyTypeId?: string;
  chainIcon?: string;
  chainName?: string;
}

export interface BeefyAPY {
  [vaultId: string]: number;
}

export interface BeefyTVL {
  [vaultId: string]: number;
}

export interface BeefyLPPrices {
  [lpId: string]: number;
}

export interface BeefyLPBreakdown {
  price: number;
  tokens: string[];
  balances: string[];
  totalSupply: string;
}

export interface BeefyFees {
  performance: {
    total: number;
    strategist: number;
    call: number;
    treasury: number;
    stakers: number;
  };
  withdraw: number;
  lastUpdated: number;
}

export interface UserInvestment {
  id: string;
  vaultId: string;
  vaultAddress: string;
  tokenAddress: string;
  amount: string;
  shares: string;
  depositTimestamp: number;
  chain: string;
  chainId: number;
  userAddress: string;
}

/**
 * Service to interact with Beefy Finance API and smart contracts
 */
class BeefyService {
  private vaultsCache: BeefyVault[] = [];
  private apyCache: BeefyAPY = {};
  private tvlCache: BeefyTVL = {};
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all vaults from Beefy API
   */
  async getAllVaults(): Promise<BeefyVault[]> {
    try {
      if (this.isCacheValid() && this.vaultsCache.length > 0) {
        console.log('Using cached vaults data');
        return this.vaultsCache;
      }

      console.log('Fetching vaults data from Beefy API');
      
      // Fetch vaults, APY, and TVL data concurrently
      const [vaultsResponse, apyResponse, tvlResponse] = await Promise.all([
        axios.get<BeefyVault[]>(`${BEEFY_API_URL}/vaults`),
        axios.get<BeefyAPY>(`${BEEFY_API_URL}/apy`),
        axios.get<BeefyTVL>(`${BEEFY_API_URL}/tvl`)
      ]);

      console.log(vaultsResponse.data,"vaults res");

      // Update cache
      this.apyCache = apyResponse.data;
      this.tvlCache = tvlResponse.data;
      
      // Process and enhance vault data
      const vaults = vaultsResponse.data.map(vault => {
        // Get chainId if it's missing by looking up the reverse mapping
        let chainId = vault.chainId;
        if (!chainId) {
          // Find chainId from the chain name
          for (const [id, name] of Object.entries(CHAIN_ID_TO_NAME)) {
            if (name.toLowerCase() === vault.chain.toLowerCase()) {
              chainId = parseInt(id);
              break;
            }
          }
        }
        
        // Add APY and TVL from respective endpoints
        const enhancedVault = {
          ...vault,
          chainId: chainId, // Make sure chainId is set
          apy: this.apyCache[vault.id] || 0,
          tvl: this.tvlCache[vault.id] || 0,
          chainName: this.getChainName(chainId),
          chainIcon: this.getChainIconUrl(vault.chain)
        };
        return enhancedVault;
      });

      // Filter out EOL (retired) vaults
      const activeVaults = vaults.filter(vault => vault.status !== 'eol');

      // Save to cache and timestamp
      this.vaultsCache = activeVaults;
      this.lastCacheUpdate = Date.now();

      return activeVaults;
    } catch (error) {
      console.error('Error fetching Beefy vaults:', error);
      if (this.vaultsCache.length > 0) {
        return this.vaultsCache; // Return cached data on error
      }
      throw error;
    }
  }

  /**
   * Fetch vaults for a specific chain
   */
  async getVaultsByChain(chainId: number): Promise<BeefyVault[]> {
    const allVaults = await this.getAllVaults();
    const chainName = CHAIN_ID_TO_NAME[chainId] || '';
    console.log(chainName, "chain name");

    // Filter vaults by chain name (lowercase) instead of chainId
    const findVaults = allVaults.filter(vault => 
      vault.chain.toLowerCase() === chainName.toLowerCase() && 
      vault.status === 'active'
    );

    console.log(findVaults, "find vaults");
    return findVaults;
  }

  /**
   * Get details for a specific vault
   */
  async getVaultDetails(vaultId: string, chainId: number): Promise<BeefyVault | null> {
    const allVaults = await this.getAllVaults();
    const chainName = CHAIN_ID_TO_NAME[chainId] || '';
    return allVaults.find(
      vault => vault.chain === chainName && vault.id === vaultId
    ) || null;
  }

  /**
   * Get details about a liquidity pool
   */
  async getLpBreakdown(lpId: string): Promise<BeefyLPBreakdown | null> {
    try {
      const response = await axios.get<Record<string, BeefyLPBreakdown>>(`${BEEFY_API_URL}/lps/breakdown`);
      return response.data[lpId] || null;
    } catch (error) {
      console.error(`Error fetching LP breakdown for ${lpId}:`, error);
      return null;
    }
  }

  /**
   * Get fees for a vault
   */
  async getVaultFees(vaultId: string, chainId: number): Promise<BeefyFees | null> {
    try {
      const chainName = CHAIN_ID_TO_NAME[chainId] || '';
      const response = await axios.get<Record<string, BeefyFees>>(`${BEEFY_API_URL}/fees`);
      const key = `${chainName}-${vaultId}`;
      return response.data[key] || null;
    } catch (error) {
      console.error(`Error fetching fees for ${vaultId}:`, error);
      return null;
    }
  }

  /**
   * Invest in a Beefy vault
   */
  async invest(
    vaultAddress: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
    userAddress: string
  ): Promise<{ txHash: string; shares: string }> {
    try {
      // Get signer for transaction
      const signer = await getSigner(chainId);
      if (!signer) throw new Error('Wallet not connected');
      
      // Set up contracts
      const vault = new ethers.Contract(vaultAddress, BEEFY_VAULT_ABI, signer);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Get token decimals and symbol
      const decimals = await token.decimals();
      const symbol = await token.symbol();
      
      console.log(`Investing ${amount} ${symbol} into vault at ${vaultAddress}`);
      
      // Convert amount to correct decimals
      const amountBN = ethers.utils.parseUnits(amount, decimals);
      
      // Check user balance
      const balance = await token.balanceOf(userAddress);
      if (balance.lt(amountBN)) {
        throw new Error(`Insufficient ${symbol} balance`);
      }
      
      // Check and set allowance if needed
      const allowance = await token.allowance(userAddress, vaultAddress);
      if (allowance.lt(amountBN)) {
        console.log(`Approving ${symbol} for vault...`);
        const approveTx = await token.approve(vaultAddress, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log('Approval confirmed');
      }
      
      // Get initial shares balance for comparison
      const initialShares = await vault.balanceOf(userAddress);
      
      // Execute deposit
      console.log(`Depositing ${amount} ${symbol}...`);
      const tx = await vault.deposit(amountBN);
      const receipt = await tx.wait();
      console.log('Deposit confirmed');
      
      // Get new shares balance and calculate received shares
      const finalShares = await vault.balanceOf(userAddress);
      const sharesReceived = finalShares.sub(initialShares);
      
      return {
        txHash: receipt.transactionHash,
        shares: ethers.utils.formatUnits(sharesReceived, decimals)
      };
    } catch (error) {
      console.error('Error investing in Beefy vault:', error);
      throw error;
    }
  }

  /**
   * Withdraw from a Beefy vault
   */
  async withdraw(
    vaultAddress: string,
    shareAmount: string,
    sharePercentage: number, // 0-100
    chainId: number,
    userAddress: string
  ): Promise<{ txHash: string; amountReceived: string }> {
    try {
      if (sharePercentage <= 0 || sharePercentage > 100) {
        throw new Error('Share percentage must be between 1 and 100');
      }
      
      // Get signer for transaction
      const signer = await getSigner(chainId);
      if (!signer) throw new Error('Wallet not connected');
      
      // Set up vault contract
      const vault = new ethers.Contract(vaultAddress, BEEFY_VAULT_ABI, signer);
      
      // Get the amount of shares the user has
      const userShares = await vault.balanceOf(userAddress);
      
      // Calculate how many shares to withdraw based on percentage
      let sharesToWithdraw;
      if (sharePercentage === 100) {
        sharesToWithdraw = userShares;
      } else {
        sharesToWithdraw = userShares.mul(Math.floor(sharePercentage)).div(100);
      }
      
      if (userShares.isZero() || sharesToWithdraw.isZero()) {
        throw new Error('No shares to withdraw');
      }
      
      // Get the token that will be received (want token)
      const wantTokenAddress = await vault.want();
      const wantToken = new ethers.Contract(wantTokenAddress, ERC20_ABI, signer);
      const wantDecimals = await wantToken.decimals();
      const wantSymbol = await wantToken.symbol();
      
      // Get initial token balance for comparison
      const initialBalance = await wantToken.balanceOf(userAddress);
      
      // Execute withdraw
      console.log(`Withdrawing ${ethers.utils.formatUnits(sharesToWithdraw, wantDecimals)} shares (${sharePercentage}%)...`);
      const tx = await vault.withdraw(sharesToWithdraw);
      const receipt = await tx.wait();
      console.log('Withdrawal confirmed');
      
      // Get new token balance and calculate received amount
      const finalBalance = await wantToken.balanceOf(userAddress);
      const amountReceived = finalBalance.sub(initialBalance);
      
      return {
        txHash: receipt.transactionHash,
        amountReceived: ethers.utils.formatUnits(amountReceived, wantDecimals)
      };
    } catch (error) {
      console.error('Error withdrawing from Beefy vault:', error);
      throw error;
    }
  }

  /**
   * Calculate current value of a vault investment
   */
  async getInvestmentValue(
    vaultAddress: string,
    shares: string,
    chainId: number
  ): Promise<{ currentValue: string; profitPercentage: number }> {
    try {
      // Get provider for chain
      const provider = getProvider(chainId);
      if (!provider) throw new Error('Provider not available for this chain');
      
      // Set up vault contract
      const vault = new ethers.Contract(vaultAddress, BEEFY_VAULT_ABI, provider);
      
      // Get price per share
      const pricePerShare = await vault.getPricePerFullShare();
      
      // Get the token that will be received (want token)
      const wantTokenAddress = await vault.want();
      const wantToken = new ethers.Contract(wantTokenAddress, ERC20_ABI, provider);
      const wantDecimals = await wantToken.decimals();
      
      // Parse shares to BigNumber using correct decimals
      const sharesBN = ethers.utils.parseUnits(shares, wantDecimals);
      
      // Calculate current value in want token
      const currentValueBN = sharesBN.mul(pricePerShare).div(ethers.utils.parseUnits('1', 18));
      const currentValue = ethers.utils.formatUnits(currentValueBN, wantDecimals);
      
      // Calculate profit percentage (assuming shares * 1 was the initial investment)
      // In a real app, you would store and use the actual initial investment amount
      const initialValue = shares; // Simplified
      const profitPercentage = ((parseFloat(currentValue) - parseFloat(initialValue)) / parseFloat(initialValue)) * 100;
      
      return {
        currentValue,
        profitPercentage
      };
    } catch (error) {
      console.error('Error calculating investment value:', error);
      throw error;
    }
  }

  /**
   * Get user's investments in Beefy vaults
   */
  async getUserInvestments(userAddress: string): Promise<UserInvestment[]> {
    try {
      // In a production app, you would have a backend that stores user investments
      // or use an indexer like The Graph to query on-chain data
      // Here we're simulating with a simple API call
      
      // Example API call to get user investments
      // const response = await axios.get(`${API_URL}/users/${userAddress}/investments`);
      // return response.data;
      
      // For now, simulate this with saved data in local storage or a mock API
      // In the real app, replace with actual API call or blockchain query
      return [];
    } catch (error) {
      console.error('Error fetching user investments:', error);
      return [];
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }

  /**
   * Get the name of a chain from its ID
   */
  private getChainName(chainId: number): string {
    if (chainId === undefined || chainId === null) {
      return 'Unknown Chain';
    }
    
    const chainMap: Record<number, string> = {
      1: 'Ethereum',
      56: 'BNB Chain',
      137: 'Polygon',
      250: 'Fantom',
      43114: 'Avalanche',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base'
    };
    
    return chainMap[chainId] || `Chain ${chainId}`;
  }

  /**
   * Get chain icon URL
   */
  private getChainIconUrl(chain: string): string {
    const iconMap: Record<string, string> = {
      ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      bsc: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
      fantom: 'https://cryptologos.cc/logos/fantom-ftm-logo.png',
      avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
      arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
      optimism: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
      base: 'https://cryptologos.cc/logos/base-logo.png',
    };
    
    return iconMap[chain.toLowerCase()] || '';
  }
}

export const beefyService = new BeefyService();
export default beefyService; 