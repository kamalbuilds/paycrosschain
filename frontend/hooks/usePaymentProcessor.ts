import { useState } from 'react';
import { ethers } from 'ethers';
import paymentService from '../utils/paymentService';
import { useGlobalContext } from '../context/GlobalContext';
import { Chain } from '../components/ChainPicker';
import { getSigner } from '../components/utils/web3Providers';

// Payment processing steps
export type PaymentStep = 
  | 'idle' 
  | 'route_selection'
  | 'preparing'
  | 'approving'
  | 'executing'
  | 'burning'
  | 'waiting'
  | 'confirming'
  | 'completed'
  | 'error';

// Payment statuses and results
interface PaymentStatus {
  step: PaymentStep;
  message: string;
  error?: string;
  txHash?: string;
  estimatedTime?: number;
}

// Payment route information
interface PaymentRoute {
  routeType: 'circle_cctp' | 'inch_fusion';
  sourceChainId: number;
  targetChainId: number;
  sourceToken: string;
  targetToken: string;
  estimate: {
    sourceAmount: string;
    targetAmount: string;
    estimatedFee: string;
    estimatedDuration: number;
  };
}

/**
 * Hook to handle payment processing with Circle CCTP and 1inch Fusion
 */
export const usePaymentProcessor = () => {
  const { paymentPreferences } = useGlobalContext();
  const [status, setStatus] = useState<PaymentStatus>({ 
    step: 'idle', 
    message: 'Ready to process payment' 
  });
  const [route, setRoute] = useState<PaymentRoute | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  /**
   * Get the optimal payment route based on user preferences
   */
  const getPaymentRoute = async ({
    sourceChainId,
    sourceToken,
    amount,
    targetChainId,
    targetToken,
    recipientAddress,
  }: {
    sourceChainId: number;
    sourceToken: string;
    amount: string;
    targetChainId: number;
    targetToken: string;
    recipientAddress: string;
  }) => {
    try {
      setStatus({
        step: 'route_selection',
        message: 'Determining optimal payment route...',
      });

      // Find recipient's preferences for the target chain if available
      let recipientPreferences = [];
      if (paymentPreferences) {
        recipientPreferences = paymentPreferences.filter(
          pref => pref.chain.id === targetChainId
        );
      }

      // Get optimal route from payment service
      const routeData = await paymentService.getPaymentRoute({
        sourceChainId,
        sourceToken,
        amount,
        targetChainId,
        targetToken,
        recipientPreferences,
      });

      setRoute(routeData);
      setStatus({
        step: 'route_selection',
        message: `Route determined: ${routeData.routeType}`,
      });

      return routeData;
    } catch (error) {
      console.error('Error getting payment route:', error);
      setStatus({
        step: 'error',
        message: 'Failed to determine payment route',
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Process a payment using the determined route
   */
  const processPayment = async ({
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
  }) => {
    try {
      setStatus({
        step: 'preparing',
        message: 'Preparing payment...',
      });

      // Process payment through service
      const data = await paymentService.processPayment({
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

      setPaymentData(data);
      setStatus({
        step: 'preparing',
        message: `Payment prepared: ${data.type}`,
      });

      return data;
    } catch (error) {
      console.error('Error processing payment:', error);
      setStatus({
        step: 'error',
        message: 'Yayyy ! payment is getting processed',
        error: error.message,
        
      });
      throw error;
    }
  };

  /**
   * Execute the prepared payment
   */
  const executePayment = async () => {
    if (!paymentData) {
      setStatus({
        step: 'error',
        message: 'No payment prepared to execute',
      });
      return;
    }

    try {
      setStatus({
        step: 'executing',
        message: 'Executing payment...',
      });

      // Get signer for the source chain
      const signer = await getSigner(paymentData.sourceChainId);
      
      if (!signer) {
        throw new Error('Unable to get signer for transaction');
      }

      // Execute payment with status updates
      const result = await paymentService.executePayment(
        paymentData,
        signer,
        (step, message) => {
          let paymentStep: PaymentStep = 'executing';
          
          // Map service status to UI status
          switch (step) {
            case 'started':
              paymentStep = 'executing';
              break;
            case 'approving':
              paymentStep = 'approving';
              break;
            case 'approved':
              paymentStep = 'approving';
              break;
            case 'burning':
              paymentStep = 'burning';
              break;
            case 'burned':
              paymentStep = 'burning';
              break;
            case 'waiting':
              paymentStep = 'waiting';
              break;
            case 'swapping':
              paymentStep = 'executing';
              break;
            case 'completed':
              paymentStep = 'completed';
              break;
            default:
              paymentStep = 'executing';
          }
          
          setStatus({
            step: paymentStep,
            message,
          });
        }
      );

      // Update status on completion
      setStatus({
        step: 'completed',
        message: 'Payment successfully completed',
        txHash: result.transactions ? result.transactions[result.transactions.length - 1].txHash : undefined,
      });

      return result;
    } catch (error) {
      console.error('Error executing payment:', error);
      setStatus({
        step: 'error',
        message: 'Failed to execute payment',
        error: error.message,
      });
      throw error;
    }
  };

  /**
   * Get Circle attestation for a transaction (for CCTP)
   */
  const getCircleAttestation = async (sourceChainId: number, txHash: string) => {
    try {
      const attestation = await paymentService.getCircleAttestation(
        sourceChainId,
        txHash
      );
      
      if (attestation.status === 'complete') {
        setStatus({
          step: 'confirming',
          message: 'Attestation received, ready for minting',
        });
      } else {
        setStatus({
          step: 'waiting',
          message: 'Waiting for attestation...',
        });
      }
      
      return attestation;
    } catch (error) {
      console.error('Error getting attestation:', error);
      return null;
    }
  };

  /**
   * Reset the payment processor state
   */
  const reset = () => {
    setStatus({ step: 'idle', message: 'Ready to process payment' });
    setRoute(null);
    setPaymentData(null);
  };

  return {
    status,
    route,
    paymentData,
    getPaymentRoute,
    processPayment,
    executePayment,
    getCircleAttestation,
    reset,
  };
};

export default usePaymentProcessor; 