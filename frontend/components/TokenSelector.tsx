import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Define token type
interface Token {
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  icon: string;
  address: string;
}

interface TokenSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  tokens: Token[];
  selectedToken?: Token;
  onSelectToken: (token: Token) => void;
}

const TokenSelector = ({
  isVisible,
  onClose,
  tokens,
  selectedToken,
  onSelectToken,
}: TokenSelectorProps) => {
  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    onClose();
  };

  const renderToken = ({ item }: { item: Token }) => {
    const isSelected = selectedToken?.address === item.address;
    
    return (
      <Pressable
        style={[styles.tokenItem, isSelected && styles.selectedTokenItem]}
        onPress={() => handleSelectToken(item)}
      >
        <Image source={{ uri: item.icon }} style={styles.tokenIcon} />
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenName}>{item.name}</Text>
        </View>
        {item.balance && (
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceText}>{item.balance}</Text>
          </View>
        )}
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#2F28D0" />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Token</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </Pressable>
          </View>
          
          <FlatList
            data={tokens}
            renderItem={renderToken}
            keyExtractor={(item) => item.address}
            showsVerticalScrollIndicator={false}
            style={styles.tokenList}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tokenList: {
    marginTop: 10,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedTokenItem: {
    backgroundColor: '#F5F8FF',
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
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tokenName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  balanceContainer: {
    marginRight: 10,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

export default TokenSelector; 