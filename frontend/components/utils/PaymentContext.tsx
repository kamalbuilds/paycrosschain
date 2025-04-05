import React, { createContext, useContext, useState, ReactNode } from 'react';
import { paymentService, PaymentExecutionResult } from './PaymentService';

// Import types directly to avoid conflicts
type ChainType = {
  id: number;
  name: string;
  symbol: string;
  icon: string;
};

type TokenType = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance?: string;
  icon?: string;
};

interface PaymentContextType {
  paymentInProgress: boolean;
  paymentHistory: PaymentExecutionResult[];
  lastPaymentResult: PaymentExecutionResult | null;
  executePayment: (params: {
    sender: string;
    recipient: string;
    sourceChain: ChainType;
    sourceToken: TokenType;
    amount: string;
    targetChain: ChainType;
    targetToken: TokenType;
    note?: string;
    useDirectTransfer?: boolean;
    transferType?: 'fast' | 'standard';
  }) => Promise<PaymentExecutionResult>;
  clearLastPaymentResult: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentExecutionResult[]>([]);
  const [lastPaymentResult, setLastPaymentResult] = useState<PaymentExecutionResult | null>(null);

  const executePayment = async ({
    sender,
    recipient,
    sourceChain,
    sourceToken,
    amount,
    targetChain,
    targetToken,
    note,
    useDirectTransfer,
    transferType = 'standard',
  }: {
    sender: string;
    recipient: string;
    sourceChain: ChainType;
    sourceToken: TokenType;
    amount: string;
    targetChain: ChainType;
    targetToken: TokenType;
    note?: string;
    useDirectTransfer?: boolean;
    transferType?: 'fast' | 'standard';
  }): Promise<PaymentExecutionResult> => {
    try {
      setPaymentInProgress(true);
      
      const result = await paymentService.executePayment({
        sender,
        recipient,
        sourceChainId: sourceChain.id,
        sourceToken: sourceToken.address,
        amount,
        targetChainId: targetChain.id,
        targetToken: targetToken.address,
        targetAddress: recipient,
        note,
        useDirectTransfer,
        transferType,
      });
      
      // Save result to history and set as last result
      setPaymentHistory((prevHistory) => [...prevHistory, result]);
      setLastPaymentResult(result);
      
      return result;
    } catch (error) {
      console.error('Payment execution failed:', error);
      throw error;
    } finally {
      setPaymentInProgress(false);
    }
  };

  const clearLastPaymentResult = () => {
    setLastPaymentResult(null);
  };

  return (
    <PaymentContext.Provider
      value={{
        paymentInProgress,
        paymentHistory,
        lastPaymentResult,
        executePayment,
        clearLastPaymentResult,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};