import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import NavigationBar from '../NavigationBar';
import { WalletButton } from '../utils/WalletConnector';
import { useWallet } from '../utils/WalletConnector';
import { useGlobalContext } from '../../context/GlobalContext';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define the navigation param list
type RootStackParamList = {
  Home: undefined;
  ChainsChoose: undefined;
  TokensChoose: undefined;
  AccountProfile: undefined;
  PaymentPreferences: undefined;
  Investments: undefined;
  CrossChainPayment: undefined;
  Portfolio: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isConnected, address, error: walletError, connectLoading } = useWallet();
  const {
    userInvestments,
    loadingUserInvestments,
    fetchUserInvestments,
    paymentPreferences,
    loadingPaymentPreferences,
    fetchPaymentPreferences,
    groups
  } = useGlobalContext();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();


  // Handle wallet connection errors
  useEffect(() => {
    if (walletError) {
      console.error('Wallet connection error:', walletError);
      Alert.alert(
        'Wallet Connection Error',
        'There was a problem connecting to your wallet. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [walletError]);

  useEffect(() => {
    if (isConnected) {
      fetchUserInvestments();
      fetchPaymentPreferences();
    }
  }, [isConnected]);

  // Calculate total investments value
  const totalInvestmentValue = userInvestments.reduce(
    (total, investment) => total + investment.value,
    0
  );

  // Format amount with K/M suffix for large numbers
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        {/* Header with wallet */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome{isConnected ? ' back' : ''}
            </Text>
            {isConnected && address && (
              <Text style={styles.addressText}>
                {address.substring(0, 6)}...{address.substring(38)}
              </Text>
            )}
          </View>
          <WalletButton />
        </View>

        {/* Connect wallet prompt (if not connected) */}
        {!isConnected && (
          <View style={styles.connectPrompt}>
            <MaterialIcons name="account-balance-wallet" size={40} color="#3498db" />
            <Text style={styles.connectPromptTitle}>Connect Your Wallet</Text>
            <Text style={styles.connectPromptText}>
              Connect your wallet to access cross-chain payments, investment
              vaults, and expense splitting features.
            </Text>
            <View style={styles.appKitButtonContainer}>
              <AppKitButton />
            </View>
            {connectLoading && (
              <Text style={styles.connectingText}>Connecting...</Text>
            )}
          </View>
        )}

        {/* Feature Cards */}
        <Text style={styles.sectionTitle}>Core Features</Text>
        <View style={styles.featureCards}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('CrossChainPayment')}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: '#e3f2fd' }]}>
              <MaterialIcons name="swap-horiz" size={24} color="#2196f3" />
            </View>
            <Text style={styles.featureTitle}>Cross-Chain Payment</Text>
            <Text style={styles.featureDescription}>
              Send payments across different blockchains with ease
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Investments')}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialIcons name="trending-up" size={24} color="#4caf50" />
            </View>
            <Text style={styles.featureTitle}>Investment Vaults</Text>
            <Text style={styles.featureDescription}>
              Auto-compounding vaults with optimal yields
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: '#e1f5fe' }]}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#03a9f4" />
            </View>
            <Text style={styles.featureTitle}>Portfolio</Text>
            <Text style={styles.featureDescription}>
              Track your multi-chain assets with Nodit API
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('PaymentPreferences')}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: '#f3e5f5' }]}>
              <MaterialIcons name="settings" size={24} color="#9c27b0" />
            </View>
            <Text style={styles.featureTitle}>Payment Preferences</Text>
            <Text style={styles.featureDescription}>
              Set up your preferred payment methods and routing rules
            </Text>
          </TouchableOpacity>
        </View>

        {/* Portfolio Overview (if connected) */}
        {isConnected && (
          <>
            <Text style={styles.sectionTitle}>Portfolio Overview</Text>
            <View style={styles.portfolioCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>Your Investments</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Investments')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {loadingUserInvestments ? (
                <Text style={styles.loadingText}>Loading investments...</Text>
              ) : userInvestments.length > 0 ? (
                <>
                  <View style={styles.portfolioSummary}>
                    <View>
                      <Text style={styles.portfolioValueLabel}>Total Value</Text>
                      <Text style={styles.portfolioValue}>
                        {formatAmount(totalInvestmentValue)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.portfolioValueLabel}>Profit/Loss</Text>
                      <Text
                        style={[
                          styles.portfolioValue,
                          { color: '#4caf50' },
                        ]}
                      >
                        +{formatAmount(
                          userInvestments.reduce(
                            (total, investment) => total + investment.profit,
                            0
                          )
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.investmentList}>
                    {userInvestments.slice(0, 2).map((investment) => (
                      <View key={investment.id} style={styles.investmentItem}>
                        <View style={styles.investmentInfo}>
                          <Text style={styles.investmentName}>
                            {investment.token}
                          </Text>
                          <Text style={styles.investmentDate}>
                            {investment.depositDate.toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.investmentValues}>
                          <Text style={styles.investmentValue}>
                            {formatAmount(investment.value)}
                          </Text>
        <Text
                            style={[
                              styles.investmentProfit,
                              {
                                color:
                                  investment.profit >= 0 ? '#4caf50' : '#f44336',
                              },
                            ]}
                          >
                            {investment.profit >= 0 ? '+' : ''}
                            {investment.profitPercentage.toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No investments yet</Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => navigation.navigate('Investments')}
                  >
                    <Text style={styles.emptyStateButtonText}>
                      Start Investing
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Payment Preferences */}
            <View style={styles.preferencesCard}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>
                  Payment Preferences
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PaymentPreferences')}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {loadingPaymentPreferences ? (
                <Text style={styles.loadingText}>
                  Loading payment preferences...
                </Text>
              ) : paymentPreferences.length > 0 ? (
                <View style={styles.preferencesList}>
                  {paymentPreferences.slice(0, 2).map((preference) => (
                    <View key={preference.id} style={styles.preferenceItem}>
                      <View style={styles.preferenceIconContainer}>
                        <Text style={styles.preferenceIcon}>
                          {preference.chain.icon}
                        </Text>
                      </View>
                      <View style={styles.preferenceInfo}>
                        <Text style={styles.preferenceName}>
                          {preference.name}
                        </Text>
                        <Text style={styles.preferenceDetails}>
                          {preference.chain.name} • {preference.token.symbol}
        </Text>
      </View>
                      {preference.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No payment preferences set
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => navigation.navigate('PaymentPreferences')}
                  >
                    <Text style={styles.emptyStateButtonText}>
                      Set Preferences
                    </Text>
                  </TouchableOpacity>
        </View>
              )}
      </View>
          </>
        )}
      </ScrollView>
      <NavigationBar active={"home"} navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  connectPrompt: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectPromptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  connectPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498db',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  portfolioSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  portfolioValueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  investmentList: {
    marginTop: 8,
  },
  investmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  investmentInfo: {
    flex: 1,
  },
  investmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  investmentDate: {
    fontSize: 12,
    color: '#666',
  },
  investmentValues: {
    alignItems: 'flex-end',
  },
  investmentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  investmentProfit: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyStateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  preferencesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferencesList: {
    marginTop: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preferenceIcon: {
    fontSize: 20,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  preferenceDetails: {
    fontSize: 12,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  connectingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#3498db',
    fontStyle: 'italic',
  },
  appKitButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
});

export default Home;
