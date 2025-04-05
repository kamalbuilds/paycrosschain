import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useConnect, useAccount, useDisconnect, useConfig } from 'wagmi';
import { MaterialIcons } from '@expo/vector-icons';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';

// Type definition for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      [key: string]: any;
    };
  }
}

// Wallet context type
type WalletContextType = {
  isConnected: boolean;
  address: string | undefined;
  connect: () => void;
  disconnect: () => void;
  chain: {
    id: number;
    name: string;
  } | null;
  switchChain: (chainId: number) => void;
  supportedChains: { id: number; name: string }[];
  isSwitchingChain: boolean;
  error: Error | null;
  connectLoading: boolean;
};

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: undefined,
  connect: () => {},
  disconnect: () => {},
  chain: null,
  switchChain: () => {},
  supportedChains: [],
  isSwitchingChain: false,
  error: null,
  connectLoading: false,
});

export const useWallet = () => useContext(WalletContext);

const WalletConnector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = useConfig();
  const { connectAsync, connectors, status: connectStatus, error: connectError } = useConnect();
  const { address, isConnected, status: accountStatus } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const [chain, setChain] = useState<{ id: number; name: string } | null>(null);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  
  // Define supported chains from the config
  const supportedChains = config.chains.map(chain => ({
    id: chain.id,
    name: chain.name,
  }));

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      console.log('Connection error:', connectError);
      setError(connectError);
    } else {
      setError(null);
    }
  }, [connectError]);

  // Update connection loading state based on status
  useEffect(() => {
    setConnectLoading(connectStatus === 'pending');
  }, [connectStatus]);

  // Set a default chain on component mount
  useEffect(() => {
    if (config.chains.length > 0) {
      const defaultChain = config.chains[0];
      setChain({ id: defaultChain.id, name: defaultChain.name });
    }
  }, [config.chains]);

  const handleConnect = async () => {
    try {
      console.log('Handle connect called');
      setConnectLoading(true);
      
      // Use default wagmi connectAsync
      const injected = connectors.find(c => c.id === 'injected');
      const connector = injected || connectors[0];
      
      if (connector) {
        console.log('Connecting with connector:', connector.id);
        
        const result = await connectAsync({ 
          connector,
          chainId: supportedChains.length > 0 ? supportedChains[0].id : undefined 
        });
        
        console.log('Connection result:', result);
      } else {
        console.error('No wallet connectors available');
        setError(new Error('No wallet connectors available'));
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect wallet'));
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleSwitchChain = (chainId: number) => {
    // Find the chain in supported chains
    const newChain = supportedChains.find(c => c.id === chainId);
    if (newChain) {
      setIsSwitchingChain(true);
      
      // Simulate chain switching
      setTimeout(() => {
        setChain(newChain);
        setIsSwitchingChain(false);
      }, 500);
    }
  };

  const value = {
    isConnected,
    address,
    connect: handleConnect,
    disconnect: handleDisconnect,
    chain,
    switchChain: handleSwitchChain,
    supportedChains,
    isSwitchingChain,
    error,
    connectLoading,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletConnector;

// Wallet Connection Button Component
export const WalletButton: React.FC = () => {
  const { isConnected, address, connect, disconnect, connectLoading } = useWallet();
  
  if (isConnected && address) {
    return (
      <TouchableOpacity style={styles.walletButton} onPress={disconnect}>
        <MaterialIcons name="account-balance-wallet" size={18} color="#fff" />
        <Text style={styles.walletButtonText}>
          {address.substring(0, 6)}...{address.substring(38)}
        </Text>
      </TouchableOpacity>
    );
  }

  // Use AppKitButton directly - it's the button that works in AccountProfile
  return (
    <AppKitButton />
  );
};

// Network Selector Component
export const NetworkSelector: React.FC = () => {
  const { chain, switchChain, supportedChains, isSwitchingChain } = useWallet();
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

  return (
    <View style={styles.networkSelectorContainer}>
      <TouchableOpacity 
        style={styles.networkButton}
        onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
      >
        <Text style={styles.networkButtonText}>
          {chain?.name || 'Select Network'}
        </Text>
        <MaterialIcons 
          name={showNetworkDropdown ? "arrow-drop-up" : "arrow-drop-down"} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>

      {showNetworkDropdown && (
        <View style={styles.networkDropdown}>
          {supportedChains.map((supportedChain) => (
            <TouchableOpacity
              key={supportedChain.id}
              style={[
                styles.networkItem,
                chain?.id === supportedChain.id ? styles.selectedNetwork : null
              ]}
              onPress={() => {
                switchChain(supportedChain.id);
                setShowNetworkDropdown(false);
              }}
              disabled={isSwitchingChain}
            >
              <Text style={styles.networkItemText}>{supportedChain.name}</Text>
              {chain?.id === supportedChain.id && (
                <MaterialIcons name="check" size={18} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 6,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectingButton: {
    backgroundColor: '#7f8c8d',
    opacity: 0.8,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 6,
  },
  networkSelectorContainer: {
    position: 'relative',
    zIndex: 10,
  },
  networkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f8c8d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  networkButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginRight: 6,
  },
  networkDropdown: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
    zIndex: 20,
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedNetwork: {
    backgroundColor: '#f0f9ff',
  },
  networkItemText: {
    color: '#333',
    fontSize: 14,
  },
}); 