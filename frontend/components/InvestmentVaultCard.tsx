import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWallet } from './utils/WalletConnector';
import beefyService, { BeefyVault as BeefyApiVault } from './utils/BeefyService';
import { useAccount } from 'wagmi';

// Define the BeefyVault interface to match what we're getting from the API
export interface BeefyVault {
  id: string;
  name: string;
  chain: string;
  chainId: number;
  apy: number;
  tvl: number | string;
  tokenAddress: string;
  earnContractAddress: string;
  token?: string;
  tokenIcon?: string;
  chainIcon?: string;
  chainName?: string;
  description?: string;
  platform?: string;
  depositFee?: number;
  withdrawalFee?: number;
  assets?: string[];
  risks?: string[];
  earnedToken?: string;
  earnedTokenAddress?: string;
  oracleId?: string;
  status?: string;
}

interface InvestmentVaultCardProps {
  vault: BeefyVault;
  onInvestSuccess?: () => void;
}

// Transaction states for user feedback
enum TransactionState {
  IDLE = 'idle',
  APPROVING = 'approving',
  DEPOSITING = 'depositing',
  WITHDRAWING = 'withdrawing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

const getChainIcon = (chain: string): string => {
  const chainIcons: Record<string, string> = {
    ethereum: '🔷',
    polygon: '🟣',
    bsc: '🟡',
    avalanche: '🔺',
    base: '🔵',
    arbitrum: '🔶',
    optimism: '🔴',
    fantom: '👻',
  };

  return chainIcons[chain.toLowerCase()] || '🔷';
};

// Format TVL with commas for thousands
const formatTvl = (tvl: number | string): string => {
  if (typeof tvl === 'string') {
    // Return as is if it's already formatted
    if (tvl.startsWith('$')) return tvl;

    // Try to parse if it's a numeric string
    try {
      const numValue = parseFloat(tvl);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    } catch (e) {
      return tvl as string;
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tvl as number);
};

const InvestmentVaultCard: React.FC<InvestmentVaultCardProps> = ({ vault, onInvestSuccess }) => {
  const { isConnected } = useWallet();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [transactionState, setTransactionState] = useState<TransactionState>(TransactionState.IDLE);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [vaultDetails, setVaultDetails] = useState<BeefyApiVault | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load additional vault details from Beefy API
  useEffect(() => {
    const fetchVaultDetails = async () => {
      if (!vault.id || !vault.chainId) return;

      setLoadingDetails(true);
      try {
        const details = await beefyService.getVaultDetails(vault.id, vault.chainId);
        if (details) {
          setVaultDetails(details);
        }
      } catch (error) {
        console.error('Error fetching vault details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchVaultDetails();
  }, [vault.id, vault.chainId]);

  // Format APY as percentage
  const formatApy = (apy: number | string | undefined): string => {
    if (apy === undefined || apy === null) {
      return '0.00%';
    }

    // Convert to number first
    const apyNum = typeof apy === 'string' ? parseFloat(apy) : apy;

    // Handle invalid or extreme values
    if (isNaN(apyNum)) {
      return '0.00%';
    }

    if (apyNum === Infinity || apyNum > 1000000) {
      return 'High APY';
    }

    if (apyNum < 0) {
      return '0.00%';
    }

    return `${apyNum.toFixed(2)}%`;
  };

  // Handle investment transaction
  const handleInvest = async () => {
    if (!isConnected || !address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Need tokenAddress and vault address from API
    if (!vault.tokenAddress || !vault.earnContractAddress) {
      Alert.alert('Error', 'Missing vault contract information');
      return;
    }

    setTransactionState(TransactionState.APPROVING);

    try {
      // Call the BeefyService to handle the transaction
      const result = await beefyService.invest(
        vault.earnContractAddress,
        vault.tokenAddress,
        investAmount,
        vault.chainId,
        address
      );

      // Update state with transaction hash
      setTransactionHash(result.txHash);
      setTransactionState(TransactionState.COMPLETED);

      // Show success message
      Alert.alert(
        'Investment Successful',
        `Successfully invested ${investAmount} in ${vault.name}. You received ${result.shares} shares.`,
        [
          {
            text: 'View Transaction',
            onPress: () => {
              // Open blockchain explorer with the transaction hash
              const explorerUrl = getExplorerUrl(vault.chainId, result.txHash);
              Linking.openURL(explorerUrl).catch(err => {
                console.error('Error opening explorer URL:', err);
                Alert.alert('Error', 'Could not open explorer');
              });
            },
          },
          {
            text: 'Close',
            onPress: () => {
              setShowModal(false);
              setInvestAmount('');
              setTransactionState(TransactionState.IDLE);
              setTransactionHash(null);
              if (onInvestSuccess) {
                onInvestSuccess();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Investment error:', error);
      setTransactionState(TransactionState.FAILED);

      // Show error message
      Alert.alert(
        'Investment Failed',
        `There was an error processing your investment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          {
            text: 'Try Again',
            onPress: () => setTransactionState(TransactionState.IDLE),
          },
          {
            text: 'Cancel',
            onPress: () => {
              setShowModal(false);
              setInvestAmount('');
              setTransactionState(TransactionState.IDLE);
            },
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Get explorer URL for a transaction
  const getExplorerUrl = (chainId: number, txHash: string): string => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      56: 'https://bscscan.com/tx/',
      137: 'https://polygonscan.com/tx/',
      250: 'https://ftmscan.com/tx/',
      43114: 'https://snowtrace.io/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      8453: 'https://basescan.org/tx/'
    };

    const baseUrl = explorers[chainId] || '';
    return baseUrl + txHash;
  };

  // Calculate daily, weekly, monthly returns based on APY
  const calculateReturns = (amount: number, apy: number) => {
    if (isNaN(amount) || amount <= 0) return { daily: '0.00', weekly: '0.00', monthly: '0.00', yearly: '0.00' };

    const dailyRate = Math.pow(1 + apy / 100, 1 / 365) - 1;
    const weeklyRate = Math.pow(1 + apy / 100, 7 / 365) - 1;
    const monthlyRate = Math.pow(1 + apy / 100, 30 / 365) - 1;
    const yearlyRate = apy / 100;

    return {
      daily: (amount * dailyRate).toFixed(2),
      weekly: (amount * weeklyRate).toFixed(2),
      monthly: (amount * monthlyRate).toFixed(2),
      yearly: (amount * yearlyRate).toFixed(2),
    };
  };

  const returns = calculateReturns(parseFloat(investAmount) || 0, vault.apy);

  // Get transaction status message
  const getTransactionStatusMessage = (): string => {
    switch (transactionState) {
      case TransactionState.APPROVING:
        return 'Approving token for vault...';
      case TransactionState.DEPOSITING:
        return 'Depositing into vault...';
      case TransactionState.WITHDRAWING:
        return 'Withdrawing from vault...';
      case TransactionState.COMPLETED:
        return 'Transaction completed!';
      case TransactionState.FAILED:
        return 'Transaction failed';
      default:
        return '';
    }
  };

  const isTransactionInProgress = transactionState === TransactionState.APPROVING ||
    transactionState === TransactionState.DEPOSITING ||
    transactionState === TransactionState.WITHDRAWING;

  // Check if vault is EOL (end of life)
  const isEol = vault.status === 'eol';

  // Get a readable chain name
  const displayChainName = vault.chainName || vault.chain || 'Unknown Chain';

  return (
    <View style={[styles.container, isEol && styles.eolContainer]}>
      {isEol && (
        <View style={styles.eolBadge}>
          <Text style={styles.eolText}>Retired</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={styles.chainIcon}>{getChainIcon(vault.chain)}</Text>
          <Text style={styles.name}>{vault.name}</Text>
        </View>
        <View style={styles.apyContainer}>
          <Text style={styles.apyLabel}>APY</Text>
          <Text style={styles.apy}>{formatApy(vault.apy)}</Text>
        </View>
      </View>

      <View style={styles.chainInfo}>
        {vault.chainIcon ? (
          <Image
            source={{ uri: vault.chainIcon }}
            style={styles.chainIcon}
          />
        ) : null}
        <Text style={styles.chainName}>{vault.chainName || vault.chain}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Platform</Text>
          <Text style={styles.detailValue}>{vault.platform || 'Beefy Finance'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Assets</Text>
          <Text style={styles.detailValue}>{vault.assets?.join(', ') || vault.token}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>TVL</Text>
          <Text style={styles.detailValue}>{formatTvl(vault.tvl)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Chain</Text>
          <Text style={styles.detailValue}>{displayChainName}</Text>
        </View>
        {(vault.depositFee !== undefined && vault.depositFee > 0) && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deposit Fee</Text>
            <Text style={styles.detailValue}>{vault.depositFee}%</Text>
          </View>
        )}
        {isEol && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, styles.eolValue]}>Retired</Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>{vault.description}</Text>

      <TouchableOpacity
        style={[styles.investButton, isEol && styles.disabledButton]}
        onPress={() => !isEol && setShowModal(true)}
        disabled={isEol}
      >
        <Text style={styles.investButtonText}>
          {isEol ? 'Vault Retired' : 'Invest'}
        </Text>
      </TouchableOpacity>

      {/* Investment Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isTransactionInProgress && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invest in {vault.name}</Text>
              {!isTransactionInProgress && (
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color="#000" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalBody}>
              {isTransactionInProgress ? (
                <View style={styles.transactionStatusContainer}>
                  <ActivityIndicator size="large" color="#3498db" />
                  <Text style={styles.transactionStatusText}>{getTransactionStatusMessage()}</Text>
                  {transactionHash && (
                    <TouchableOpacity
                      style={styles.viewTransactionButton}
                      onPress={() => {
                        const url = getExplorerUrl(vault.chainId, transactionHash);
                        Linking.openURL(url).catch(err => {
                          console.error('Error opening explorer URL:', err);
                        });
                      }}
                    >
                      <Text style={styles.viewTransactionText}>View Transaction</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Amount to Invest</Text>
                    <TextInput
                      style={styles.input}
                      value={investAmount}
                      onChangeText={setInvestAmount}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.returnsContainer}>
                    <Text style={styles.returnsTitle}>Estimated Returns</Text>
                    <View style={styles.returnsGrid}>
                      <View style={styles.returnItem}>
                        <Text style={styles.returnLabel}>Daily</Text>
                        <Text style={styles.returnValue}>${returns.daily}</Text>
                      </View>
                      <View style={styles.returnItem}>
                        <Text style={styles.returnLabel}>Weekly</Text>
                        <Text style={styles.returnValue}>${returns.weekly}</Text>
                      </View>
                      <View style={styles.returnItem}>
                        <Text style={styles.returnLabel}>Monthly</Text>
                        <Text style={styles.returnValue}>${returns.monthly}</Text>
                      </View>
                      <View style={styles.returnItem}>
                        <Text style={styles.returnLabel}>Yearly</Text>
                        <Text style={styles.returnValue}>${returns.yearly}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.feesContainer}>
                    <Text style={styles.feesTitle}>Fees & Info</Text>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Deposit Fee</Text>
                      <Text style={styles.feeValue}>{vault.depositFee || 0}%</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Withdrawal Fee</Text>
                      <Text style={styles.feeValue}>{vault.withdrawalFee || 0}%</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Auto-compounding</Text>
                      <Text style={styles.feeValue}>Yes</Text>
                    </View>
                  </View>

                  {vaultDetails && vaultDetails.risks && vaultDetails.risks.length > 0 && (
                    <View style={styles.apiInfoContainer}>
                      <Text style={styles.apiInfoTitle}>Risk Factors</Text>
                      {vaultDetails.risks.map((risk, index) => (
                        <Text key={index} style={styles.riskItem}>• {risk}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {!isTransactionInProgress && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.confirmButton,
                    (!isConnected || !investAmount) && styles.disabledButton
                  ]}
                  onPress={handleInvest}
                  disabled={!isConnected || !investAmount}
                >
                  <Text style={styles.confirmButtonText}>
                    {!isConnected ? 'Connect Wallet First' : 'Confirm Investment'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chainIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  apyContainer: {
    backgroundColor: '#ebfbee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  apyLabel: {
    fontSize: 12,
    color: '#2f855a',
    fontWeight: '500',
  },
  apy: {
    fontSize: 16,
    color: '#2f855a',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  details: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  investButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  investButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
  },
  returnsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  returnsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  returnsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  returnItem: {
    width: '48%',
    marginBottom: 12,
  },
  returnLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  returnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2f855a',
  },
  feesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  feesTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#3498db',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  transactionStatusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  transactionStatusText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  viewTransactionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
  },
  viewTransactionText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  apiInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  apiInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  riskContainer: {
    marginTop: 8,
  },
  riskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e74c3c',
    marginBottom: 8,
  },
  riskItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  eolBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#e74c3c',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  eolText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eolValue: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  eolContainer: {
    backgroundColor: '#f8f9fa',
    opacity: 0.8,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  chainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chainName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default InvestmentVaultCard; 