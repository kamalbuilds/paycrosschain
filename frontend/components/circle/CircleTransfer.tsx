import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons';
import { useCrossChainTransfer } from '../../hooks/useCrossChainTransfer';
import ChainModel from './ChainModel';
import * as React from 'react'
import { useAccount } from 'wagmi';
import { encodeFunctionData, parseUnits } from 'viem';

// Test chains
const SUPPORTED_CHAINS = [
    { id: 11155111, name: 'Ethereum Sepolia', symbol: 'ETH', icon: '🔷' },
    { id: 43113, name: 'Avalanche Fuji', symbol: 'AVAX', icon: '🔺' },
    { id: 84532, name: 'Base Sepolia', symbol: 'ETH', icon: '🔵' },
];

const MOCK_TOKENS: Record<number, Array<{
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    icon: string;
}>> = {
    11155111: [
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '500.00', icon: '💵' },
    ],
    43113: [
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '150.00', icon: '💵' },
    ],
    84532: [
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '100.00', icon: '💵' },
    ],
};

const CircleTransfer = () => {

    const { executeTransfer, currentStep, logs, error } = useCrossChainTransfer();

    const [sourceChain, setSourceChain] = useState(SUPPORTED_CHAINS[0]);
    const [destinationChain, setDestinationChain] = useState(SUPPORTED_CHAINS[1]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [showChainModal, setShowChainModal] = useState(false);

    const [activeChainSelection, setActiveChainSelection] = useState<'source' | 'destination'>('source');

    const [amount, setAmount] = useState<string>('');
    const [recipient, setRecipient] = useState<string>('');


    const { address, isConnected } = useAccount();
    const handleSelectChain = (chain: any) => {

        if (activeChainSelection === 'source') {
            setSourceChain(chain)
        } else {
            setDestinationChain(chain)
        }

        setShowChainModal(false);
    }

    const handleSwapChains = () => {
        const tempChain = sourceChain;

        setSourceChain(destinationChain);
        setDestinationChain(tempChain);
        setAmount('');
    }

    const handleTransfer = async () => {
        console.log("Datas >>", sourceChain, destinationChain, amount, recipient);

        if (!address) {
            return null
        }
        try {
            const numericAmount = parseUnits(amount, 6);

            const hookData = encodeFunctionData({
                // here add the beefy vault abi
                abi: [
                    {
                        constant: false,
                        inputs: [
                            { name: "_to", type: "address" },
                            { name: "_value", type: "uint256" },
                        ],
                        name: "transfer",
                        outputs: [],
                        payable: false,
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                ],
                functionName: "transfer",
                args: ['0x9452BCAf507CD6547574b78B810a723d8868C85a', numericAmount]
            })

            console.log("encoded hookData", hookData);
            setIsProcessing(true);

            await executeTransfer(sourceChain.id, destinationChain.id, amount, recipient, hookData);
        } catch (error) {
            console.log("Error in transferring", error)
        } finally {
            setIsProcessing(false);
        }
    }

    console.log("currentStep", currentStep);
    console.log("Error", error);

    return (
        <>
            <View>
                <Text>Circle Transfer</Text>

                <Text>{logs.map((log, index) => <Text key={index}>{log}</Text>)}</Text>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Source</Text>

                    <View style={styles.row}>
                        <TouchableOpacity
                            style={styles.chainSelector}
                            onPress={() => {
                                setActiveChainSelection('source');
                                setShowChainModal(true);
                            }}
                        >
                            <Text style={styles.chainIcon}>{sourceChain.icon}</Text>
                            <Text style={styles.chainName}>{sourceChain.name}</Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tokenSelector}
                        >
                            <Text style={styles.tokenSymbol}>USDC</Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.amountContainer}>
                        <Text style={styles.balanceText}>
                            Balance: {MOCK_TOKENS[sourceChain.id]?.[0]?.balance || '0'} USDC
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.swapButton} onPress={handleSwapChains}>
                    <MaterialIcons name="swap-vert" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Destination</Text>

                    <View style={styles.row}>
                        <TouchableOpacity
                            style={styles.chainSelector}
                            onPress={() => {
                                setActiveChainSelection('destination');
                                setShowChainModal(true);
                            }}
                        >
                            <Text style={styles.chainIcon}>{destinationChain.icon}</Text>
                            <Text style={styles.chainName}>{destinationChain.name}</Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tokenSelector}
                        >
                            <Text style={styles.tokenSymbol}>USDC</Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Amount</Text>

                    <View style={styles.recipientInputContainer}>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Recipient</Text>

                    <View style={styles.recipientContainer}>
                        <View style={styles.recipientInputContainer}>
                            <TextInput
                                style={styles.recipientInput}
                                value={recipient}
                                onChangeText={setRecipient}
                                placeholder="Enter wallet address (0x...)"
                            />
                        </View>

                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        (!amount || isProcessing) && styles.sendButtonDisabled
                    ]}
                    onPress={handleTransfer}
                    disabled={!amount || isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : address ? (<Text style={styles.sendButtonText}>Send Payment</Text>) : <Text style={styles.sendButtonText}>Connect Wallet</Text>}
                </TouchableOpacity>

            </View>
            {showChainModal && <ChainModel
                SUPPORTED_CHAINS={SUPPORTED_CHAINS}
                activeChainSelection={activeChainSelection}
                setShowChainModal={setShowChainModal}
                handleSelectChain={handleSelectChain}
            />}
        </>
    )
}

export { CircleTransfer }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 20,
    },
    card: {
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    chainSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        marginRight: 12,
    },
    chainIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    chainName: {
        fontSize: 14,
        marginRight: 4,
    },
    tokenSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
    },
    tokenIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    tokenSymbol: {
        fontSize: 14,
        marginRight: 4,
    },
    amountContainer: {
        marginBottom: 8,
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 600,
        marginBottom: 8,
    },
    balanceText: {
        fontSize: 14,
        color: '#6c757d',
    },
    swapButton: {
        alignSelf: 'center',
        backgroundColor: '#2F28D0',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -24,
        marginBottom: -24,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    estimatedContainer: {
        marginBottom: 16,
    },
    estimatedLabel: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 4,
    },
    estimatedAmount: {
        fontSize: 24,
        fontWeight: 600,
    },
    quoteContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    quoteLabel: {
        fontSize: 14,
        color: '#6c757d',
    },
    quoteValue: {
        fontSize: 14,
        fontWeight: 500,
    },
    fusionBadge: {
        backgroundColor: '#e6f7ff',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    fusionText: {
        color: '#0071ce',
        fontSize: 12,
        fontWeight: 500,
    },
    recipientContainer: {
        marginBottom: 8,
    },
    recipientInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    recipientInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginRight: 8,
    },
    recipientButton: {
        padding: 10,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
    },
    selectedRecipient: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    recipientAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    recipientName: {
        fontSize: 14,
        fontWeight: 500,
    },
    sendButton: {
        backgroundColor: '#2F28D0',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    sendButtonDisabled: {
        backgroundColor: '#adb5bd',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 600,
    },
    infoCard: {
        backgroundColor: '#e6f2ff',
        borderRadius: 12,
        padding: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 8,
        color: '#0071ce',
    },
    infoText: {
        fontSize: 14,
        color: '#212529',
        marginBottom: 8,
    },
    // Modal styles
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
    tokenInfo: {
        flex: 1,
    },
    tokenName: {
        fontSize: 14,
        fontWeight: 500,
    },
    tokenBalance: {
        fontSize: 12,
        color: '#6c757d',
    },
    recipientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    recipientInfo: {
        flex: 1,
    },
    recipientAddress: {
        fontSize: 12,
        color: '#6c757d',
    },

})