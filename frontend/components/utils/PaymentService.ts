import axios from 'axios';
import { Chain } from '../ChainPicker';
import { Token } from '../TokenPicker';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Define types for our payment execution
export interface PaymentExecutionParams {
  sender: string;
  recipient: string;
  sourceChainId: number;
  sourceToken: string;
  amount: string;
  targetChainId: number;
  targetToken: string;
  targetAddress: string;
  note?: string;
  useDirectTransfer?: boolean;
  transferType?: 'fast' | 'standard';
}

export interface PaymentExecutionResult {
  success: boolean;
  transferType: 'cctp' | '1inch-fusion';
  details: any;
}

export interface PaymentPreference {
  id: string;
  name: string;
  walletAddress: string;
  chain: Chain;
  token: Token;
  isDefault: boolean;
  conditions: Array<{
    type: string;
    operator: string;
    value: number;
    token?: string;
  }>;
}

class PaymentService {
  /**
   * Execute a payment based on provided parameters
   */
  async executePayment(params: PaymentExecutionParams): Promise<PaymentExecutionResult> {
    try {
      // Determine if direct USDC transfer is possible
      const isDirectUSDCTransfer = this.isDirectUSDCTransferPossible(
        params.sourceToken,
        params.targetToken,
        params.sourceChainId,
        params.targetChainId
      );
      
      // If direct transfer is possible and not explicitly set, default to true
      if (params.useDirectTransfer === undefined && isDirectUSDCTransfer) {
        params.useDirectTransfer = true;
      }
      
      // Make the API call
      const response = await axios.post<PaymentExecutionResult>(
        `${API_URL}/payments/execute`,
        params
      );
      
      return response.data;
    } catch (error) {
      console.error('Payment execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if a direct USDC transfer is possible between chains
   */
  isDirectUSDCTransferPossible(
    sourceToken: string,
    targetToken: string,
    sourceChainId: number,
    targetChainId: number
  ): boolean {
    // These are the USDC addresses on supported chains
    const USDC_ADDRESSES: Record<number, string> = {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
      42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
      10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Optimism
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      // Testnet addresses
      11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
      43113: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
      84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
    };
    
    // Check if both tokens are USDC
    const isSourceUSDC = sourceToken.toLowerCase() === USDC_ADDRESSES[sourceChainId]?.toLowerCase();
    const isTargetUSDC = targetToken.toLowerCase() === USDC_ADDRESSES[targetChainId]?.toLowerCase();
    
    // Check if both chains are supported by Circle CCTP
    const supportedCCTPChains = [1, 137, 43114, 42161, 10, 8453, 11155111, 43113, 84532];
    const isSourceChainSupported = supportedCCTPChains.includes(sourceChainId);
    const isTargetChainSupported = supportedCCTPChains.includes(targetChainId);
    
    return isSourceUSDC && isTargetUSDC && isSourceChainSupported && isTargetChainSupported;
  }
  
  /**
   * Process payment based on recipient preferences
   */
  async processPaymentWithPreferences(
    sender: string,
    amount: string,
    sourceChainId: number, 
    sourceToken: string,
    recipient: string,
    preferences: PaymentPreference[]
  ): Promise<PaymentExecutionResult> {
    try {
      if (!preferences || preferences.length === 0) {
        throw new Error('No payment preferences available for recipient');
      }
      
      // Find the default preference or use the first one
      const defaultPreference = preferences.find(p => p.isDefault) || preferences[0];
      
      // Check if there are any condition-based preferences that match
      const matchingPreference = this.findMatchingPreference(preferences, amount, sourceToken);
      const preference = matchingPreference || defaultPreference;
      
      // Prepare payment parameters
      const paymentParams: PaymentExecutionParams = {
        sender,
        recipient,
        sourceChainId,
        sourceToken,
        amount,
        targetChainId: preference.chain.id,
        targetToken: preference.token.address,
        targetAddress: preference.walletAddress,
      };
      
      // Execute the payment
      return this.executePayment(paymentParams);
    } catch (error) {
      console.error('Error processing payment with preferences:', error);
      throw error;
    }
  }
  
  /**
   * Find a preference that matches conditions
   */
  private findMatchingPreference(
    preferences: PaymentPreference[],
    amount: string,
    sourceToken: string
  ): PaymentPreference | null {
    const numericAmount = parseFloat(amount);
    
    // Filter preferences that have conditions
    return preferences.find(preference => {
      if (!preference.conditions || preference.conditions.length === 0) {
        return false;
      }
      
      // Check each condition
      return preference.conditions.every(condition => {
        switch (condition.type) {
          case 'AMOUNT':
            switch (condition.operator) {
              case 'GT':
                return numericAmount > condition.value;
              case 'LT':
                return numericAmount < condition.value;
              case 'EQ':
                return numericAmount === condition.value;
              case 'GTE':
                return numericAmount >= condition.value;
              case 'LTE':
                return numericAmount <= condition.value;
              default:
                return false;
            }
            
          case 'TOKEN':
            return condition.token?.toLowerCase() === sourceToken.toLowerCase();
            
          default:
            return false;
        }
      });
    }) || null;
  }
}

export const paymentService = new PaymentService();
export default paymentService; 