import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons';
import * as React from 'react'

const ChainModel = ({
    SUPPORTED_CHAINS,
    activeChainSelection,
    setShowChainModal,
    handleSelectChain,
}: {
    SUPPORTED_CHAINS: any[],
    activeChainSelection: string,
    setShowChainModal: (showChainModal: boolean) => void,
    handleSelectChain: (chain: any) => void,
}) => {

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        Select {activeChainSelection === 'source' ? 'Source' : 'Destination'} Chain
                    </Text>
                    <TouchableOpacity onPress={() => setShowChainModal(false)}>
                        <MaterialIcons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                    {SUPPORTED_CHAINS.map((chain) => (
                        <TouchableOpacity
                            key={chain.id}
                            style={styles.modalItem}
                            onPress={() => handleSelectChain(chain)}
                        >
                            <Text style={styles.chainIcon}>{chain.icon}</Text>
                            <Text style={styles.chainName}>{chain.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

export default ChainModel

const styles = StyleSheet.create({

    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '90%',
        maxHeight: '70%',
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 600,
    },
    modalList: {
        maxHeight: 300,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    chainIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    chainName: {
        fontSize: 14,
        marginRight: 4,
    },
})