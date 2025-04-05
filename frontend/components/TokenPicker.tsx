import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Token interface
export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance?: string;
  icon?: string;
}

interface TokenPickerProps {
  selectedToken: Token | null;
  onSelectToken: (token: Token) => void;
  tokens: Token[];
  label?: string;
  disabled?: boolean;
}

const TokenPicker: React.FC<TokenPickerProps> = ({
  selectedToken,
  onSelectToken,
  tokens,
  label = 'Select Token',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const renderTokenItem = ({ item }: { item: Token }) => (
    <TouchableOpacity
      style={styles.tokenItem}
      onPress={() => {
        onSelectToken(item);
        setModalVisible(false);
      }}
    >
      <View style={styles.tokenIconContainer}>
        {item.icon ? (
          typeof item.icon === 'string' && item.icon.startsWith('http') ? (
            <Image source={{ uri: item.icon }} style={styles.tokenIcon} />
          ) : (
            <Text style={styles.tokenEmoji}>{item.icon}</Text>
          )
        ) : (
          <MaterialIcons name="token" size={24} color="#666" />
        )}
      </View>
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenName}>{item.name}</Text>
        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
      </View>
      {item.balance && (
        <Text style={styles.tokenBalance}>{item.balance}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        {selectedToken ? (
          <View style={styles.selectedToken}>
            <View style={styles.tokenIconContainer}>
              {selectedToken.icon ? (
                typeof selectedToken.icon === 'string' && selectedToken.icon.startsWith('http') ? (
                  <Image source={{ uri: selectedToken.icon }} style={styles.tokenIcon} />
                ) : (
                  <Text style={styles.tokenEmoji}>{selectedToken.icon}</Text>
                )
              ) : (
                <MaterialIcons name="token" size={24} color="#666" />
              )}
            </View>
            <Text style={[styles.selectedTokenText, disabled && styles.textDisabled]}>
              {selectedToken.symbol}
            </Text>
            {!disabled && <MaterialIcons name="arrow-drop-down" size={24} color="#666" />}
            {disabled && <MaterialIcons name="lock" size={16} color="#999" />}
          </View>
        ) : (
          <View style={styles.selectedToken}>
            <Text style={[styles.placeholderText, disabled && styles.textDisabled]}>
              Select Token
            </Text>
            {!disabled && <MaterialIcons name="arrow-drop-down" size={24} color="#666" />}
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Token</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={tokens}
              keyExtractor={(item) => item.address}
              renderItem={renderTokenItem}
              style={styles.tokenList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>No tokens available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  selectedToken: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  tokenEmoji: {
    fontSize: 20,
  },
  selectedTokenText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  textDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontWeight: '600',
    color: '#000',
  },
  tokenList: {
    maxHeight: '100%',
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#777',
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default TokenPicker; 