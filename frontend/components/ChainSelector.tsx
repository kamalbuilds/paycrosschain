import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Define the chain interface
export interface Chain {
  id: number;
  name: string;
  symbol: string;
  icon: string;
}

// Define props interface
export interface ChainSelectorProps {
  selectedChain: Chain | null;
  onSelectChain: (chain: Chain) => void;
  chains: Chain[];
}

const ChainSelector: React.FC<ChainSelectorProps> = ({ 
  selectedChain, 
  onSelectChain,
  chains
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectChain = (chain: Chain) => {
    onSelectChain(chain);
    setModalVisible(false);
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const renderChainItem = ({ item }: { item: Chain }) => {
    const isSelected = selectedChain?.id === item.id;
    
    return (
      <Pressable
        style={[styles.chainItem, isSelected && styles.selectedChainItem]}
        onPress={() => handleSelectChain(item)}
      >
        <View style={styles.chainIconContainer}>
          <Text style={styles.chainIcon}>{item.icon}</Text>
        </View>
        <View style={styles.chainInfo}>
          <Text style={styles.chainName}>{item.name}</Text>
          <Text style={styles.chainSymbol}>{item.symbol}</Text>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#2F28D0" />
        )}
      </Pressable>
    );
  };

  return (
    <View>
      <Pressable style={styles.selector} onPress={openModal}>
        {selectedChain ? (
          <View style={styles.selectedChain}>
            <Text style={styles.chainIcon}>{selectedChain.icon}</Text>
            <Text style={styles.selectedChainName}>{selectedChain.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Select Network</Text>
        )}
        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Network</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            
            <FlatList
              data={chains}
              renderItem={renderChainItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.chainList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedChain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  selectedChainName: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
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
  chainList: {
    maxHeight: '100%',
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedChainItem: {
    backgroundColor: '#F5F8FF',
  },
  chainIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    color: '#666',
  },
});

export default ChainSelector; 