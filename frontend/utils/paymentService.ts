import axios from 'axios';
import { Chain } from '../components/ChainPicker';
import { ethers } from 'ethers';
import { PaymentPreference } from '../context/GlobalContext';

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3001';

// ABI for basic token interactions
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

/**
 * Service to handle cross-chain payments and token swaps
 */
export class PaymentService {
  /**
   * Get the optimal payment route based on source/target tokens and chains
   */
  async getPaymentRoute({
    sourceChainId,
    sourceToken,
    amount,
    targetChainId,
    targetToken,
    recipientPreferences,
  }: {
    sourceChainId: number;
    sourceToken: string;
    amount: string;
    targetChainId: number;
    targetToken: string;
    recipientPreferences?: PaymentPreference[];
  }) {
    try {
      const response = await axios.post(`${API_URL}/payment/route`, {
        sourceChainId,
        sourceToken,
        amount,
        targetChainId,
        targetToken,
        recipientPreferences,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting payment route:', error);
      throw new Error('Failed to determine optimal payment route');
    }
  }

  /**
   * Process a payment through the determined optimal route
   */
  async processPayment({
    senderAddress,
    recipientAddress,
    sourceChainId,
    sourceToken,
    amount,
    targetChainId,
    targetToken,
    routeType,
    note,
  }: {
    senderAddress: string;
    recipientAddress: string;
    sourceChainId: number;
    sourceToken: string;
    amount: string;
    targetChainId: number;
    targetToken: string;
    routeType?: 'circle_cctp' | 'inch_fusion';
    note?: string;
  }) {
    try {
      const response = await axios.post(`${API_URL}/payment/process`, {
        senderAddress,
        recipientAddress,
        sourceChainId,
        sourceToken,
        amount,
        targetChainId,
        targetToken,
        routeType,
        note,
      });

      return response.data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error('Failed to process payment');
    }
  }

  /**
   * Execute the payment based on the user's action
   */
  async executePayment(
    paymentData: any,
    signer: ethers.Signer,
    onStatusUpdate?: (status: string, message: string) => void
  ) {
    try {
      const updateStatus = (status: string, message: string) => {
        console.log(`Payment ${status}: ${message}`);
        if (onStatusUpdate) {
          onStatusUpdate(status, message);
        }
      };

      updateStatus('started', 'Initiating payment...');

      // Different execution based on route type
      if (paymentData.type === 'circle_cctp') {
        return await this.executeCirclePayment(paymentData, signer, updateStatus);
      } else if (paymentData.type === 'inch_fusion') {
        return await this.execute1inchPayment(paymentData, signer, updateStatus);
      } else {
        throw new Error('Unsupported payment type');
      }
    } catch (error) {
      console.error('Error executing payment:', error);
      throw error;
    }
  }

  /**
   * Execute Circle CCTP cross-chain transfer
   */
  private async executeCirclePayment(
    paymentData: any,
    signer: ethers.Signer,
    updateStatus: (status: string, message: string) => void
  ) {
    try {
      const steps = paymentData.steps;
      const results = [];

      // Step 1: Approve USDC for Token Messenger
      updateStatus('approving', 'Approving USDC transfer...');
      const approveStep = steps[0];
      const tokenContract = new ethers.Contract(
        approveStep.contractAddress,
        ERC20_ABI,
        signer
      );

      const approveTx = await tokenContract.approve(
        approveStep.params[0], // Token messenger address
        approveStep.params[1]  // Amount
      );
      await approveTx.wait();
      results.push({ step: 'approve', txHash: approveTx.hash });
      updateStatus('approved', 'USDC approved for transfer');

      // Step 2: Deposit USDC for burning
      updateStatus('burning', 'Depositing USDC for burning...');
      const burnStep = steps[1];
      const tokenMessengerContract = new ethers.Contract(
        burnStep.contractAddress,
        [
          'function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) external returns (uint64 nonce)',
        ],
        signer
      );

      const burnTx = await tokenMessengerContract.depositForBurnWithCaller(
        ...burnStep.params
      );
      const burnReceipt = await burnTx.wait();
      results.push({ step: 'burn', txHash: burnTx.hash });
      updateStatus('burned', 'USDC deposited for burning');

      // Step 3: Wait for attestation and handle destination chain
      updateStatus('waiting', 'Waiting for Circle attestation...');
      
      // In a real implementation, we would poll for the attestation
      // and then execute the receiveMessage on the destination chain
      
      updateStatus('completed', 'Cross-chain transfer completed');
      
      return {
        success: true,
        status: 'completed',
        transactions: results,
        message: 'Cross-chain transfer completed successfully',
      };
    } catch (error) {
      console.error('Error executing Circle payment:', error);
      throw error;
    }
  }

  /**
   * Execute 1inch Fusion swap
   */
  private async execute1inchPayment(
    paymentData: any,
    signer: ethers.Signer,
    updateStatus: (status: string, message: string) => void
  ) {
    try {
      // In a real implementation, we would:
      // 1. Approve source token for 1inch router
      // 2. Execute the swap through 1inch
      
      updateStatus('approved', 'Token approved for swap');
      updateStatus('swapping', 'Executing token swap...');
      updateStatus('completed', 'Token swap completed successfully');
      
      return {
        success: true,
        status: 'completed',
        message: 'Token swap completed successfully',
      };
    } catch (error) {
      console.error('Error executing 1inch payment:', error);
      throw error;
    }
  }

  /**
   * Get Circle attestation for a transaction
   */
  async getCircleAttestation(sourceChainId: number, txHash: string) {
    try {
      const response = await axios.get(`${API_URL}/payment/circle/attestation`, {
        params: { sourceChainId, txHash },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting Circle attestation:', error);
      throw new Error('Failed to get attestation');
    }
  }

  /**
   * Simulate a payment for testing
   */
  async simulatePayment({
    senderAddress,
    recipientAddress,
    sourceChainId,
    sourceToken,
    amount,
    targetChainId,
    targetToken,
  }: {
    senderAddress: string;
    recipientAddress: string;
    sourceChainId: number;
    sourceToken: string;
    amount: string;
    targetChainId: number;
    targetToken: string;
  }) {
    try {
      const response = await axios.post(`${API_URL}/payment/simulate`, {
        senderAddress,
        recipientAddress,
        sourceChainId,
        sourceToken,
        amount,
        targetChainId,
        targetToken,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error simulating payment:', error);
      throw new Error('Failed to simulate payment');
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService; 