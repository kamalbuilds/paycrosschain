import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAccount } from 'wagmi';
import { useWallet } from '../utils/WalletConnector';
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import NavigationBar from '../NavigationBar';
import InvestmentVaultCard from '../InvestmentVaultCard';
import beefyService, { BeefyVault, UserInvestment } from '../utils/BeefyService';
import { ethers } from 'ethers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enhanced Vault type that includes UI-specific properties
type EnhancedVault = {
  id: string;
  name: string;
  platform: string;
  apy: number;
  tvl: string | number;
  chainId: number;
  token: string;
  tokenIcon: string;
  chainIcon: string;
  chainName: string;
  description: string;
  assets?: string[];
  depositFee?: number;
  withdrawalFee?: number;
  chain: string;
  // Required properties for BeefyVault compatibility
  tokenAddress: string;
  earnContractAddress: string;
};

// User investment type for UI purposes
type UserInvestmentWithDetails = {
  id: string;
  vaultId: string;
  vaultAddress: string;
  tokenAddress: string;
  amount: string;
  shares: string;
  chainId: number;
  chain: string;
  depositTimestamp: number;
  // UI-specific properties
  displayVault: EnhancedVault;
  currentValue: string;
  profit: number;
  profitPercentage: number;
};

// API endpoints
const API_URL = process.env.API_URL;
const VAULTS_ENDPOINT = '/api/vaults';
const USER_INVESTMENTS_ENDPOINT = '/api/investments'; 

const Investments = () => {
  const navigation = useNavigation();
  const { address, isConnected } = useAccount();
  const { connect } = useWallet();
  
  const [activeTab, setActiveTab] = useState('my-investments'); // 'my-investments' or 'all-vaults'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<UserInvestmentWithDetails[]>([]);
  const [vaults, setVaults] = useState<EnhancedVault[]>([]);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  
  // Fetch vaults data from API
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real app, replace with actual API call
        // For now using a simulated API response with a delay
        setTimeout(async () => {
          try {
            // For development purposes, we're simulating API response
            // In production, replace with: const response = await axios.get(`${API_URL}${VAULTS_ENDPOINT}`);
            const sampleVaults = [
              {
                id: '1',
                name: 'USDC Lending',
                platform: 'Beefy Finance',
                apy: 8.2,
                tvl: 12500000,
                chainId: 1,
                token: 'USDC',
                tokenIcon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
                chainName: 'Ethereum',
                description: 'Auto-compounding USDC lending strategy via Aave',
                chain: 'ethereum',
                assets: ['USDC'],
                depositFee: 0.1,
                withdrawalFee: 0.1,
                tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                earnContractAddress: '0x1234567890abcdef1234567890abcdef12345678'
              },
              {
                id: '2',
                name: 'ETH-USDC LP',
                platform: 'Beefy Finance',
                apy: 15.7,
                tvl: 8700000,
                chainId: 137,
                token: 'ETH-USDC',
                tokenIcon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                chainName: 'Polygon',
                description: 'Auto-compounding ETH-USDC liquidity pool on Uniswap V3',
                chain: 'polygon',
                assets: ['ETH', 'USDC'],
                depositFee: 0.2,
                withdrawalFee: 0.2,
                tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                earnContractAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
              },
              {
                id: '3',
                name: 'MATIC Staking',
                platform: 'Beefy Finance',
                apy: 12.3,
                tvl: 5200000,
                chainId: 137,
                token: 'MATIC',
                tokenIcon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                chainName: 'Polygon',
                description: 'Auto-compounding MATIC staking strategy',
                chain: 'polygon',
                assets: ['MATIC'],
                depositFee: 0,
                withdrawalFee: 0.1,
                tokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                earnContractAddress: '0x7890abcdef1234567890abcdef1234567890abcd'
              },
              {
                id: '4',
                name: 'Arbitrum Yield',
                platform: 'Beefy Finance',
                apy: 10.8,
                tvl: 3900000,
                chainId: 42161,
                token: 'ARB',
                tokenIcon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
                chainName: 'Arbitrum',
                description: 'Auto-compounding ARB farming strategy',
                chain: 'arbitrum',
                assets: ['ARB'],
                depositFee: 0.1,
                withdrawalFee: 0.1,
                tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
                earnContractAddress: '0xef1234567890abcdef1234567890abcdef123456'
              },
              {
                id: '5',
                name: 'BTC-ETH LP',
                platform: 'Beefy Finance',
                apy: 18.3,
                tvl: 7500000,
                chainId: 43114,
                token: 'BTC-ETH',
                tokenIcon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
                chainName: 'Avalanche',
                description: 'Auto-compounding BTC-ETH liquidity pool',
                chain: 'avalanche',
                assets: ['BTC', 'ETH'],
                depositFee: 0.2,
                withdrawalFee: 0.2,
                tokenAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
                earnContractAddress: '0xab1234567890abcdef1234567890abcdef123456'
              },
              {
                id: '6',
                name: 'BNB Staking',
                platform: 'Beefy Finance',
                apy: 7.8,
                tvl: 9300000,
                chainId: 56,
                token: 'BNB',
                tokenIcon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
                chainIcon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
                chainName: 'BNB Chain',
                description: 'Auto-compounding BNB staking strategy',
                chain: 'bsc',
                assets: ['BNB'],
                depositFee: 0,
                withdrawalFee: 0.1,
                tokenAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                earnContractAddress: '0xcd1234567890abcdef1234567890abcdef123456'
              }
            ];
            
            setVaults(sampleVaults);
            setLoading(false);
          } catch (err) {
            console.error('Error parsing vault data:', err);
            setError('Failed to parse vault data');
            setLoading(false);
          }
        }, 1500);
      } catch (err) {
        console.error('Error fetching vaults:', err);
        setError('Failed to fetch investment vaults');
        setLoading(false);
      }
    };
    
    fetchVaults();
  }, []);
  
  // Fetch user investments if connected
  useEffect(() => {
    const fetchUserInvestments = async () => {
      if (!isConnected || !address) {
        setInvestments([]);
        return;
      }
      
      try {
        setLoading(true);
        
        // In a real app, replace with actual API call
        // Example: const response = await axios.get(`${API_URL}${USER_INVESTMENTS_ENDPOINT}?address=${address}`);
        setTimeout(() => {
          // Simulate investment data based on the vaults
          const userInvestments = [
            {
              id: '1',
              vaultId: '1',
              vaultAddress: '0x1234567890abcdef1234567890abcdef12345678',
              tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              amount: '1000',
              shares: '980.5',
              chainId: 1,
              chain: 'ethereum',
              depositTimestamp: Date.parse('2023-12-15') / 1000,
              displayVault: vaults.find(v => v.id === '1') || vaults[0],
              currentValue: '1082.50',
              profit: 8.25,
              profitPercentage: 8.25
            },
            {
              id: '2',
              vaultId: '3',
              vaultAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
              tokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
              amount: '500',
              shares: '425.2',
              chainId: 137,
              chain: 'polygon',
              depositTimestamp: Date.parse('2024-01-10') / 1000,
              displayVault: vaults.find(v => v.id === '3') || vaults[2],
              currentValue: '562.30',
              profit: 12.46,
              profitPercentage: 12.46
            }
          ];
          
          setInvestments(userInvestments);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching user investments:', err);
        setError('Failed to fetch your investments');
        setLoading(false);
      }
    };
    
    if (vaults.length > 0) {
      fetchUserInvestments();
    }
  }, [isConnected, address, vaults]);
  
  // Filter vaults by selected chain
  const filteredVaults = selectedChain 
    ? vaults.filter(vault => vault.chainId === selectedChain)
    : vaults;
  
  // Investment total value
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + parseFloat(inv.currentValue), 0);
  const totalInvestedAmount = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const totalProfit = totalInvestmentValue - totalInvestedAmount;
  const profitPercentage = totalInvestedAmount > 0 
    ? (totalProfit / totalInvestedAmount) * 100 
    : 0;
  
  // Toggle between chains for filtering
  const handleChainFilter = (chainId: number) => {
    setSelectedChain(selectedChain === chainId ? null : chainId);
  };

  // Handle invest success callback
  const handleInvestSuccess = () => {
    // Refetch user investments
    setActiveTab('my-investments');
    // In a real app you would call fetchUserInvestments() here
  };
  
  // Handle invest in vault action
  const handleInvest = (vault: EnhancedVault) => {
    if (!isConnected) {
      // Use our context's connect function to open the wallet modal
      alert('Please connect your wallet first');
      return;
    }
    
    // Navigate to investment form screen
    // navigation.navigate('InvestmentForm', { vault });
    alert(`Invest in ${vault.name} on ${vault.chainName}`);
  };
  
  // Handle withdraw from investment
  const handleWithdraw = (investment: UserInvestmentWithDetails) => {
    // Show withdraw modal or navigate to withdraw screen
    // navigation.navigate('WithdrawForm', { investment });
    alert(`Withdraw from ${investment.displayVault.name}`);
  };
  
  // Date formatter
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const renderInvestmentCard = (investment: UserInvestmentWithDetails) => (
    <View key={investment.id} style={styles.investmentCard}>
      <View style={styles.investmentHeader}>
        <View style={styles.investmentInfo}>
          <Image 
            source={{ uri: investment.displayVault.tokenIcon }} 
            style={styles.tokenIcon} 
          />
          <View>
            <Text style={styles.vaultName}>{investment.displayVault.name}</Text>
            <View style={styles.chainInfo}>
              <Image 
                source={{ uri: investment.displayVault.chainIcon }} 
                style={styles.chainIcon} 
              />
              <Text style={styles.chainName}>{investment.displayVault.chainName}</Text>
            </View>
          </View>
        </View>
        <View>
          <Text style={styles.apyLabel}>APY</Text>
          <Text style={styles.apyValue}>{investment.displayVault.apy.toFixed(2)}%</Text>
        </View>
      </View>
      
      <View style={styles.investmentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Initial Investment</Text>
          <Text style={styles.detailValue}>${parseFloat(investment.amount).toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Value</Text>
          <Text style={styles.detailValue}>${parseFloat(investment.currentValue).toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Profit/Loss</Text>
          <Text style={[
            styles.profitValue,
            { color: investment.profit >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {investment.profit >= 0 ? '+' : ''}{investment.profit.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Deposit Date</Text>
          <Text style={styles.detailValue}>{formatDate(investment.depositTimestamp)}</Text>
        </View>
      </View>
      
      <View style={styles.investmentActions}>
        <Pressable 
          style={[styles.actionButton, styles.withdrawButton]}
          onPress={() => handleWithdraw(investment)}
        >
          <MaterialIcons name="account-balance-wallet" size={18} color="#2F28D0" />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, styles.investMoreButton]}
          onPress={() => handleInvest(investment.displayVault)}
        >
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.investMoreButtonText}>Invest More</Text>
        </Pressable>
      </View>
    </View>
  );
  
  // List of network filters
  const chainFilters = [
    { id: 1, name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
    { id: 137, name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
    { id: 42161, name: 'Arbitrum', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
    { id: 43114, name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
    { id: 56, name: 'BNB Chain', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  ];
  
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Investments</Text>
        
        {/* Investment Summary */}
        {activeTab === 'my-investments' && investments.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Portfolio Summary</Text>
            <View style={styles.summaryDetails}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>${totalInvestmentValue.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Profit/Loss</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: totalProfit >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD ({profitPercentage.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <Pressable 
            style={[
              styles.tab, 
              activeTab === 'my-investments' && styles.activeTab
            ]}
            onPress={() => setActiveTab('my-investments')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'my-investments' && styles.activeTabText
            ]}>
              My Investments
            </Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.tab, 
              activeTab === 'all-vaults' && styles.activeTab
            ]}
            onPress={() => setActiveTab('all-vaults')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'all-vaults' && styles.activeTabText
            ]}>
              Available Vaults
            </Text>
          </Pressable>
        </View>
        
        {/* Chain Filters */}
        {activeTab === 'all-vaults' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chainFilters}
          >
            {chainFilters.map(chain => (
              <Pressable 
                key={chain.id}
                style={[
                  styles.chainFilter,
                  selectedChain === chain.id && styles.selectedChainFilter
                ]}
                onPress={() => handleChainFilter(chain.id)}
              >
                <Image 
                  source={{ uri: chain.icon }} 
                  style={styles.chainFilterIcon} 
                />
                <Text style={[
                  styles.chainFilterText,
                  selectedChain === chain.id && styles.selectedChainFilterText
                ]}>
                  {chain.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        
        {/* My Investments List */}
        {activeTab === 'my-investments' && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2F28D0" />
                <Text style={styles.loadingText}>Loading your investments...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={60} color="#F44336" />
                <Text style={styles.errorTitle}>Error Loading Data</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : investments.length > 0 ? (
              <View style={styles.investmentsList}>
                {investments.map(renderInvestmentCard)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="savings" size={60} color="#CCCCCC" />
                <Text style={styles.emptyStateTitle}>No Investments Yet</Text>
                <Text style={styles.emptyStateText}>
                  Start growing your assets by investing in one of our vaults.
                </Text>
                <Pressable 
                  style={styles.exploreButton}
                  onPress={() => setActiveTab('all-vaults')}
                >
                  <Text style={styles.exploreButtonText}>Explore Vaults</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
        
        {/* Available Vaults List */}
        {activeTab === 'all-vaults' && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2F28D0" />
                <Text style={styles.loadingText}>Loading investment vaults...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={60} color="#F44336" />
                <Text style={styles.errorTitle}>Error Loading Data</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : filteredVaults.length > 0 ? (
              <View style={styles.vaultsList}>
                {filteredVaults.map(vault => (
                  <InvestmentVaultCard 
                    key={vault.id} 
                    vault={vault as unknown as BeefyVault} 
                    onInvestSuccess={handleInvestSuccess}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Vaults Found</Text>
                <Text style={styles.emptyStateText}>
                  {selectedChain ? 'No vaults available for the selected chain. Try another chain.' : 'No investment vaults available at the moment.'}
                </Text>
                {selectedChain && (
                  <Pressable 
                    style={styles.resetFilterButton}
                    onPress={() => setSelectedChain(null)}
                  >
                    <Text style={styles.resetFilterButtonText}>Reset Filter</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      <NavigationBar active="Investments" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F28D0',
    marginBottom: 20,
    marginTop: 40,
  },
  summaryCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  summaryDetails: {
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#2F28D0',
    fontWeight: '600',
  },
  chainFilters: {
    paddingBottom: 15,
    gap: 10,
  },
  chainFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedChainFilter: {
    backgroundColor: '#2F28D0',
  },
  chainFilterIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  chainFilterText: {
    fontSize: 14,
    color: '#666666',
  },
  selectedChainFilterText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  investmentsList: {
    gap: 16,
  },
  investmentCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  investmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  vaultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  chainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  chainName: {
    fontSize: 14,
    color: '#666666',
  },
  apyLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
  },
  apyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    textAlign: 'right',
  },
  investmentDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  investmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  withdrawButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#2F28D0',
    marginRight: 8,
  },
  withdrawButtonText: {
    color: '#2F28D0',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  investMoreButton: {
    backgroundColor: '#2F28D0',
    marginLeft: 8,
  },
  investMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  vaultsList: {
    gap: 16,
  },
  vaultCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformName: {
    fontSize: 14,
    color: '#666666',
  },
  vaultDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    lineHeight: 20,
  },
  vaultDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  vaultDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTokenIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  investButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  investButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 30,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resetFilterButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#2F28D0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resetFilterButtonText: {
    color: '#2F28D0',
    fontSize: 14,
    fontWeight: '500',
  },
  connectContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  connectText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
});

export default Investments; 