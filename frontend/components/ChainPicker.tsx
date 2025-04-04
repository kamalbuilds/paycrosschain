import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Chain interface
export interface Chain {
  id: number;
  name: string;
  symbol: string;
  icon: string;
}

interface ChainPickerProps {
  selectedChain: Chain | null;
  onSelectChain: (chain: Chain) => void;
  chains: Chain[];
  label?: string;
  disabled?: boolean;
}

const ChainPicker: React.FC<ChainPickerProps> = ({
  selectedChain,
  onSelectChain,
  chains,
  label = 'Select Network',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const renderChainItem = ({ item }: { item: Chain }) => (
    <TouchableOpacity
      style={styles.chainItem}
      onPress={() => {
        onSelectChain(item);
        setModalVisible(false);
      }}
    >
      <View style={styles.chainIconContainer}>
        <Text style={styles.chainEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.chainInfo}>
        <Text style={styles.chainName}>{item.name}</Text>
        <Text style={styles.chainSymbol}>{item.symbol}</Text>
      </View>
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
        {selectedChain ? (
          <View style={styles.selectedChain}>
            <View style={styles.chainIconContainer}>
              <Text style={styles.chainEmoji}>{selectedChain.icon}</Text>
            </View>
            <Text style={[styles.selectedChainText, disabled && styles.textDisabled]}>
              {selectedChain.name}
            </Text>
            {!disabled && <MaterialIcons name="arrow-drop-down" size={24} color="#666" />}
            {disabled && <MaterialIcons name="lock" size={16} color="#999" />}
          </View>
        ) : (
          <View style={styles.selectedChain}>
            <Text style={[styles.placeholderText, disabled && styles.textDisabled]}>
              Select Network
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
              <Text style={styles.modalTitle}>Select Network</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={chains}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderChainItem}
              style={styles.chainList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>No networks available</Text>
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
  selectedChain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainEmoji: {
    fontSize: 20,
  },
  selectedChainText: {
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
  chainList: {
    maxHeight: '100%',
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chainInfo: {
    flex: 1,
  },
  chainName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chainSymbol: {
    fontSize: 14,
    color: '#777',
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

export default ChainPicker; 