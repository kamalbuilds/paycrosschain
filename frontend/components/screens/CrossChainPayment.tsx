import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import NavigationBar from '../NavigationBar';
import { useNavigation } from '@react-navigation/native';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { useAccount } from 'wagmi';
import TokenSelector from '../TokenSelector';
import ChainSelector from '../ChainSelector';
import axios from 'axios';
import { ethers } from 'ethers';
import { loadPreferencesFromIPFS } from '../../utils/ipfs/ipfsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalContext } from '../../context/GlobalContext';
import ChainPicker, { Chain } from '../ChainPicker';
import TokenPicker, { Token } from '../TokenPicker';
import { paymentService } from '../utils/PaymentService';
import { usePaymentProcessor, PaymentStep } from '../../hooks/usePaymentProcessor';
import { useCrossChainTransfer } from '../../hooks/useCrossChainTransfer';
import { encodeFunctionData } from 'viem';
import { CircleTransfer } from '../circle/CircleTransfer';
import { useInterval } from '../../hooks/useInterval';

// Add API configuration
const API_CONFIG = {
  baseURL: 'https://5a58-111-235-226-124.ngrok-free.app',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer dev-token-paycrosschain-sample',  // Add an authorization token
    'x-api-key': 'paycrosschain-dev-key'  // Add an API key 
  }
};

// Create an axios instance with the configuration
const apiClient = axios.create(API_CONFIG);

// Mock supported chains
const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { id: 56, name: 'BSC', symbol: 'BNB', icon: '🟡' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔶' },
];

// Mock tokens
const TOKENS = {
  1: [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '1.25', icon: '🔷' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '500.00', icon: '💵' },
    { symbol: 'USDT', name: 'Tether', decimals: 6, balance: '500.00', icon: '💵' },
  ],
  137: [
    { symbol: 'MATIC', name: 'Polygon', decimals: 18, balance: '1000.00', icon: '🟣' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '200.00', icon: '💵' },
    { symbol: 'USDT', name: 'Tether', decimals: 6, balance: '200.00', icon: '💵' },
  ],
  56: [
    { symbol: 'BNB', name: 'Binance Coin', decimals: 18, balance: '5.00', icon: '🟡' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '300.00', icon: '💵' },
  ],
  43114: [
    { symbol: 'AVAX', name: 'Avalanche', decimals: 18, balance: '10.00', icon: '🔺' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '150.00', icon: '💵' },
  ],
  8453: [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '0.50', icon: '🔵' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '100.00', icon: '💵' },
  ],
  42161: [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '0.75', icon: '🔶' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '250.00', icon: '💵' },
  ],
};

// Mock recent recipients
const RECENT_RECIPIENTS = [
  {
    id: '1',
    name: 'Alice',
    address: '0x4c2077e4B6A55Fbc0b41Cd67c453d81865Bd68D4',
    avatar: 'https://i.pravatar.cc/150?u=alice',
  },
  {
    id: '2',
    name: 'Bob',
    address: '0x8c2077e4B6A55Fbc0b41Cd67c453d81865Bd68E5',
    avatar: 'https://i.pravatar.cc/150?u=bob',
  },
  {
    id: '3',
    name: 'Charlie',
    address: '0x7d2077e4B6A55Fbc0b41Cd67c453d81865Bd68F6',
    avatar: 'https://i.pravatar.cc/150?u=charlie',
  },
];

// Contract details
const PREFERENCES_CONTRACT_ADDRESS = '0x95b519E695bb4644ef6Ff17F0cA0fD1AbdEaC3f8';
const PREFERENCES_CONTRACT_ABI = [
  'function getPreferencesIPFSHash(address user) external view returns (string memory, uint256)',
  'function hasPreferences(address user) external view returns (bool)'
];

// Simulated receipt view component
const PaymentReceipt = ({ 
  status, 
  txHash,
  route,
  onClose
}: { 
  status: PaymentStep; 
  txHash?: string;
  route: any;
  onClose: () => void;
}) => (
  <View style={styles.receiptContainer}>
    <View style={styles.receiptHeader}>
      <Text style={styles.receiptTitle}>
        {status === 'completed' ? 'Payment Complete' : 'Payment Processing'}
      </Text>
      <TouchableOpacity onPress={onClose}>
        <MaterialIcons name="close" size={24} color="#333" />
      </TouchableOpacity>
    </View>
    
    <View style={styles.receiptStatus}>
      {status === 'completed' ? (
        <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
      ) : (
        <ActivityIndicator size="large" color="#2F28D0" />
      )}
      
      <Text style={styles.receiptStatusText}>
        {status === 'completed' ? 'Payment has been completed' : 'Payment is being processed'}
      </Text>
    </View>
    
    {route && (
      <View style={styles.receiptDetails}>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Amount</Text>
          <Text style={styles.receiptValue}>{route.estimate.sourceAmount}</Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Fee</Text>
          <Text style={styles.receiptValue}>{route.estimate.estimatedFee}</Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Recipient Amount</Text>
          <Text style={styles.receiptValue}>{route.estimate.targetAmount}</Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Payment Type</Text>
          <Text style={styles.receiptValue}>
            {route.routeType === 'circle_cctp' ? 'Circle Cross-Chain Transfer' : '1inch Token Swap'}
          </Text>
        </View>
      </View>
    )}
    
    {txHash && (
      <View style={styles.receiptFooter}>
        <Text style={styles.receiptLabel}>Transaction Hash</Text>
        <Text style={styles.txHash} numberOfLines={1} ellipsizeMode="middle">
          {txHash}
        </Text>
      </View>
    )}
    
    <TouchableOpacity 
      style={styles.receiptButton}
      onPress={onClose}
    >
      <Text style={styles.receiptButtonText}>Close</Text>
    </TouchableOpacity>
  </View>
);

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to retry API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  backoffMs = 1000,
  backoffFactor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    const isRateLimitError = 
      error?.response?.status === 429 || 
      error?.message?.includes('limit of requests') ||
      error?.message?.includes('Too Many Requests');
    
    if (isRateLimitError && retries > 0) {
      console.log(`Rate limit hit, retrying after ${backoffMs}ms. Retries left: ${retries}`);
      // Wait with exponential backoff
      await delay(backoffMs);
      // Retry with increased backoff
      return retryWithBackoff(fn, retries - 1, backoffMs * backoffFactor, backoffFactor);
    }
    
    // If not a rate limit error or no retries left, throw the error
    throw error;
  }
}

// Before UI state declarations, add a type for payment status
type PaymentStatus = 'idle' | 'preparing' | 'signing' | 'executing' | 'completed' | 'error';

// Define the order status type
type InchOrderStatus = 'pending' | 'preparing' | 'ready' | 'executed' | 'failed' | 'cancelled';

// After the imports, add this helper function for polling
const MAX_POLLING_ATTEMPTS = 30; // 5 minutes (30 * 10 seconds)
const POLLING_INTERVAL = 10000; // 10 seconds

// Helper function to poll order status with retry and backoff
const pollOrderStatus = async (
  orderHash: string, 
  apiClient: any, 
  onSuccess: (data: any) => void,
  onFailure: (error: any) => void,
  attempts = 0
) => {
  if (attempts >= MAX_POLLING_ATTEMPTS) {
    console.log("[DEBUG] Max polling attempts reached - giving up");
    onFailure(new Error("Max polling attempts reached"));
    return;
  }

  try {
    console.log(`[DEBUG] Polling for order status (attempt ${attempts + 1}/${MAX_POLLING_ATTEMPTS})...`);
    const response = await apiClient.get(`/payment/inch/status?orderHash=${orderHash}`);
    
    console.log(`[DEBUG] Order status response:`, JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.status) {
      if (response.data.status === 'executed') {
        console.log(`[DEBUG] Order executed successfully!`);
        onSuccess(response.data);
        return;
      } else if (response.data.status === 'failed' || response.data.status === 'cancelled') {
        console.log(`[DEBUG] Order ${response.data.status}`);
        onFailure(new Error(`Order ${response.data.status}`));
        return;
      }
    }
    
    // Continue polling
    setTimeout(() => {
      pollOrderStatus(orderHash, apiClient, onSuccess, onFailure, attempts + 1);
    }, POLLING_INTERVAL);
  } catch (error) {
    console.error(`[DEBUG] Error polling for order status:`, error);
    
    // Handle transient errors by continuing to poll
    setTimeout(() => {
      pollOrderStatus(orderHash, apiClient, onSuccess, onFailure, attempts + 1);
    }, POLLING_INTERVAL);
  }
};

const CrossChainPayment = ({ navigation, route: navRoute }: any) => {
  const { supportedChains, tokensForChain } = useGlobalContext();
  
  // Initialize with params if provided through navigation
  const initialRecipient = navRoute?.params?.recipient || '';
  const initialChain = navRoute?.params?.chain;
  
  // Payment processor hook
  const {
    status,
    route: paymentRoute,
    paymentData,
    getPaymentRoute,
    processPayment,
    executePayment,
    reset,
  } = usePaymentProcessor();

  // Add wallet connection hooks
  const { address, isConnected, connector } = useAccount();
  const { open: openConnectModal } = useWalletConnectModal();

  // Add Cross Chain Transfer hook
  const {
    currentStep,
    logs: transferLogs,
    executeTransfer,
    error: transferError
  } = useCrossChainTransfer();
  
  // Add a local payment status tracker for 1inch Fusion flows
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  
  // Form state
  const [sourceChain, setSourceChain] = useState<Chain | null>(supportedChains[0] || null);
  const [targetChain, setTargetChain] = useState<Chain | null>(initialChain || supportedChains[1] || null);
  const [sourceToken, setSourceToken] = useState<Token | null>(null);
  const [targetToken, setTargetToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>(initialRecipient);
  const [note, setNote] = useState<string>('');
  const [recipientPreferences, setRecipientPreferences] = useState<any>(null);
  const [fetchingPreferences, setFetchingPreferences] = useState<boolean>(false);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [isValidatingInput, setIsValidatingInput] = useState<boolean>(false);
  const [localPaymentRoute, setLocalPaymentRoute] = useState<any>(null);
  
  // Add this to your component state variables
  const [orderHash, setOrderHash] = useState<string | null>(null);
  const [inchOrderStatus, setInchOrderStatus] = useState<InchOrderStatus | null>(null);
  const [isPollingOrderStatus, setIsPollingOrderStatus] = useState<boolean>(false);
  
  // Initialize sourceToken and targetToken when chains change
  useEffect(() => {
    if (sourceChain) {
      const availableTokens = tokensForChain(sourceChain.id);
      if (availableTokens.length > 0) {
        // Prefer USDC if available
        const usdc = availableTokens.find(t => t.symbol === 'USDC');
        setSourceToken(usdc || availableTokens[0]);
      }
    }
  }, [sourceChain]);
  
  useEffect(() => {
    if (targetChain) {
      const availableTokens = tokensForChain(targetChain.id);
      if (availableTokens.length > 0) {
        // Prefer USDC if available
        const usdc = availableTokens.find(t => t.symbol === 'USDC');
        setTargetToken(usdc || availableTokens[0]);
      }
    }
  }, [targetChain]);

  // Fetch recipient preferences when recipient address changes
  useEffect(() => {
    if (!recipient || !ethers.utils.isAddress(recipient)) {
      setRecipientPreferences(null);
      return;
    }

    const fetchRecipientPreferences = async () => {
      setFetchingPreferences(true);
      try {
        const provider = new ethers.providers.JsonRpcProvider('https://celo-alfajores.drpc.org');

        const contract = new ethers.Contract(
          PREFERENCES_CONTRACT_ADDRESS,
          PREFERENCES_CONTRACT_ABI,
          provider
        );

        console.log('Fetching recipient preferences from contract:', recipient, contract);

        // Check if the recipient has preferences stored
        const hasPrefs = await contract.hasPreferences(recipient);

        console.log(hasPrefs ? 'Recipient has preferences' : 'Recipient has no preferences');
        if (hasPrefs) {
          // Get the IPFS hash from the contract
          const [ipfsHash, timestamp] = await contract.getPreferencesIPFSHash(recipient);
          console.log('Recipient has preferences, IPFS hash:', ipfsHash);

          // Load the preferences from IPFS
          if (ipfsHash && ipfsHash !== '') {
            try {
              // In a real app, we would call loadPreferencesFromIPFS with the hash
              const prefs: any = await loadPreferencesFromIPFS(ipfsHash);
              console.log('Loaded preferences from IPFS:', prefs);
              setRecipientPreferences(prefs);
              
              // Automatically set target chain and token based on preferences
              if (prefs?.chains?.length > 0) {
                const preferredChain = prefs.chains[0];
                // Find the chain in supportedChains
                const chainMatch = supportedChains.find(c => c.id === preferredChain.chainId);
                if (chainMatch) {
                  setTargetChain(chainMatch);
                  
                  // Find the preferred token in the chain's tokens
                  if (preferredChain.preferredTokens?.length > 0) {
                    const tokens = tokensForChain(preferredChain.chainId);
                    const preferredTokenAddress = preferredChain.preferredTokens[0];
                    const tokenMatch = tokens.find(t => t.address === preferredTokenAddress);
                    if (tokenMatch) {
                      setTargetToken(tokenMatch);
                    }
                  }
                }
              }
            } catch (ipfsError) {
              console.error('Error loading preferences from IPFS:', ipfsError);
            }
          }
        } else {
          console.log('Recipient has no preferences stored');
          setRecipientPreferences(null);
        }
      } catch (err) {
        console.error('Error fetching recipient preferences from contract:', err);
        // Fallback to mock preferences for demo
        const mockPreferences: any = {
          address: recipient,
          chains: [
            {
              chainId: 8453, // Base
              walletAddress: recipient,
              preferredTokens: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'], // USDC on Base
              isDefault: true
            }
          ]
        };
        
        setRecipientPreferences(mockPreferences);
        
        // Automatically set target chain and token based on mock preferences
        const preferredChain = mockPreferences.chains[0];
        const chainMatch = supportedChains.find(c => c.id === preferredChain.chainId);
        if (chainMatch) {
          setTargetChain(chainMatch);
          
          // Find the preferred token in the chain's tokens
          if (preferredChain.preferredTokens?.length > 0) {
            const tokens = tokensForChain(preferredChain.chainId);
            const preferredTokenAddress = preferredChain.preferredTokens[0];
            const tokenMatch = tokens.find(t => t.address === preferredTokenAddress);
            if (tokenMatch) {
              setTargetToken(tokenMatch);
            }
          }
        }
      } finally {
        setFetchingPreferences(false);
      }
    };

    fetchRecipientPreferences();
  }, [recipient, supportedChains, tokensForChain]);
  
  // Track payment status changes
  useEffect(() => {
    if (status.step === 'completed') {
      setIsProcessing(false);
      setShowReceipt(true);
    } else if (status.step === 'error') {
      setIsProcessing(false);
      Alert.alert('Payment Error', status.error || 'An error occurred processing your payment');
    } else if (status.step !== 'idle') {
      setIsProcessing(true);
    }
  }, [status]);
  
  // Handle chain swap
  const handleSwapChains = () => {
    const tempChain = sourceChain;
    const tempToken = sourceToken;
    
    setSourceChain(targetChain);
    setSourceToken(targetToken);
    setTargetChain(tempChain);
    setTargetToken(tempToken);
  };
  
  // Validate input before proceeding
  const validateInput = (): boolean => {
    setIsValidatingInput(true);
    
    if (!sourceChain) {
      Alert.alert('Error', 'Please select a source chain');
      setIsValidatingInput(false);
      return false;
    }
    
    if (!targetChain) {
      Alert.alert('Error', 'Please select a destination chain');
      setIsValidatingInput(false);
      return false;
    }
    
    if (!sourceToken) {
      Alert.alert('Error', 'Please select a source token');
      setIsValidatingInput(false);
      return false;
    }
    
    if (!targetToken) {
      Alert.alert('Error', 'Please select a target token');
      setIsValidatingInput(false);
      return false;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      setIsValidatingInput(false);
      return false;
    }
    
    if (!recipient || !ethers.utils.isAddress(recipient)) {
      Alert.alert('Error', 'Please enter a valid recipient address');
      setIsValidatingInput(false);
      return false;
    }
    
    setIsValidatingInput(false);
    return true;
  };
  
  // Get payment route
  const handleGetRoute = async () => {
    if (!validateInput()) return;
    
    try {
      Keyboard.dismiss();
      
      // Reset payment status at the start of a new request
      setPaymentStatus('idle');
      
      // Only proceed if we have all the required data
      if (sourceChain && targetChain && sourceToken && targetToken && amount) {
        console.log("[DEBUG] Getting the payment route with all required data");
        
        // Use recipient preferences if available
        const targetChainId = recipientPreferences?.chains?.[0]?.chainId || targetChain.id;
        const targetTokenAddress = recipientPreferences?.chains?.[0]?.preferredTokens?.[0] || targetToken.address;
        const actualRecipient = recipientPreferences?.chains?.[0]?.walletAddress || recipient;
        
        console.log('[DEBUG] Using preferences:', {
          targetChainId,
          targetTokenAddress,
          actualRecipient
        });

        try {
          // Use retry logic for the API call
          const response = await retryWithBackoff(() => 
            apiClient.post('/payment/route', {
              sourceChainId: sourceChain.id,
              sourceToken: sourceToken.address,
              amount: ethers.utils.parseUnits(amount, sourceToken.decimals).toString(),
              targetChainId: targetChainId,
              targetToken: targetTokenAddress,
              // Backend expects recipientPreferences instead of recipientAddress (optional)
              recipientPreferences: recipientPreferences ? [{
                id: "default",
                walletAddress: actualRecipient,
                chainId: targetChainId,
                tokenAddress: targetTokenAddress,
                name: "Default Preference"
              }] : undefined
            })
          );
          
          // Update the payment route with the response data
          console.log('[DEBUG] Payment route response:', JSON.stringify(response.data, null, 2));
          
          // Store the route locally for use with direct circle integration
          setLocalPaymentRoute(response.data);
          
          // If it's a circle_cctp route, handle it accordingly
          if (response.data && response.data.routeType === 'circle_cctp') {
            console.log('[DEBUG] Detected Circle CCTP route');
            // Use timeout to ensure state is updated before proceeding
            setTimeout(async () => {
              await handleSendPayment(response.data);
            }, 500);
          } else if (response.data && response.data.routeType === 'inch_fusion') {
            console.log('[DEBUG] Detected 1inch Fusion route');
            // For 1inch routes, we'll process the payment
            // Define the sender address
            const senderAddress = address || '0x666446eC2343e9E7e3D75C4C5b6A15355Ec7d7D4';
            console.log('[DEBUG] Using sender address for 1inch:', senderAddress);
            
            // Process the payment using the 1inch API
            try {
              const processResponse = await retryWithBackoff(() => 
                apiClient.post('/payment/process', {
                  senderAddress,
                  recipientAddress: actualRecipient,
                  sourceChainId: sourceChain.id,
                  sourceToken: sourceToken.address,
                  amount: ethers.utils.parseUnits(amount, sourceToken.decimals).toString(),
                  targetChainId: targetChainId,
                  targetToken: targetTokenAddress,
                  routeType: 'inch_fusion',
                  note: note,
                })
              );
              
              console.log('[DEBUG] Process payment API call complete');
              console.log('[DEBUG] Process payment response status:', processResponse.status);
              console.log('[DEBUG] Process payment response data:', JSON.stringify(processResponse.data, null, 2));
              
              if (processResponse.data && processResponse.data.orderData) {
                console.log('[DEBUG] Order data received from backend:', processResponse.data.orderData.orderHash);
                
                // Create a combined payment route with both original route and order data
                const combinedPaymentRoute = {
                  ...response.data,
                  orderData: processResponse.data.orderData,
                  orderHash: processResponse.data.orderHash
                };
                
                // Set the local payment route with the combined data
                setLocalPaymentRoute(combinedPaymentRoute);
                
                // Update the order hash for status polling if available
                if (processResponse.data.orderHash) {
                  console.log('[DEBUG] Setting order hash:', processResponse.data.orderHash);
                  setOrderHash(processResponse.data.orderHash);
                  setInchOrderStatus('preparing');
                }
                
                // Update the payment status
                setPaymentStatus('preparing');
                
                // Use timeout to ensure state is updated before proceeding
                setTimeout(async () => {
                  console.log('[DEBUG] Triggering handleSendPayment after state updates with combined route data');
                  await handleSendPayment(combinedPaymentRoute);
                }, 500);
              } else {
                console.error('[ERROR] No order data in process response:', processResponse.data);
                Alert.alert('Error', 'Failed to create 1inch order. Please try again.');
              }
            } catch (processError: any) {
              console.error('[ERROR] Failed to process 1inch order:', processError);
              Alert.alert('Error', `Failed to process 1inch order: ${processError.message}`);
            }
          } else {
            console.log('[DEBUG] Unknown route type or no route data');
            Alert.alert('Error', 'Could not determine payment route type. Please try again.');
          }
        } catch (axiosError: any) {
          console.error('[ERROR] API call failed:', axiosError);
          
          // Show a more specific error message
          if (axiosError.message === 'Network Error') {
            Alert.alert(
              'Network Error', 
              'Could not connect to the backend server. Please make sure the backend is running on http://localhost:3001.'
            );
          } else if (axiosError.message?.includes('Too Many Requests') || axiosError.response?.status === 429) {
            Alert.alert(
              'Rate Limit Exceeded', 
              'The 1inch API rate limit has been exceeded. Please try again in a few seconds.'
            );
          } else {
            Alert.alert('API Error', `Failed to get payment route: ${axiosError.message}`);
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Error getting route:', error);
      Alert.alert('Error', 'Failed to get payment route. Please try again.');
    }
  };
  
  // Send payment - accept route data as parameter to avoid relying on state
  const handleSendPayment = async (routeData?: any) => {
    try {
      console.log("[DEBUG] handleSendPayment initiated");
      
      // Use provided routeData or fall back to state
      const paymentRouteData = routeData || localPaymentRoute;
      
      console.log("[DEBUG] Payment route data:", JSON.stringify(paymentRouteData, null, 2));
      
      if (!paymentRouteData) {
        console.error("[ERROR] No payment route data available");
        Alert.alert('Error', 'No payment route data available. Please try again.');
        return;
      }
    
      // Get connected wallet address
      if (!isConnected || !address) {
        console.log("[DEBUG] Wallet not connected, showing connect modal");
        Alert.alert(
          'Wallet Connection Required',
          'Please connect your wallet to sign this transaction',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Connect Wallet', 
              onPress: () => {
                if (openConnectModal) {
                  openConnectModal();
                }
              } 
            }
          ]
        );
        return;
      }
      
      const senderAddress = address;
      console.log("[DEBUG] Using sender address:", senderAddress);
      
      // Use recipient preferences if available
      const targetChainId = recipientPreferences?.chains?.[0]?.chainId || targetChain!.id;
      const targetTokenAddress = recipientPreferences?.chains?.[0]?.preferredTokens?.[0] || targetToken!.address;
      const actualRecipient = recipientPreferences?.chains?.[0]?.walletAddress || recipient;
      
      setIsProcessing(true);
      
      console.log("[DEBUG] Payment route:", paymentRouteData?.routeType);
      console.log("[DEBUG] Has order data:", !!paymentRouteData?.orderData);
      
      // Check if we have a Circle CCTP route
      if (paymentRouteData && paymentRouteData.routeType === 'circle_cctp') {
        try {
          // Create hook data for the transfer
          const amountInWei = ethers.utils.parseUnits(amount, sourceToken!.decimals).toString();
          
          // Generate hookData for sending to a vault or directly to recipient
          const hookData = encodeFunctionData({
            // Transfer the tokens to recipient or vault
            abi: [
              {
                constant: false,
                inputs: [
                  { name: "_to", type: "address" },
                  { name: "_value", type: "uint256" },
                ],
                name: "transfer",
                outputs: [],
                payable: false,
                stateMutability: "nonpayable",
                type: "function",
              },
            ],
            functionName: "transfer",
            args: ["0x0c07BE7E39719777F2C0343114116aC4368e099F" as `0x${string}`, BigInt(amountInWei)]
          });

          console.log("executing transfer via circle CCTP V2");
          
          // Execute the direct Circle transfer
          await executeTransfer(
            Number(sourceChain!.id), 
            Number(targetChainId), 
            amount, 
            actualRecipient,
            hookData as `0x${string}`
          );
          
          // Show receipt
          setShowReceipt(true);
        } catch (error) {
          console.error('Error executing Circle transfer:', error);
          Alert.alert('Error', 'Failed to execute Circle transfer. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      } else if (paymentRouteData && paymentRouteData.routeType === 'inch_fusion') {
        try {
          // Extract order data from the prepared order
          const orderData = paymentRouteData.orderData;
          
          if (!orderData) {
            console.error("[ERROR] Missing order data for 1inch Fusion");
            Alert.alert('Error', 'Missing order data for 1inch Fusion. Please try again.');
            setIsProcessing(false);
            return;
          }
          
          console.log("[DEBUG] Processing 1inch Fusion order with hash:", orderData.orderHash);
          console.log("[DEBUG] Order data structure:", JSON.stringify(orderData, null, 2));
          
          // Store order hash for status polling
          if (orderData.orderHash) {
            setOrderHash(orderData.orderHash);
            setInchOrderStatus('preparing');
          }
          
          // Update processing status to show we're getting the order ready
          setPaymentStatus('preparing');
          
          // Sign the order with the user's wallet
          let signature: string;
          
          try {
            // Update processing status to show we're signing the order
            setPaymentStatus('signing');
            
            // Prepare the EIP-712 typed data for signing
            const domain = orderData.dataToSign?.domain;
            const types = orderData.dataToSign?.types;
            const value = orderData.dataToSign?.message;
            
            console.log("[DEBUG] Preparing to sign data with domain:", domain);
            console.log("[DEBUG] Signing with types:", JSON.stringify(types, null, 2));
            console.log("[DEBUG] Signing with value:", JSON.stringify(value, null, 2));
            
            if (!domain || !types || !value) {
              throw new Error('Missing required data for order signing');
            }
            
            if (!connector) {
              console.error("[ERROR] No wallet connector available");
              throw new Error('No wallet connector available');
            }
            
            // Always use real wallet signing - remove the demo/production condition
            try {
              console.log("[DEBUG] Getting provider from connector");
              const provider = await connector.getProvider();
              console.log("[DEBUG] Creating ethers provider");
              const ethersProvider = new ethers.providers.Web3Provider(provider as any);
              console.log("[DEBUG] Getting signer");
              const signer = ethersProvider.getSigner();
              
              console.log("[DEBUG] Attempting to sign typed data");
              // Sign the typed data - use proper ethers method for EIP-712 signing
              signature = await signer._signTypedData(
                domain,
                { Order: types.Order },
                value
              );
              
              console.log("[DEBUG] Signature successful:", signature);
            } catch (signingErr) {
              console.error("[ERROR] Error during wallet signing:", signingErr);
              Alert.alert(
                'Wallet Signing Error',
                `Failed to sign with wallet: ${signingErr instanceof Error ? signingErr.message : 'Unknown error'}`,
                [{ text: 'OK' }]
              );
              throw signingErr;
            }
            
            console.log("[DEBUG] Order signed successfully:", signature);
            
            // Update UI to show we're submitting the order
            setPaymentStatus('executing');
            
            // Submit the signed order to the backend
            console.log("[DEBUG] Submitting signed order to backend");
            try {
              const finalizeResponse = await retryWithBackoff(() => 
                apiClient.post('/payment/inch/finalize', {
                  srcChainId: orderData.srcChainId,
                  orderStruct: orderData.orderStruct,
                  quoteId: orderData.quoteId,
                  secretHashes: orderData.secretHashes,
                  signature: signature,
                  extension: orderData.extension,
                  orderHash: orderData.orderHash
                })
              );
              
              console.log("[DEBUG] Order finalization response:", JSON.stringify(finalizeResponse.data, null, 2));
              
              // Start polling for order status
              setInchOrderStatus('pending');
              setIsPollingOrderStatus(true);
              
              // Show status update to user
              Alert.alert(
                '1inch Order Submitted',
                'Your order has been submitted to the 1inch network. We will monitor its status until execution.',
                [{ text: 'OK' }]
              );
              
              // Start polling for order status with retries
              pollOrderStatus(
                orderData.orderHash,
                apiClient,
                (data) => {
                  // Success handler
                  setPaymentStatus('completed');
                  setIsProcessing(false);
                  setShowReceipt(true);
                  setIsPollingOrderStatus(false);
                  
                  Alert.alert(
                    '1inch Order Complete',
                    'Your cross-chain swap has been executed successfully!',
                    [{ text: 'OK' }]
                  );
                },
                (error) => {
                  // Failure handler
                  console.error("[ERROR] Order polling failed:", error);
                  setPaymentStatus('error');
                  setIsProcessing(false);
                  setIsPollingOrderStatus(false);
                  
                  Alert.alert(
                    'Order Failed',
                    `Your 1inch order has failed: ${error.message}. Please try again.`,
                    [{ text: 'OK' }]
                  );
                }
              );
            } catch (finalizeError: any) {
              console.error("[ERROR] Failed to submit order to backend:", finalizeError);
              
              if (finalizeError.response?.status === 404) {
                // Handle 404 error specifically (API endpoint not found)
                Alert.alert(
                  'Backend Error',
                  'The backend API endpoint for 1inch order finalization could not be found. Your order was signed but could not be submitted.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Order Submission Error',
                  `Failed to submit the signed order: ${finalizeError.message || 'Unknown error'}`,
                  [{ text: 'OK' }]
                );
              }
              
              // Even though backend failed, the signature was successful, so we'll start
              // polling anyway to check if the order was somehow processed
              console.log("[DEBUG] Backend finalization failed, but starting status polling anyway");
              setInchOrderStatus('pending');
              
              // Start polling for order status with retries
              pollOrderStatus(
                orderData.orderHash,
                apiClient,
                (data) => {
                  // Success handler
                  setPaymentStatus('completed');
                  setIsProcessing(false);
                  setShowReceipt(true);
                  setIsPollingOrderStatus(false);
                  
                  Alert.alert(
                    'Order Completed Successfully',
                    'Despite initial errors, your order has been executed successfully!',
                    [{ text: 'OK' }]
                  );
                },
                (error) => {
                  // Failure handler
                  console.error("[ERROR] Order polling failed:", error);
                  setPaymentStatus('error');
                  setIsProcessing(false);
                  setIsPollingOrderStatus(false);
                }
              );
            }
          } catch (signingError) {
            console.error("Error signing or submitting order:", signingError);
            Alert.alert(
              'Signing Error', 
              `Failed to sign the 1inch order: ${signingError instanceof Error ? signingError.message : 'Unknown error'}`
            );
            setPaymentStatus('error');
            setIsProcessing(false);
            return;
          }
        } catch (error) {
          console.error('Error processing 1inch payment:', error);
          Alert.alert('Error', 'Failed to process 1inch payment. Please try again.');
          setPaymentStatus('error');
          setIsProcessing(false);
        }
      } else {
        // For other routes, use the backend
        try {
          // Process payment
          await processPayment({
            senderAddress,
            recipientAddress: actualRecipient,
            sourceChainId: sourceChain!.id,
            sourceToken: sourceToken!.address,
            amount: ethers.utils.parseUnits(amount, sourceToken!.decimals).toString(),
            targetChainId: targetChainId,
            targetToken: targetTokenAddress,
            note: note,
          });
          
          // Execute payment
          await executePayment();
        } catch (error) {
          console.error('Error processing payment:', error);
          Alert.alert('Error', 'Failed to process payment. Please try again.');
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };
  
  // Handle receipt close
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    reset();
    setPaymentStatus('idle');
    setOrderHash(null);
    setInchOrderStatus(null);
    setIsPollingOrderStatus(false);
    
    // Reset form
    setAmount('');
    setNote('');
  };
  
  // Add this polling hook after your other useEffect hooks
  // This will poll for order status updates when an order is placed
  useInterval(
    () => {
      if (orderHash && inchOrderStatus !== 'executed' && inchOrderStatus !== 'failed' && inchOrderStatus !== 'cancelled') {
        checkOrderStatus(orderHash);
      } else {
        setIsPollingOrderStatus(false);
      }
    },
    isPollingOrderStatus ? 5000 : null // Poll every 5 seconds when active
  );

  // Improved order status checking function
  const checkOrderStatus = async (hash: string) => {
    try {
      console.log(`[DEBUG] Manual check of order status for hash: ${hash}`);
      
      // Make the API call to check status
      const response = await apiClient.get(`/payment/inch/status?orderHash=${hash}`);
      
      console.log(`[DEBUG] Manual status check response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.status) {
        console.log(`[DEBUG] Order status manually updated: ${response.data.status}`);
        setInchOrderStatus(response.data.status);
        
        // Handle different status types
        switch(response.data.status) {
          case 'executed':
            // Order is complete
            setPaymentStatus('completed');
            setIsProcessing(false);
            setShowReceipt(true);
            setIsPollingOrderStatus(false);
            
            Alert.alert(
              '1inch Order Complete',
              'Your cross-chain swap has been executed successfully!',
              [{ text: 'OK' }]
            );
            break;
            
          case 'failed':
          case 'cancelled':
            // Order failed or was cancelled
            setPaymentStatus('error');
            setIsProcessing(false);
            setIsPollingOrderStatus(false);
            
            Alert.alert(
              'Order Failed',
              `Your 1inch order has ${response.data.status}. Please try again.`,
              [{ text: 'OK' }]
            );
            break;
            
          case 'ready':
            // Order is ready for execution, notify user but continue polling
            Alert.alert(
              'Order Ready',
              'Your order is ready for execution and waiting for a resolver.',
              [{ text: 'OK' }]
            );
            break;
        }
      }
    } catch (error) {
      console.error('[ERROR] Manual order status check failed:', error);
    }
  };
  
  // Render payment processing status
  const renderProcessingStatus = () => {
    if (!isProcessing) return null;
    
    let statusText = 'Processing payment...';
    let detailText = '';
    
    // For 1inch orders, use the local payment status
    if (localPaymentRoute && localPaymentRoute.routeType === 'inch_fusion') {
      switch (paymentStatus) {
        case 'preparing':
          statusText = 'Preparing 1inch Fusion order...';
          break;
        case 'signing':
          statusText = 'Signing order with wallet...';
          break;
        case 'executing':
          statusText = 'Submitting order to 1inch relayer...';
          break;
        case 'completed':
          statusText = 'Order submitted successfully!';
          break;
        case 'error':
          statusText = 'Error processing 1inch order';
          break;
        default:
          statusText = 'Processing 1inch payment...';
      }
      
      // Add detail text based on the inch order status
      if (inchOrderStatus) {
        switch (inchOrderStatus) {
          case 'pending':
            detailText = 'Order is pending. Waiting for a resolver...';
            break;
          case 'preparing':
            detailText = 'Order is being prepared...';
            break;
          case 'ready':
            detailText = 'Order is ready for execution...';
            break;
          case 'executed':
            detailText = 'Order has been executed successfully!';
            break;
          case 'failed':
            detailText = 'Order failed to execute.';
            break;
          case 'cancelled':
            detailText = 'Order was cancelled.';
            break;
        }
      }
    } else {
      // For Circle CCTP or other routes, use the payment processor status
      switch (status.step) {
        case 'route_selection':
          statusText = 'Finding the best route for your payment...';
          break;
        case 'preparing':
          statusText = 'Preparing payment...';
          break;
        case 'approving':
          statusText = 'Approving token transfer...';
          break;
        case 'executing':
          statusText = 'Executing payment...';
          break;
        case 'burning':
          statusText = 'Processing source chain transaction...';
          break;
        case 'waiting':
          statusText = 'Waiting for cross-chain confirmation...';
          break;
        case 'confirming':
          statusText = 'Confirming payment on destination chain...';
          break;
      }
      
      detailText = status.message || '';
    }
    
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#2F28D0" />
        <Text style={styles.processingText}>{statusText}</Text>
        {detailText ? (
          <Text style={styles.processingSubtext}>{detailText}</Text>
        ) : null}
        
        {/* Add a cancel button for long-running operations */}
        {(paymentStatus === 'executing' || inchOrderStatus === 'pending' || inchOrderStatus === 'ready') && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setIsProcessing(false);
              setIsPollingOrderStatus(false);
              setPaymentStatus('idle');
              setInchOrderStatus(null);
              Alert.alert('Payment Cancelled', 'The payment process has been cancelled.');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Cross-Chain Payment</Text>
            <View style={styles.placeholder} />
          </View>
          
          {/* Source Chain and Token */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>From</Text>
            
            <View style={styles.chainTokenContainer}>
              <View style={styles.chainSelector}>
                <ChainPicker
                  selectedChain={sourceChain}
                  onSelectChain={setSourceChain}
                  chains={supportedChains}
                  label="Source Chain"
                />
              </View>
              
              <View style={styles.tokenSelector}>
                <TokenPicker
                  selectedToken={sourceToken}
                  onSelectToken={setSourceToken}
                  tokens={sourceChain ? tokensForChain(sourceChain.id) : []}
                  label="Token"
                />
              </View>
            </View>
            
            {sourceToken && (
              <Text style={styles.balanceText}>
                Balance: {sourceToken.balance} {sourceToken.symbol}
              </Text>
            )}
          </View>
          
          {/* Swap button */}
          <TouchableOpacity 
            style={styles.swapButton}
            onPress={handleSwapChains}
          >
            <MaterialIcons name="swap-vert" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Target Chain and Token */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>To</Text>
            
            <View style={styles.chainTokenContainer}>
              <View style={styles.chainSelector}>
                <ChainPicker
                  selectedChain={targetChain}
                  onSelectChain={recipientPreferences ? ((chain) => {}) : setTargetChain}
                  chains={supportedChains}
                  label="Destination Chain"
                  disabled={recipientPreferences !== null}
                />
              </View>
              
              <View style={styles.tokenSelector}>
                <TokenPicker
                  selectedToken={targetToken}
                  onSelectToken={recipientPreferences ? ((token) => {}) : setTargetToken}
                  tokens={targetChain ? tokensForChain(targetChain.id) : []}
                  label="Token"
                  disabled={recipientPreferences !== null}
                />
              </View>
            </View>
            
            {fetchingPreferences ? (
              <Text style={styles.loadingText}>Checking recipient preferences...</Text>
            ) : recipientPreferences ? (
              <View style={styles.preferenceContainer}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.preferenceText}>
                  Using recipient's payment preferences
                </Text>
                <Text style={styles.preferenceSubtext}>
                  Recipient will receive funds on {targetChain?.name} in {targetToken?.symbol}
                </Text>
              </View>
            ) : null}
          </View>
          
          {/* Amount */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Amount</Text>
            
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            
            {sourceToken && (
              <View style={styles.amountActions}>
                <TouchableOpacity
                  style={styles.maxButton}
                  onPress={() => {
                    if (sourceToken?.balance) {
                      setAmount(sourceToken.balance);
                    }
                  }}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
                
                <Text style={styles.amountUSD}>
                  ≈ ${parseFloat(amount || '0') * 0}
                </Text>
              </View>
            )}
          </View>
          
          {/* Recipient */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recipient</Text>
            
            <TextInput
              style={styles.recipientInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Enter wallet address (0x...)"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          {/* Note */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Note (Optional)</Text>
            
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note for this payment"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>
          
          {/* Payment route information */}
          {paymentRoute && (
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle}>Payment Route</Text>
              
              <View style={styles.routeInfo}>
                <View style={styles.routeRow}>
                  <Text style={styles.routeLabel}>Method</Text>
                  <Text style={styles.routeValue}>
                    {paymentRoute.routeType === 'circle_cctp' 
                      ? 'Circle Cross-Chain Transfer' 
                      : '1inch Token Swap'}
                  </Text>
                </View>
                
                <View style={styles.routeRow}>
                  <Text style={styles.routeLabel}>You Pay</Text>
                  <Text style={styles.routeValue}>
                    {ethers.utils.formatUnits(
                      paymentRoute.estimate.sourceAmount,
                      sourceToken?.decimals || 18
                    )} {sourceToken?.symbol}
                  </Text>
                </View>
                
                <View style={styles.routeRow}>
                  <Text style={styles.routeLabel}>Recipient Gets</Text>
                  <Text style={styles.routeValue}>
                    {ethers.utils.formatUnits(
                      paymentRoute.estimate.targetAmount,
                      targetToken?.decimals || 18
                    )} {targetToken?.symbol}
                  </Text>
                </View>
                
                <View style={styles.routeRow}>
                  <Text style={styles.routeLabel}>Fee</Text>
                  <Text style={styles.routeValue}>
                    {ethers.utils.formatUnits(
                      paymentRoute.estimate.estimatedFee,
                      sourceToken?.decimals || 18
                    )} {sourceToken?.symbol}
                  </Text>
                </View>
                
                <View style={styles.routeRow}>
                  <Text style={styles.routeLabel}>Est. Time</Text>
                  <Text style={styles.routeValue}>
                    {Math.ceil(paymentRoute.estimate.estimatedDuration / 60)} minutes
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Actions */}
          <View style={styles.actions}>
            {!paymentRoute ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  (!amount || isValidatingInput) && styles.buttonDisabled
                ]}
                onPress={handleGetRoute}
                disabled={!amount || isValidatingInput}
              >
                <Text style={styles.buttonText}>Get Payment Route</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, isProcessing && styles.buttonDisabled]}
                onPress={() => handleSendPayment()}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Send Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        
        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.overlay}>
            {renderProcessingStatus()}
          </View>
        )}
        
        {/* Payment receipt */}
        {showReceipt && (
          <View style={styles.overlay}>
            <PaymentReceipt 
              status={status.step}
              txHash={status.txHash}
              route={paymentRoute}
              onClose={handleCloseReceipt}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Arame',
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  chainTokenContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chainSelector: {
    flex: 1.5,
    marginRight: 8,
  },
  tokenSelector: {
    flex: 1,
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  preferenceContainer: {
    flexDirection: 'column',
    marginTop: 8,
  },
  preferenceText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  preferenceSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  swapButton: {
    alignSelf: 'center',
    backgroundColor: '#2F28D0',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginBottom: -8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    marginBottom: 8,
  },
  amountActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  maxButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  amountUSD: {
    fontSize: 14,
    color: '#666',
  },
  recipientInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  routeCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d0d9ff',
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2F28D0',
  },
  routeInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 14,
    color: '#666',
  },
  routeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actions: {
    marginTop: 16,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2F28D0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  receiptContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  receiptStatus: {
    alignItems: 'center',
    marginBottom: 24,
  },
  receiptStatusText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  receiptDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#666',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  receiptFooter: {
    marginBottom: 20,
  },
  txHash: {
    fontSize: 14,
    color: '#2F28D0',
    marginTop: 4,
  },
  receiptButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CrossChainPayment; 