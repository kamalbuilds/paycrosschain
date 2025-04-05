import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useAccount } from 'wagmi';
import { useWallet } from '../utils/WalletConnector';
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import NavigationBar from '../NavigationBar';
import NoditService, { SUPPORTED_CHAINS } from '../utils/NoditService';
import OneInchPortfolioService, { TimeRange, OneInchTokenValue, OneInchProfitLoss, ValueChartItem } from '../../utils/OneInchPortfolioService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceUSD?: string;
  logo?: string;
}

interface NFTData {
  address: string;
  name?: string;
  tokenId: string;
  tokenType: string;
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
  };
  imageUrl?: string;
}

interface StatsData {
  transactionCounts: {
    external: number;
    internal: number;
  };
  transferCounts: {
    tokens: number;
    nfts: number;
  };
  assets: {
    tokens: number;
    nfts: number;
    nftContracts: number;
  };
}

interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  gasUsed: string;
  gasPrice: string;
  status: string;
  contractAddress: string | null;
  functionName: string;
}

interface ChainData {
  chainId: number;
  chainName: string;
  nativeBalance: {
    balance: string;
    balanceUSD: string;
  };
  tokens: TokenData[];
  nfts: NFTData[];
  stats: StatsData;
  transactions?: TransactionData[];
}

interface OneInchData {
  tokens: OneInchTokenValue[];
  profitLoss: OneInchProfitLoss[];
  chartData: ValueChartItem[];
  protocols: any[]; // Using any for simplicity, can be typed more precisely
}

const Portfolio = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useWallet();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioData, setPortfolioData] = useState<ChainData[]>([]);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<number | null>(8453); // Default to Base
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts' | 'stats' | 'transactions' | '1inch'>('tokens');
  const [totalBalanceUSD, setTotalBalanceUSD] = useState<string>('0.00');
  
  // Add new state for custom address lookup
  const [customAddress, setCustomAddress] = useState<string>('');
  const [viewingAddress, setViewingAddress] = useState<string | undefined>(undefined);
  const [isCustomView, setIsCustomView] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  
  // Add 1inch specific state
  const [oneInchData, setOneInchData] = useState<Record<number, OneInchData>>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1month');
  const [oneInchLoading, setOneInchLoading] = useState(false);

  // Format account address
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format balance with 4 decimal places
  const formatBalance = (balance: string, decimals: number = 18) => {
    if (!balance) return '0.0000';
    const balanceNum = parseFloat(balance) / (10 ** decimals);
    if (balanceNum < 0.0001) return '<0.0001';
    return balanceNum.toFixed(4);
  };

  // Format USD balance
  const formatUSD = (balanceUSD: string) => {
    if (!balanceUSD) return '$0.00';
    const amount = parseFloat(balanceUSD);
    return amount < 0.01 ? '<$0.01' : `$${amount.toFixed(2)}`;
  };

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Reset to connected wallet view
  const resetToConnectedWallet = () => {
    if (address) {
      setViewingAddress(address);
      setIsCustomView(false);
      fetchPortfolio(address);
      fetchOneInchData(address);
    }
  };

  // Lookup custom address
  const lookupCustomAddress = () => {
    if (!customAddress || customAddress.trim() === '') {
      Alert.alert('Error', 'Please enter a valid wallet address');
      return;
    }

    // Basic address format validation
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(customAddress)) {
      Alert.alert('Error', 'Invalid wallet address format');
      return;
    }

    setViewingAddress(customAddress);
    setIsCustomView(true);
    fetchPortfolio(customAddress);
    fetchOneInchData(customAddress);
    setShowAddressInput(false);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };
  
  // New function to fetch 1inch data
  const fetchOneInchData = useCallback(async (addr: string | undefined = viewingAddress, chainId: number = selectedChain || 8453) => {
    if (!addr) return;
    
    try {
      setOneInchLoading(true);
      
      const tokens = await OneInchPortfolioService.getTokenValues(addr, chainId);
      const profitLoss = await OneInchPortfolioService.getProfitAndLoss(addr, chainId, selectedTimeRange);
      const chartData = await OneInchPortfolioService.getValueChart(addr, chainId, selectedTimeRange);
      const protocols = await OneInchPortfolioService.getProtocolsCurrentValue(addr, chainId);
      
      setOneInchData(prev => ({
        ...prev,
        [chainId]: {
          tokens,
          profitLoss,
          chartData,
          protocols
        }
      }));
    } catch (error) {
      console.error('Error fetching 1inch data:', error);
    } finally {
      setOneInchLoading(false);
    }
  }, [viewingAddress, selectedChain, selectedTimeRange]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (addr: string, chainId: number) => {
    if (!addr) return [];
    try {
      return await NoditService.getTransactions(addr, chainId);
    } catch (error) {
      console.error(`Error fetching transactions for chain ${chainId}:`, error);
      return [];
    }
  }, []);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async (addr: string | undefined = viewingAddress) => {
    if (!addr) {
      setPortfolioData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch multi-chain portfolio data
      const data = await NoditService.getMultiChainPortfolio(addr);
      
      // Fetch transactions for each chain
      const dataWithTransactions = await Promise.all(
        data.map(async (chainData) => {
          const transactions = await fetchTransactions(addr, chainData.chainId);
          return { ...chainData, transactions };
        })
      );
      
      setPortfolioData(dataWithTransactions);

      // Calculate total balance
      let total = 0;
      data.forEach((chain) => {
        // Add native balance
        total += parseFloat(chain.nativeBalance.balanceUSD || '0');
        
        // Add token balances
        chain.tokens.forEach((token) => {
          total += parseFloat(token.balanceUSD || '0');
        });
      });
      
      setTotalBalanceUSD(total.toFixed(2));

      // Get ENS name if on Ethereum (optional)
      try {
        const ensData = await NoditService.getEnsNameByAddress(addr);
        setEnsName(ensData.name);
      } catch (ensError) {
        console.log('No ENS name found');
        setEnsName(null);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions, viewingAddress]);

  // Update useEffect to load 1inch data on initial load
  useEffect(() => {
    if (viewingAddress && selectedChain) {
      fetchOneInchData(viewingAddress, selectedChain);
    }
  }, [fetchOneInchData, viewingAddress, selectedChain, selectedTimeRange]);

  // Initialize viewingAddress when address changes
  useEffect(() => {
    if (!viewingAddress && address && !isCustomView) {
      setViewingAddress(address);
    }
  }, [address, viewingAddress, isCustomView]);

  // Update onRefresh to include 1inch data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPortfolio(),
      fetchOneInchData()
    ]);
    setRefreshing(false);
  }, [fetchPortfolio, fetchOneInchData]);

  // Get 1inch data for selected chain
  const getOneInchDataForSelectedChain = () => {
    if (!selectedChain) return null;
    return oneInchData[selectedChain];
  };

  // Calculate total profit/loss
  const calculateTotalPnL = (data: OneInchProfitLoss[] | undefined) => {
    if (!data || data.length === 0) return { profit: 0, roi: 0 };
    
    // Find chain-specific data
    const chainData = data.find(item => item.chain_id === selectedChain);
    if (chainData) {
      return { profit: chainData.abs_profit_usd, roi: chainData.roi };
    }
    
    // If no chain-specific data, use overall data
    const overallData = data.find(item => item.chain_id === null);
    if (overallData) {
      return { profit: overallData.abs_profit_usd, roi: overallData.roi };
    }
    
    return { profit: 0, roi: 0 };
  };

  // Get chain icon URL
  const getChainIcon = (chainId: number) => {
    const icons: Record<number, string> = {
      1: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      8453: 'https://cryptologos.cc/logos/base-logo.png',
      137: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
      56: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      42161: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    };
    return icons[chainId] || 'https://cryptologos.cc/logos/base-logo.png';
  };

  // Filter data by selected chain
  const filteredData = selectedChain
    ? portfolioData.find(chain => chain.chainId === selectedChain)
    : portfolioData[0];

  return (
    <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
          <Text style={styles.subtitle}>Powered by Nodit</Text>
        </View>

        {/* Custom address lookup section */}
        <View style={styles.addressActionsContainer}>
          {isConnected && isCustomView && (
            <TouchableOpacity 
              style={styles.backToWalletButton} 
              onPress={resetToConnectedWallet}
            >
              <MaterialIcons name="account-circle" size={20} color="#FFFFFF" />
              <Text style={styles.backToWalletText}>My Portfolio</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.lookupButton} 
            onPress={() => setShowAddressInput(!showAddressInput)}
          >
            <MaterialIcons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.lookupButtonText}>
              {showAddressInput ? 'Cancel' : 'Lookup Address'}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddressInput && (
          <View style={styles.addressInputContainer}>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter wallet address (0x...)"
              value={customAddress}
              onChangeText={setCustomAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.addressSubmitButton}
              onPress={lookupCustomAddress}
            >
              <Text style={styles.addressSubmitText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isConnected && !isCustomView ? (
          <View style={styles.connectWalletPrompt}>
            <Text style={styles.promptText}>Connect your wallet to view your portfolio</Text>
            <AppKitButton />
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F28D0" />
            <Text style={styles.loadingText}>Loading portfolio...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchPortfolio()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Account Info */}
            <View style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>
                  {ensName || formatAddress(viewingAddress)}
                </Text>
                {ensName && (
                  <Text style={styles.accountAddress}>{formatAddress(viewingAddress)}</Text>
                )}
                {isCustomView && (
                  <View style={styles.customAddressBadge}>
                    <Text style={styles.customAddressBadgeText}>Viewing Address</Text>
                  </View>
                )}
              </View>
              <Text style={styles.totalBalance}>{formatUSD(totalBalanceUSD)}</Text>
            </View>

            {/* Chain Selector */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.chainSelectorContainer}
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.chainItem,
                    selectedChain === chain.id && styles.selectedChainItem
                  ]}
                  onPress={() => setSelectedChain(chain.id)}
                >
                  <Image
                    source={{ uri: getChainIcon(chain.id) }}
                    style={styles.chainIcon}
                  />
                  <Text style={[
                    styles.chainName,
                    selectedChain === chain.id && styles.selectedChainName
                  ]}>
                    {chain.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredData && (
              <>
                {/* Native Balance */}
                <View style={styles.balanceCard}>
                  <View style={styles.tokenRow}>
                    <Image 
                      source={{ uri: getChainIcon(filteredData.chainId) }}
                      style={styles.tokenIcon}
                    />
                    <View style={styles.tokenInfo}>
                      <Text style={styles.tokenName}>{filteredData.chainName}</Text>
                      <Text style={styles.tokenBalance}>
                        {formatBalance(filteredData.nativeBalance.balance)} {' '}
                        {filteredData.chainName === 'Ethereum' ? 'ETH' : 
                         filteredData.chainName === 'Polygon' ? 'MATIC' :
                         filteredData.chainName === 'BSC' ? 'BNB' :
                         filteredData.chainName === 'Arbitrum' ? 'ETH' : 'ETH'}
                      </Text>
                    </View>
                    <Text style={styles.tokenValue}>
                      {formatUSD(filteredData.nativeBalance.balanceUSD)}
                    </Text>
                  </View>
                </View>

                {/* Tabs for different sections */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'tokens' && styles.activeTab]}
                    onPress={() => setActiveTab('tokens')}
                  >
                    <Text style={[styles.tabText, activeTab === 'tokens' && styles.activeTabText]}>
                      Tokens
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'nfts' && styles.activeTab]}
                    onPress={() => setActiveTab('nfts')}
                  >
                    <Text style={[styles.tabText, activeTab === 'nfts' && styles.activeTabText]}>
                      NFTs
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
                    onPress={() => setActiveTab('stats')}
                  >
                    <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
                      Stats
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
                    onPress={() => setActiveTab('transactions')}
                  >
                    <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
                      Txns
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === '1inch' && styles.activeTab]}
                    onPress={() => setActiveTab('1inch')}
                  >
                    <Text style={[styles.tabText, activeTab === '1inch' && styles.activeTabText]}>
                      1inch
                    </Text>
                  </TouchableOpacity>
                </View>

                {activeTab === 'tokens' && (
                  <View style={styles.tokensContainer}>
                    <Text style={styles.sectionTitle}>Tokens ({filteredData.tokens.length})</Text>
                    
                    {filteredData.tokens.length === 0 ? (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="account-balance-wallet" size={48} color="#BDBDBD" />
                        <Text style={styles.emptyText}>No tokens found</Text>
                      </View>
                    ) : (
                      filteredData.tokens.map((token, index) => (
                        <View key={`${token.address}-${index}`} style={styles.tokenCard}>
                          <View style={styles.tokenRow}>
                            <Image 
                              source={{ uri: token.logo || 'https://cryptologos.cc/logos/base-logo.png' }}
                              style={styles.tokenIcon}
                            />
                            <View style={styles.tokenInfo}>
                              <Text style={styles.tokenName}>{token.name || token.symbol}</Text>
                              <Text style={styles.tokenBalance}>
                                {formatBalance(token.balance, token.decimals)} {token.symbol}
                              </Text>
                            </View>
                            <Text style={styles.tokenValue}>
                              {formatUSD(token.balanceUSD || '0')}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {activeTab === 'nfts' && (
                  <View style={styles.nftsContainer}>
                    <Text style={styles.sectionTitle}>NFTs ({filteredData.nfts.length})</Text>
                    
                    {filteredData.nfts.length === 0 ? (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="collections" size={48} color="#BDBDBD" />
                        <Text style={styles.emptyText}>No NFTs found</Text>
                      </View>
                    ) : (
                      <View style={styles.nftGrid}>
                        {filteredData.nfts.map((nft, index) => (
                          <View key={`${nft.address}-${nft.tokenId}-${index}`} style={styles.nftCard}>
                            <Image 
                              source={{ 
                                uri: nft.imageUrl || 
                                     nft.metadata?.image || 
                                     'https://via.placeholder.com/150?text=No+Image'
                              }}
                              style={styles.nftImage}
                              resizeMode="cover"
                            />
                            <View style={styles.nftInfo}>
                              <Text style={styles.nftName} numberOfLines={1}>
                                {nft.metadata?.name || nft.name || `NFT #${nft.tokenId}`}
                              </Text>
                              <Text style={styles.nftTokenId} numberOfLines={1}>
                                ID: {nft.tokenId}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {activeTab === 'stats' && filteredData.stats && (
                  <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Account Statistics</Text>
                    
                    <View style={styles.statsCard}>
                      <Text style={styles.statsHeader}>Transaction Counts</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.transactionCounts.external}</Text>
                          <Text style={styles.statLabel}>External</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.transactionCounts.internal || 'N/A'}</Text>
                          <Text style={styles.statLabel}>Internal</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.statsCard}>
                      <Text style={styles.statsHeader}>Transfer Counts</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.transferCounts.tokens}</Text>
                          <Text style={styles.statLabel}>Token Transfers</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.transferCounts.nfts}</Text>
                          <Text style={styles.statLabel}>NFT Transfers</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.statsCard}>
                      <Text style={styles.statsHeader}>Asset Holdings</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.assets.tokens}</Text>
                          <Text style={styles.statLabel}>Token Types</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.assets.nfts}</Text>
                          <Text style={styles.statLabel}>NFTs</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{filteredData.stats.assets.nftContracts}</Text>
                          <Text style={styles.statLabel}>NFT Collections</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {activeTab === 'transactions' && (
                  <View style={styles.transactionsContainer}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    
                    {!filteredData.transactions || filteredData.transactions.length === 0 ? (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="receipt-long" size={48} color="#BDBDBD" />
                        <Text style={styles.emptyText}>No transactions found</Text>
                      </View>
                    ) : (
                      filteredData.transactions.map((tx, index) => (
                        <View key={`${tx.hash}-${index}`} style={styles.transactionCard}>
                          <View style={styles.txHeader}>
                            <Text style={styles.txHash}>{formatAddress(tx.hash)}</Text>
                            <Text style={[
                              styles.txStatus, 
                              tx.status === 'Success' ? styles.txSuccess : styles.txFailed
                            ]}>
                              {tx.status}
                            </Text>
                          </View>
                          
                          <View style={styles.txDetails}>
                            <View style={styles.txAddresses}>
                              <View style={styles.txAddressRow}>
                                <Text style={styles.txAddressLabel}>From:</Text>
                                <Text style={styles.txAddress}>{formatAddress(tx.from)}</Text>
                              </View>
                              <View style={styles.txAddressRow}>
                                <Text style={styles.txAddressLabel}>To:</Text>
                                <Text style={styles.txAddress}>{tx.to ? formatAddress(tx.to) : 'Contract Creation'}</Text>
                              </View>
                            </View>
                            
                            <View style={styles.txValueRow}>
                              <Text style={styles.txValueLabel}>Value:</Text>
                              <Text style={styles.txValue}>
                                {formatBalance(tx.value)} {filteredData.chainName === 'Ethereum' ? 'ETH' : 
                                 filteredData.chainName === 'Polygon' ? 'MATIC' :
                                 filteredData.chainName === 'BSC' ? 'BNB' :
                                 filteredData.chainName === 'Arbitrum' ? 'ETH' : 'ETH'}
                              </Text>
                            </View>
                            
                            {tx.functionName && (
                              <View style={styles.txFunctionRow}>
                                <Text style={styles.txFunctionLabel}>Function:</Text>
                                <Text style={styles.txFunction}>{tx.functionName}</Text>
                              </View>
                            )}
                            
                            <Text style={styles.txTimestamp}>{formatDate(tx.timestamp)}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {activeTab === '1inch' && (
                  <View style={styles.oneInchContainer}>
                    <Text style={styles.sectionTitle}>1inch Portfolio Analytics</Text>
                    
                    {/* Time range selector */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.timeRangeContainer}
                    >
                      {(['1day', '1week', '1month', '3months', '1year'] as TimeRange[]).map((range) => (
                        <TouchableOpacity
                          key={range}
                          style={[
                            styles.timeRangeItem,
                            selectedTimeRange === range && styles.selectedTimeRangeItem
                          ]}
                          onPress={() => setSelectedTimeRange(range)}
                        >
                          <Text style={[
                            styles.timeRangeName,
                            selectedTimeRange === range && styles.selectedTimeRangeName
                          ]}>
                            {range === '1day' ? '1D' : 
                             range === '1week' ? '1W' : 
                             range === '1month' ? '1M' : 
                             range === '3months' ? '3M' : '1Y'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {oneInchLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2F28D0" />
                        <Text style={styles.loadingText}>Loading 1inch data...</Text>
                      </View>
                    ) : !getOneInchDataForSelectedChain() ? (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="analytics" size={48} color="#BDBDBD" />
                        <Text style={styles.emptyText}>No 1inch data available</Text>
                      </View>
                    ) : (
                      <>
                        {/* Profit/Loss Card */}
                        <View style={styles.oneInchCard}>
                          <Text style={styles.oneInchCardTitle}>Profit & Loss</Text>
                          
                          {getOneInchDataForSelectedChain()?.profitLoss && (
                            <View style={styles.pnlContainer}>
                              <View style={styles.pnlItem}>
                                <Text style={styles.pnlLabel}>Profit/Loss</Text>
                                <Text style={[
                                  styles.pnlValue,
                                  calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).profit >= 0 
                                    ? styles.positiveValue 
                                    : styles.negativeValue
                                ]}>
                                  ${Math.abs(calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).profit).toFixed(2)}
                                  {calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).profit >= 0 ? ' ↑' : ' ↓'}
                                </Text>
                              </View>
                              
                              <View style={styles.pnlItem}>
                                <Text style={styles.pnlLabel}>ROI</Text>
                                <Text style={[
                                  styles.pnlValue,
                                  calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).roi >= 0 
                                    ? styles.positiveValue 
                                    : styles.negativeValue
                                ]}>
                                  {formatPercentage(calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).roi)}
                                  {calculateTotalPnL(getOneInchDataForSelectedChain()?.profitLoss).roi >= 0 ? ' ↑' : ' ↓'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                        
                        {/* Portfolio Value Chart */}
                        {getOneInchDataForSelectedChain()?.chartData && getOneInchDataForSelectedChain()?.chartData.length > 0 && (
                          <View style={styles.oneInchCard}>
                            <Text style={styles.oneInchCardTitle}>Portfolio Value Chart</Text>
                            
                            <LineChart
                              data={{
                                labels: getOneInchDataForSelectedChain()?.chartData.map(item => {
                                  const date = new Date(item.timestamp * 1000);
                                  return selectedTimeRange === '1day' 
                                    ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                                    : `${date.getMonth() + 1}/${date.getDate()}`;
                                }).filter((_, i, arr) => i % Math.ceil(arr.length / 6) === 0) || [],
                                datasets: [{
                                  data: getOneInchDataForSelectedChain()?.chartData.map(item => item.value_usd) || []
                                }]
                              }}
                              width={width - 40}
                              height={220}
                              chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 2,
                                color: () => '#2F28D0',
                                labelColor: () => '#666666',
                                style: {
                                  borderRadius: 16
                                },
                                propsForDots: {
                                  r: '3',
                                  strokeWidth: '1',
                                  stroke: '#2F28D0'
                                }
                              }}
                              bezier
                              style={{
                                marginVertical: 8,
                                borderRadius: 16
                              }}
                            />
                          </View>
                        )}
                        
                        {/* 1inch Tokens List */}
                        <View style={styles.oneInchCard}>
                          <Text style={styles.oneInchCardTitle}>1inch Token Analytics</Text>
                          
                          {getOneInchDataForSelectedChain()?.tokens && getOneInchDataForSelectedChain()?.tokens.length > 0 ? (
                            getOneInchDataForSelectedChain()?.tokens.map((token, index) => (
                              <View key={`${token.token_address}-${index}`} style={styles.oneInchTokenRow}>
                                <View style={styles.tokenCol}>
                                  <Text style={styles.tokenSymbol}>{token.token_symbol}</Text>
                                  <Text style={styles.tokenName}>{token.token_name}</Text>
                                </View>
                                
                                <View style={styles.valueCol}>
                                  <Text style={styles.tokenBalance}>
                                    {(parseFloat(token.token_amount) / Math.pow(10, token.token_decimals)).toFixed(4)}
                                  </Text>
                                  <Text style={styles.tokenPrice}>${token.token_price_usd.toFixed(4)}</Text>
                                </View>
                                
                                <Text style={styles.tokenValue}>${token.value_usd.toFixed(2)}</Text>
                              </View>
                            ))
                          ) : (
                            <View style={styles.emptyState}>
                              <Text style={styles.emptyText}>No token data available</Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Protocols List */}
                        {getOneInchDataForSelectedChain()?.protocols && getOneInchDataForSelectedChain()?.protocols.length > 0 && (
                          <View style={styles.oneInchCard}>
                            <Text style={styles.oneInchCardTitle}>DeFi Protocols</Text>
                            
                            {getOneInchDataForSelectedChain()?.protocols.map((protocol, index) => (
                              <View key={`${protocol.protocol_id}-${index}`} style={styles.protocolRow}>
                                <Text style={styles.protocolName}>{protocol.protocol_id}</Text>
                                <Text style={styles.protocolValue}>${protocol.value_usd.toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
      
      <NavigationBar active="Portfolio" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F28D0',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  connectWalletPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  promptText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2F28D0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  accountCard: {
    backgroundColor: '#2F28D0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  accountInfo: {
    marginBottom: 12,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountAddress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chainSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F7FA',
  },
  selectedChainItem: {
    backgroundColor: 'rgba(47, 40, 208, 0.1)',
    borderColor: '#2F28D0',
  },
  chainIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  chainName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  selectedChainName: {
    color: '#2F28D0',
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8F92A1',
  },
  activeTabText: {
    color: '#2F28D0',
    fontWeight: '600',
  },
  tokensContainer: {
    marginBottom: 20,
  },
  nftsContainer: {
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  transactionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  tokenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tokenBalance: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  nftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nftCard: {
    width: (width - 52) / 2, // Account for padding and margin
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  nftImage: {
    width: '100%',
    height: (width - 52) / 2, // Make it square
    backgroundColor: '#F5F7FA',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  nftTokenId: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  // Stats styles
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F28D0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  // Transaction styles
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  txHash: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F28D0',
  },
  txStatus: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4CAF50',
  },
  txFailed: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    color: '#F44336',
  },
  txDetails: {
    marginTop: 8,
  },
  txAddresses: {
    marginBottom: 8,
  },
  txAddressRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  txAddressLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
    width: 50,
  },
  txAddress: {
    fontSize: 14,
    color: '#333333',
  },
  txValueRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  txValueLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
    width: 50,
  },
  txValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  txFunctionRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  txFunctionLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
    width: 70,
  },
  txFunction: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  txTimestamp: {
    fontSize: 12,
    color: '#8F92A1',
    marginTop: 8,
    textAlign: 'right',
  },
  // Address lookup styles
  addressActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  lookupButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lookupButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  backToWalletButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToWalletText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  addressInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addressSubmitButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addressSubmitText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customAddressBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  customAddressBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  oneInchContainer: {
    marginBottom: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeRangeItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F7FA',
  },
  selectedTimeRangeItem: {
    backgroundColor: 'rgba(47, 40, 208, 0.1)',
    borderColor: '#2F28D0',
  },
  timeRangeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  selectedTimeRangeName: {
    color: '#2F28D0',
    fontWeight: '600',
  },
  oneInchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  oneInchCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  pnlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pnlItem: {
    alignItems: 'center',
    minWidth: 100,
  },
  pnlLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  pnlValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  positiveValue: {
    color: '#4CAF50',
  },
  negativeValue: {
    color: '#F44336',
  },
  oneInchTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  tokenCol: {
    flex: 2,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tokenName: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
  },
  tokenBalance: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  tokenPrice: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    textAlign: 'right',
  },
  protocolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  protocolName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  protocolValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});

export default Portfolio; 
 