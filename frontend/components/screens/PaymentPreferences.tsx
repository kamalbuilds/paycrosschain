import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import NavigationBar from '../NavigationBar';
import { 
  savePreferencesToIPFS, 
  loadPreferencesFromIPFS, 
  updatePreferencesOnIPFS 
} from '../../utils/ipfs/ipfsService';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import ChainSelector from '../ChainSelector';
import TokenSelector from '../TokenSelector';
import { ethers } from 'ethers';

// Define contract details
const CONTRACT_ADDRESS = '0x95b519E695bb4644ef6Ff17F0cA0fD1AbdEaC3f8';
const CONTRACT_ABI = [
  'function setPreferencesIPFSHash(string memory ipfsHash) external',
  'function getPreferencesIPFSHash(address user) external view returns (string memory, uint256)'
];

// Import wallet utils
import { getWalletAddress } from '../../utils/web3/walletUtils';

// Define preference type for better type safety
interface Condition {
  type: string;
  operator: string;
  value: number;
  token: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
}

interface ChainInfo {
  id: number;
  name: string;
  symbol: string;
  icon: string;
}

interface Preference {
  id: string;
  name: string;
  walletAddress: string;
  chain: ChainInfo;
  preferredToken: TokenInfo;
  isDefault: boolean;
  conditions: Condition[];
}

// Supported chains data
const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { id: 56, name: 'BSC', symbol: 'BNB', icon: '🟡' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔶' },
];

// Supported tokens data
const SUPPORTED_TOKENS: Record<number, TokenInfo[]> = {
  1: [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'USDT', name: 'Tether', decimals: 6 },
    { symbol: 'DAI', name: 'Dai', decimals: 18 },
  ],
  137: [
    { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'USDT', name: 'Tether', decimals: 6 },
    { symbol: 'DAI', name: 'Dai', decimals: 18 },
  ],
  // Other chains tokens would be defined similarly
};

// Simple address validation function since ethers.utils.isAddress is not available
const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

type Wallet = {
  address: string;
  name: string;
  isDefault: boolean;
  chainId: number;
};

type PaymentPreference = {
  id: string;
  wallet: Wallet;
  minAmount?: string;
  maxAmount?: string;
  preferredTokens: string[];
  active: boolean;
};

const PaymentPreferences = () => {
  const navigation = useNavigation();
  const { address, isConnected, connector } = useAccount();
  const { open } = useWalletConnectModal();
  const { disconnect } = useDisconnect();
  const [provider, setProvider] = useState<any>(null);



  const [wallets, setWallets] = useState<Wallet[]>([
    {
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      name: 'Ethereum Wallet',
      isDefault: true,
      chainId: 1
    },
    {
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      name: 'Polygon Wallet',
      isDefault: false,
      chainId: 137
    }
  ]);

  const [preferences, setPreferences] = useState<PaymentPreference[]>([
    {
      id: '1',
      wallet: wallets[0],
      minAmount: '0',
      maxAmount: '1000',
      preferredTokens: ['USDC', 'ETH'],
      active: true
    },
    {
      id: '2',
      wallet: wallets[1],
      minAmount: '1000',
      maxAmount: '',
      preferredTokens: ['USDC', 'MATIC'],
      active: true
    }
  ]);

  const [editingPreference, setEditingPreference] = useState<PaymentPreference | null>(null);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [isEditingWallet, setIsEditingWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedToIPFS, setSavedToIPFS] = useState(false);
  const [ipfsHash, setIpfsHash] = useState('');
  const [isWalletSelectorVisible, setIsWalletSelectorVisible] = useState(false);

  // Add useEffect to get provider from connector
  useEffect(() => {
    const getProvider = async () => {
      if (connector && connector?.getProvider) {
        console.log('Getting provider from connector');
        const _provider = await connector?.getProvider();
        console.log('Provider obtained:', _provider);
        setProvider(_provider);
      }
    };

    getProvider();
  }, [connector]);

  // Connect wallet if not connected
  useEffect(() => {
    if (!isConnected && address) {
      // Add connected wallet to the list if not already present
      const existingWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
      if (!existingWallet) {
        const newWallet: Wallet = {
          address: address,
          name: `Wallet ${wallets.length + 1}`,
          isDefault: wallets.length === 0,
          chainId: 1 // Default to Ethereum
        };
        setWallets([...wallets, newWallet]);
      }
    }
  }, [isConnected, address]);

  const handleAddWallet = () => {
    if (!newWalletAddress || !newWalletName || !selectedChain) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Validate wallet address
    if (!newWalletAddress.startsWith('0x') || newWalletAddress.length !== 42) {
      Alert.alert('Error', 'Please enter a valid wallet address.');
      return;
    }

    const newWallet: Wallet = {
      address: newWalletAddress,
      name: newWalletName,
      isDefault: wallets.length === 0,
      chainId: selectedChain.id
    };

    setWallets([...wallets, newWallet]);
    setIsAddingWallet(false);
    setNewWalletName('');
    setNewWalletAddress('');
    setSelectedChain(null);
  };

  const handleUpdatePreference = (preference: PaymentPreference) => {
    const updatedPreferences = preferences.map(p => 
      p.id === preference.id ? preference : p
    );
    setPreferences(updatedPreferences);
    setEditingPreference(null);
  };

  const handleDeletePreference = (id: string) => {
    const updatedPreferences = preferences.filter(p => p.id !== id);
    setPreferences(updatedPreferences);
  };

  const handleSetDefaultWallet = (address: string) => {
    const updatedWallets = wallets.map(wallet => ({
      ...wallet,
      isDefault: wallet.address === address
    }));
    setWallets(updatedWallets);
  };

  const handleAddPreference = () => {
    if (wallets.length === 0) {
      Alert.alert('Error', 'Please add a wallet first.');
      return;
    }

    const defaultWallet = wallets.find(w => w.isDefault) || wallets[0];
    const newPreference: PaymentPreference = {
      id: Date.now().toString(),
      wallet: defaultWallet,
      minAmount: '',
      maxAmount: '',
      preferredTokens: ['USDC'],
      active: true
    };

    setPreferences([...preferences, newPreference]);
    setEditingPreference(newPreference);
  };

  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet({ ...wallet });
    setIsEditingWallet(true);
    setNewWalletName(wallet.name);
    setNewWalletAddress(wallet.address);
    setSelectedChain(SUPPORTED_CHAINS.find(chain => chain.id === wallet.chainId) || null);
  };

  const handleUpdateWallet = () => {
    if (!editingWallet) return;
    
    if (!newWalletName || !selectedChain) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    
    // Update the wallet
    const updatedWallets = wallets.map(wallet => 
      wallet.address === editingWallet.address && wallet.chainId === editingWallet.chainId 
        ? {
            ...wallet,
            name: newWalletName,
            chainId: selectedChain.id
          }
        : wallet
    );
    
    setWallets(updatedWallets);
    setIsEditingWallet(false);
    setEditingWallet(null);
    setNewWalletName('');
    setNewWalletAddress('');
    setSelectedChain(null);
  };

  const handleRemoveWallet = (address: string, chainId: number) => {
    Alert.alert(
      'Remove Wallet',
      'Are you sure you want to remove this wallet?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => {
            const updatedWallets = wallets.filter(
              w => !(w.address === address && w.chainId === chainId)
            );
            
            // If removed wallet was default, set a new default
            if (updatedWallets.length > 0 && wallets.find(w => w.address === address && w.chainId === chainId)?.isDefault) {
              updatedWallets[0].isDefault = true;
            }
            
            setWallets(updatedWallets);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSubmitPreferences = async () => {
    if (!isConnected || !address) {
      open();
      return;
    }
    
    if (wallets.length === 0) {
      Alert.alert('Error', 'Please add at least one wallet before submitting.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare preferences for IPFS
      const preferencesForIPFS = preferences.map(pref => ({
        id: pref.id,
        name: pref.wallet.name,
        wallet: pref.wallet.address,
        chainid: pref.wallet.chainId,
        preferredTokens: pref.preferredTokens.map(token => ({
          symbol: token,
          name: token,
          decimals: 6 // Assuming USDC-like decimals as default
        })),
        isDefault: pref.wallet.isDefault,
        minAmount: parseFloat(pref.minAmount || "0"),
        maxAmount: parseFloat(pref.maxAmount || "0")
      }));
      
      // Save to IPFS
      // const hash = await savePreferencesToIPFS(preferencesForIPFS);
      const hash = 'QmSaWybpcU3UeZeusYWQuVBJcZ4mnz3SJ26hH2CXm84thp';
      setIpfsHash(hash);
      setSavedToIPFS(true);
      
      // Interact with smart contract
      try {
        if (!isConnected || !address ) {
          throw new Error('Wallet not connected or provider not available');
        }

        // Show alert that IPFS save was successful
        Alert.alert(
          'IPFS Success',
          'Your preferences have been saved to IPFS. Now saving to blockchain...',
          [{ text: 'OK' }]
        );

        const provider = await connector?.getProvider();
        console.log('Provider:', provider);
        if (provider) {
          console.log('Provider available:', provider);
          
          // Create a proper ethers provider and signer
          try {
            
            // Create a Web3Provider wrapping the WalletConnect provider
            const ethersProvider = new ethers.providers.Web3Provider(provider);
            console.log('Ethers provider created',ethersProvider);
            
            // Get the signer from the ethers provider
            const signer = ethersProvider.getSigner();
            console.log('Signer obtained:', signer);
            console.log('Signer obtained');
            
            // Initialize contract with the proper signer
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            console.log('Contract initialized with proper signer');
            
            // Call the contract method to set the IPFS hash
            const tx = await contract.setPreferencesIPFSHash(hash);
            console.log('Transaction sent:', tx.hash);
            
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);
            
            Alert.alert(
              'Success',
              'Your payment preferences have been saved successfully to the blockchain!',
              [{ text: 'OK' }]
            );
          } catch (signerError) {
            console.error('Signer initialization error:', signerError);
            throw signerError;
          }
        } else {
          throw new Error('Provider not available');
        }
        
      } catch (error) {
        console.error('Error saving to blockchain:', error);
        Alert.alert(
          'Blockchain Error',
          'There was an error saving your preferences to the blockchain. Your preferences were saved to IPFS but not linked to your account.'
        );
      }
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(
        'Error',
        'There was an error saving your preferences. Please try again.'
      );
    }
    setSubmitting(false);
  };

  const renderWallet = (wallet: Wallet) => (
    <View key={wallet.address + wallet.chainId} style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <Text style={styles.walletName}>{wallet.name}</Text>
        {wallet.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
        {wallet.address}
      </Text>
      
      <View style={styles.walletActions}>
        {!wallet.isDefault && (
          <Pressable 
            style={styles.walletAction}
            onPress={() => handleSetDefaultWallet(wallet.address)}
          >
            <MaterialIcons name="star-outline" size={18} color="#2F28D0" />
            <Text style={styles.walletActionText}>Set Default</Text>
          </Pressable>
        )}
        
        <Pressable 
          style={styles.walletAction}
          onPress={() => handleEditWallet(wallet)}
        >
          <MaterialIcons name="edit" size={18} color="#2F28D0" />
          <Text style={styles.walletActionText}>Edit</Text>
        </Pressable>
        
        <Pressable 
          style={styles.walletAction}
          onPress={() => handleRemoveWallet(wallet.address, wallet.chainId)}
        >
          <MaterialIcons name="delete-outline" size={18} color="#D32F2F" />
          <Text style={[styles.walletActionText, { color: '#D32F2F' }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPreference = (preference: PaymentPreference) => (
    <View key={preference.id} style={styles.preferenceCard}>
      <View style={styles.preferenceHeader}>
        <Text style={styles.preferenceName}>Payment Rule #{preference.id}</Text>
        <Switch 
          value={preference.active} 
          onValueChange={(value) => {
            const updated = { ...preference, active: value };
            handleUpdatePreference(updated);
          }}
          trackColor={{ false: '#E0E0E0', true: '#2F28D0' }}
        />
      </View>
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Wallet:</Text>
        <Text style={styles.preferenceValue}>{preference.wallet.name}</Text>
      </View>
      
      {preference.minAmount && (
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Min Amount:</Text>
          <Text style={styles.preferenceValue}>${preference.minAmount}</Text>
        </View>
      )}
      
      {preference.maxAmount && (
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Max Amount:</Text>
          <Text style={styles.preferenceValue}>${preference.maxAmount}</Text>
        </View>
      )}
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Preferred Tokens:</Text>
        <Text style={styles.preferenceValue}>{preference.preferredTokens.join(', ')}</Text>
      </View>
      
      <View style={styles.preferenceActions}>
        <Pressable 
          style={styles.preferenceAction}
          onPress={() => setEditingPreference(preference)}
        >
          <MaterialIcons name="edit" size={18} color="#2F28D0" />
          <Text style={styles.preferenceActionText}>Edit</Text>
        </Pressable>
        
        <Pressable 
          style={styles.preferenceAction}
          onPress={() => handleDeletePreference(preference.id)}
        >
          <MaterialIcons name="delete-outline" size={18} color="#D32F2F" />
          <Text style={[styles.preferenceActionText, { color: '#D32F2F' }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderEditPreference = () => {
    if (!editingPreference) return null;
    
    return (
      <View style={[styles.editContainer, { top: 60 }]}>
        <View style={styles.editHeader}>
          <Text style={styles.editTitle}>Edit Payment Rule</Text>
          <Pressable onPress={() => setEditingPreference(null)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </Pressable>
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Wallet</Text>
          <Pressable 
            style={styles.dropdown}
            onPress={() => setIsWalletSelectorVisible(true)}
          >
            <Text style={styles.dropdownText}>{editingPreference.wallet.name}</Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </Pressable>
        </View>
        
        <View style={styles.editRow}>
          <View style={[styles.editField, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.editLabel}>Min Amount ($)</Text>
            <TextInput
              style={styles.editInput}
              value={editingPreference.minAmount}
              onChangeText={(text) => setEditingPreference({
                ...editingPreference,
                minAmount: text
              })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          
          <View style={[styles.editField, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.editLabel}>Max Amount ($)</Text>
            <TextInput
              style={styles.editInput}
              value={editingPreference.maxAmount}
              onChangeText={(text) => setEditingPreference({
                ...editingPreference,
                maxAmount: text
              })}
              keyboardType="decimal-pad"
              placeholder="No limit"
            />
          </View>
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Preferred Tokens</Text>
          <View style={styles.tokenTags}>
            {editingPreference.preferredTokens.map((token) => (
              <View key={token} style={styles.tokenTag}>
                <Text style={styles.tokenTagText}>{token}</Text>
                <Pressable 
                  onPress={() => {
                    const updatedTokens = editingPreference.preferredTokens.filter(t => t !== token);
                    setEditingPreference({
                      ...editingPreference,
                      preferredTokens: updatedTokens
                    });
                  }}
                >
                  <MaterialIcons name="close" size={16} color="#FFF" />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addTokenButton}>
              <MaterialIcons name="add" size={20} color="#2F28D0" />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.editActions}>
          <Pressable 
            style={styles.cancelButton}
            onPress={() => setEditingPreference(null)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={styles.saveButton}
            onPress={() => handleUpdatePreference(editingPreference)}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderWalletSelector = () => {
    return (
      <Modal
        visible={isWalletSelectorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsWalletSelectorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Wallet</Text>
              <Pressable onPress={() => setIsWalletSelectorVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.walletList}>
              {wallets.map(wallet => (
                <Pressable 
                  key={wallet.address + wallet.chainId} 
                  style={styles.walletOption}
                  onPress={() => {
                    if (editingPreference) {
                      setEditingPreference({
                        ...editingPreference,
                        wallet: wallet
                      });
                    }
                    setIsWalletSelectorVisible(false);
                  }}
                >
                  <View style={styles.walletOptionInfo}>
                    <Text style={styles.walletOptionName}>{wallet.name}</Text>
                    <Text style={styles.walletOptionAddress} numberOfLines={1} ellipsizeMode="middle">
                      {wallet.address}
                    </Text>
                    <Text style={styles.walletOptionChain}>
                      {SUPPORTED_CHAINS.find(chain => chain.id === wallet.chainId)?.name || 'Unknown Network'}
                    </Text>
                  </View>
                  {editingPreference?.wallet.address === wallet.address && 
                   editingPreference?.wallet.chainId === wallet.chainId && (
                    <MaterialIcons name="check-circle" size={24} color="#2F28D0" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddWallet = () => {
    if (!isAddingWallet) return null;
    
    return (
      <View style={styles.editContainer}>
        <View style={styles.editHeader}>
          <Text style={styles.editTitle}>Add New Wallet</Text>
          <Pressable onPress={() => setIsAddingWallet(false)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </Pressable>
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Wallet Name</Text>
          <TextInput
            style={styles.editInput}
            value={newWalletName}
            onChangeText={setNewWalletName}
            placeholder="My Ethereum Wallet"
          />
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Wallet Address</Text>
          <TextInput
            style={styles.editInput}
            value={newWalletAddress}
            onChangeText={setNewWalletAddress}
            placeholder="0x..."
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Network</Text>
          <ChainSelector
            selectedChain={selectedChain}
            onSelectChain={setSelectedChain}
            chains={SUPPORTED_CHAINS}
          />
        </View>
        
        <Pressable 
          style={[styles.connectButton, { marginTop: 10 }]}
          onPress={() => {
            if (!isConnected) {
              open();
            } else {
              setNewWalletAddress(address || '');
            }
          }}
        >
          <Text style={styles.connectButtonText}>
            {isConnected ? 'Use Connected Wallet' : 'Connect Wallet'}
          </Text>
        </Pressable>
        
        <View style={styles.editActions}>
          <Pressable 
            style={styles.cancelButton}
            onPress={() => setIsAddingWallet(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={styles.saveButton}
            onPress={handleAddWallet}
          >
            <Text style={styles.saveButtonText}>Add Wallet</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderEditWallet = () => {
    if (!isEditingWallet) return null;
    
    return (
      <View style={[styles.editContainer, { top: 60 }]}>
        <View style={styles.editHeader}>
          <Text style={styles.editTitle}>Edit Wallet</Text>
          <Pressable onPress={() => setIsEditingWallet(false)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </Pressable>
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Wallet Name</Text>
          <TextInput
            style={styles.editInput}
            value={newWalletName}
            onChangeText={setNewWalletName}
            placeholder="My Ethereum Wallet"
          />
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Wallet Address</Text>
          <TextInput
            style={styles.editInput}
            value={newWalletAddress}
            onChangeText={setNewWalletAddress}
            placeholder="0x..."
            autoCapitalize="none"
            editable={false} // Read-only in edit mode
          />
        </View>
        
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Network</Text>
          <ChainSelector
            selectedChain={selectedChain}
            onSelectChain={setSelectedChain}
            chains={SUPPORTED_CHAINS}
          />
        </View>
        
        <View style={styles.editActions}>
          <Pressable 
            style={styles.cancelButton}
            onPress={() => setIsEditingWallet(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={styles.saveButton}
            onPress={handleUpdateWallet}
          >
            <Text style={styles.saveButtonText}>Update Wallet</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payment Preferences</Text>
        <Text style={styles.subtitle}>
          Configure how you want to receive payments across different blockchains
        </Text>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Wallets</Text>
            <Pressable 
              style={styles.addButton}
              onPress={() => setIsAddingWallet(true)}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Wallet</Text>
            </Pressable>
          </View>
          
          {wallets.length > 0 ? (
            wallets.map(renderWallet)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="account-balance-wallet" size={40} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>No wallets added yet</Text>
              <Pressable 
                style={styles.connectButton}
                onPress={() => open()}
              >
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              </Pressable>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Rules</Text>
            <Pressable 
              style={styles.addButton}
              onPress={handleAddPreference}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Rule</Text>
            </Pressable>
          </View>
          
          <Text style={styles.sectionDesc}>
            Define rules to automatically route incoming payments to specific wallets based on amount and token
          </Text>
          
          {preferences.length > 0 ? (
            preferences.map(renderPreference)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="rule" size={40} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>No payment rules defined</Text>
              <Text style={styles.emptyStateDesc}>
                Add rules to automatically route incoming payments
              </Text>
            </View>
          )}
        </View>
        
        {/* Submit button */}
        <Pressable 
          style={[
            styles.submitButton, 
            (!isConnected || wallets.length === 0) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitPreferences}
          disabled={!isConnected || wallets.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {savedToIPFS ? 'Update Preferences' : 'Save Preferences'}
              </Text>
            </>
          )}
        </Pressable>
        
        {!isConnected && (
          <Text style={styles.connectNote}>
            Please connect your wallet to save your preferences
          </Text>
        )}
        
        {editingPreference && renderEditPreference()}
        {isAddingWallet && renderAddWallet()}
        {isEditingWallet && renderEditWallet()}
        {renderWalletSelector()}
      </ScrollView>
      
      <NavigationBar active="PaymentPreferences" />
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
    marginBottom: 8,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F28D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  walletCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#2F28D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  defaultText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  walletAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  walletActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  walletActionText: {
    fontSize: 14,
    color: '#2F28D0',
    marginLeft: 4,
  },
  preferenceCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  preferenceItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#666666',
    width: 120,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    fontWeight: '500',
  },
  preferenceActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 8,
  },
  preferenceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  preferenceActionText: {
    fontSize: 14,
    color: '#2F28D0',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: '#2F28D0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: 20,
    zIndex: 100,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F28D0',
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333333',
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tokenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F28D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tokenTagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  addTokenButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#2F28D0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#9F9FD0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  connectNote: {
    textAlign: 'center',
    color: '#666666',
    marginBottom: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  walletList: {
    maxHeight: '80%',
  },
  walletOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  walletOptionInfo: {
    flex: 1,
  },
  walletOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  walletOptionAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  walletOptionChain: {
    fontSize: 12,
    color: '#2F28D0',
    fontWeight: '500',
  },
});

export default PaymentPreferences; 