import React, { createContext, ReactNode, useEffect, useState, useContext } from "react";
import { useWallet } from "../components/utils/WalletConnector";
import { Chain } from "../components/ChainPicker";
import { Token } from "../components/TokenPicker";

// Define interfaces for the global context
export interface BeefyVault {
    id: string;
    name: string;
    chain: string;
    chainId: number;
    token: string;
    tokenAddress: string;
    earnedToken: string;
    earnedTokenAddress: string;
    apy: number;
    tvl: number;
    oracleId: string;
    status: string;
    platform: string;
    assets: string[];
    depositFee: number;
    withdrawalFee: number;
}

export interface UserInvestment {
    id: string;
    vaultId: string;
    amount: number;
    token: string;
    value: number;
    depositDate: Date;
    profit: number;
    profitPercentage: number;
}

export interface PaymentPreference {
    id: string;
    name: string;
    walletAddress: string;
    chain: Chain;
    token: Token;
    isDefault: boolean;
    conditions: Array<{
        type: string;
        operator: string;
        value: number;
        token?: string;
    }>;
}

// Define Group and GroupExpense types
export interface GroupExpense {
    id: string;
    groupId: string;
    name: string;
    amount: number;
    currency: string;
    date: Date;
    participants: Array<{
        id: string;
        name: string;
        share: number;
    }>;
    createdBy: string;
    isPaid: boolean;
    paymentTx?: string;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    members: Array<{
        id: string;
        name: string;
        walletAddress: string;
    }>;
    expenses: GroupExpense[];
    createdAt: Date;
    createdBy: string;
}

// Define the context type
interface GlobalContextType {
    // Beefy vaults
    allBeefyVaults: BeefyVault[] | null;
    loadingBeefyVaults: boolean;
    setAllBeefyVaults: React.Dispatch<React.SetStateAction<BeefyVault[] | null>>;
    fetchAllBeefyVaults: () => Promise<BeefyVault[]>;
    fetchBeefyVaultsByChain: (params: { chain: 'ethereum' | 'polygon' | 'avax' | 'arbitrum' | 'base' }) => Promise<BeefyVault[]>;

    // User investments
    userInvestments: UserInvestment[];
    setUserInvestments: React.Dispatch<React.SetStateAction<UserInvestment[]>>;
    loadingUserInvestments: boolean;
    fetchUserInvestments: () => Promise<UserInvestment[]>;
    
    // Payment preferences
    paymentPreferences: PaymentPreference[];
    setPaymentPreferences: React.Dispatch<React.SetStateAction<PaymentPreference[]>>;
    loadingPaymentPreferences: boolean;
    fetchPaymentPreferences: () => Promise<PaymentPreference[]>;
    addPaymentPreference: (preference: PaymentPreference) => Promise<void>;
    updatePaymentPreference: (preference: PaymentPreference) => Promise<void>;
    removePaymentPreference: (preferenceId: string) => Promise<void>;
    
    // Group management
    groups: Group[];
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
    loadingGroups: boolean;
    fetchGroups: () => Promise<Group[]>;
    createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'createdBy'>) => Promise<Group>;
    addExpense: (expense: Omit<GroupExpense, 'id'>) => Promise<GroupExpense>;
    settleExpense: (expenseId: string, paymentDetails: any) => Promise<void>;
    
    // Tokens and chains data
    supportedChains: Chain[];
    tokensForChain: (chainId: number) => Token[];
}

// Create the context with default values
export const GlobalContext = createContext<GlobalContextType>({
    allBeefyVaults: null,
    loadingBeefyVaults: false,
    setAllBeefyVaults: () => {},
    fetchAllBeefyVaults: async () => [],
    fetchBeefyVaultsByChain: async () => [],
    
    userInvestments: [],
    setUserInvestments: () => {},
    loadingUserInvestments: false,
    fetchUserInvestments: async () => [],
    
    paymentPreferences: [],
    setPaymentPreferences: () => {},
    loadingPaymentPreferences: false,
    fetchPaymentPreferences: async () => [],
    addPaymentPreference: async () => {},
    updatePaymentPreference: async () => {},
    removePaymentPreference: async () => {},
    
    groups: [],
    setGroups: () => {},
    loadingGroups: false,
    fetchGroups: async () => [],
    createGroup: async () => ({ id: '', name: '', description: '', members: [], expenses: [], createdAt: new Date(), createdBy: '' }),
    addExpense: async () => ({ id: '', groupId: '', name: '', amount: 0, currency: '', date: new Date(), participants: [], createdBy: '', isPaid: false }),
    settleExpense: async () => {},
    
    supportedChains: [],
    tokensForChain: () => [],
});

// Define the supported chains
const SUPPORTED_CHAINS: Chain[] = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
    { id: 56, name: 'BSC', symbol: 'BNB', icon: '🟡' },
    { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
    { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔶' },
];

// Define the supported tokens per chain
const SUPPORTED_TOKENS: Record<number, Token[]> = {
    1: [
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '1.25', icon: '🔷', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '500.00', icon: '💵', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { symbol: 'USDT', name: 'Tether', decimals: 6, balance: '500.00', icon: '💵', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'DAI', name: 'Dai', decimals: 18, balance: '500.00', icon: '💵', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
    ],
    137: [
        { symbol: 'MATIC', name: 'Polygon', decimals: 18, balance: '1000.00', icon: '🟣', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '200.00', icon: '💵', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
        { symbol: 'USDT', name: 'Tether', decimals: 6, balance: '200.00', icon: '💵', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
        { symbol: 'DAI', name: 'Dai', decimals: 18, balance: '200.00', icon: '💵', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
    ],
    56: [
        { symbol: 'BNB', name: 'Binance Coin', decimals: 18, balance: '5.00', icon: '🟡', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '300.00', icon: '💵', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
        { symbol: 'BUSD', name: 'Binance USD', decimals: 18, balance: '300.00', icon: '💵', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
    ],
    43114: [
        { symbol: 'AVAX', name: 'Avalanche', decimals: 18, balance: '10.00', icon: '🔺', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '150.00', icon: '💵', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
    ],
    8453: [
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '0.50', icon: '🔵', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '100.00', icon: '💵', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    ],
    42161: [
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, balance: '0.75', icon: '🔶', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '250.00', icon: '💵', address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
    ],
};

// Hook to use the global context
export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalContextProvider = ({ children }: { children: ReactNode }) => {
    // Get wallet state
    const { address } = useWallet();

    // Beefy vaults state
    const [allBeefyVaults, setAllBeefyVaults] = useState<BeefyVault[] | null>(null);
    const [loadingBeefyVaults, setLoadingBeefyVaults] = useState(false);

    // User investments state
    const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
    const [loadingUserInvestments, setLoadingUserInvestments] = useState(false);
    
    // Payment preferences state
    const [paymentPreferences, setPaymentPreferences] = useState<PaymentPreference[]>([]);
    const [loadingPaymentPreferences, setLoadingPaymentPreferences] = useState(false);
    
    // Groups state
    const [groups, setGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Fetch Beefy vaults
    const fetchAllBeefyVaults = async () => {
        setLoadingBeefyVaults(true);
        try {
            const res = await fetch('https://api.beefy.finance/vaults');
            const response = await res.json();
            
            // Convert the response to our BeefyVault type
            const vaults: BeefyVault[] = response.map((vault: any) => ({
                id: vault.id,
                name: vault.name,
                chain: vault.chain || '',
                chainId: getChainIdFromName(vault.chain || ''),
                token: vault.token || '',
                tokenAddress: vault.tokenAddress || '',
                earnedToken: vault.earnedToken || '',
                earnedTokenAddress: vault.earnedTokenAddress || '',
                apy: parseFloat(vault.apy) || 0,
                tvl: parseFloat(vault.tvl) || 0,
                oracleId: vault.oracleId || '',
                status: vault.status || '',
                platform: vault.platform || '',
                assets: vault.assets || [],
                depositFee: parseFloat(vault.depositFee) || 0,
                withdrawalFee: parseFloat(vault.withdrawalFee) || 0,
            }));
            
            setAllBeefyVaults(vaults);
            return vaults;
        } catch (error) {
            console.error('Error fetching Beefy vaults:', error);
            return [];
        } finally {
            setLoadingBeefyVaults(false);
        }
    };

    const fetchBeefyVaultsByChain = async ({ chain }: { chain: 'ethereum' | 'polygon' | 'avax' | 'arbitrum' | 'base' }) => {
        // Map the chain name to the chain ID
        const chainMap: Record<string, string> = {
            'ethereum': 'ethereum',
            'polygon': 'polygon',
            'avax': 'avalanche',
            'arbitrum': 'arbitrum',
            'base': 'base',
        };
        
        // Convert the chain name to the format used by Beefy API
        const beefyChain = chainMap[chain] || chain;
        
        if (!allBeefyVaults) {
            await fetchAllBeefyVaults();
        }
        
        // Return vaults filtered by chain
        return (allBeefyVaults || []).filter(vault => vault.chain.toLowerCase() === beefyChain.toLowerCase());
    };

    // Fetch user investments
    const fetchUserInvestments = async () => {
        if (!address) return [];
        
        setLoadingUserInvestments(true);
        try {
            // Mock data - in a real app this would be a call to your backend or smart contract
            const mockInvestments: UserInvestment[] = [
                {
                    id: '1',
                    vaultId: 'moo-eth-usdc',
                    amount: 500,
                    token: 'USDC',
                    value: 520,
                    depositDate: new Date('2023-01-05'),
                    profit: 20,
                    profitPercentage: 4,
                },
                {
                    id: '2',
                    vaultId: 'moo-polygon-usdc-aave',
                    amount: 250,
                    token: 'USDC',
                    value: 275,
                    depositDate: new Date('2023-02-10'),
                    profit: 25,
                    profitPercentage: 10,
                },
                {
                    id: '3',
                    vaultId: 'moo-base-eth-usdc',
                    amount: 100,
                    token: 'USDC',
                    value: 110,
                    depositDate: new Date('2023-03-15'),
                    profit: 10,
                    profitPercentage: 10,
                },
            ];
            
            setUserInvestments(mockInvestments);
            return mockInvestments;
        } catch (error) {
            console.error('Error fetching user investments:', error);
            return [];
        } finally {
            setLoadingUserInvestments(false);
        }
    };

    // Fetch payment preferences
    const fetchPaymentPreferences = async () => {
        if (!address) return [];
        
        setLoadingPaymentPreferences(true);
        try {
            // Mock data - in a real app this would be a call to your backend or smart contract
            const mockPreferences: PaymentPreference[] = [
                {
                    id: '1',
                    name: 'Default Ethereum',
                    walletAddress: '0x1234...5678',
                    chain: SUPPORTED_CHAINS[0], // Ethereum
                    token: SUPPORTED_TOKENS[1][1], // USDC
                    isDefault: true,
                    conditions: [],
                },
                {
                    id: '2',
                    name: 'Polygon for small amounts',
                    walletAddress: '0x9876...5432',
                    chain: SUPPORTED_CHAINS[1], // Polygon
                    token: SUPPORTED_TOKENS[137][1], // USDC
                    isDefault: false,
                    conditions: [
                        {
                            type: 'amount',
                            operator: 'less_than',
                            value: 100,
                        }
                    ],
                },
                {
                    id: '3',
                    name: 'Base for USDC',
                    walletAddress: '0xabcd...efgh',
                    chain: SUPPORTED_CHAINS[4], // Base
                    token: SUPPORTED_TOKENS[8453][1], // USDC
                    isDefault: false,
                    conditions: [
                        {
                            type: 'token',
                            operator: 'equals',
                            value: 0,
                            token: 'USDC',
                        }
                    ],
                },
            ];
            
            setPaymentPreferences(mockPreferences);
            return mockPreferences;
        } catch (error) {
            console.error('Error fetching payment preferences:', error);
            return [];
        } finally {
            setLoadingPaymentPreferences(false);
        }
    };
    
    // Add a payment preference
    const addPaymentPreference = async (preference: PaymentPreference) => {
        if (!address) return;
        
        try {
            // Mock API call - in a real app this would add the preference to your backend or smart contract
            // Generate a random ID
            const newPreference = {
                ...preference,
                id: Math.random().toString(36).substring(2, 9),
            };
            
            setPaymentPreferences(prev => [...prev, newPreference]);
            
            console.log('Added payment preference:', newPreference);
        } catch (error) {
            console.error('Error adding payment preference:', error);
        }
    };
    
    // Update a payment preference
    const updatePaymentPreference = async (preference: PaymentPreference) => {
        if (!address) return;
        
        try {
            // Mock API call - in a real app this would update the preference in your backend or smart contract
            const updatedPreferences = paymentPreferences.map(pref => {
                if (pref.id === preference.id) {
                    return preference;
                }
                
                // If the updated preference is set as default, update other preferences
                if (preference.isDefault && pref.id !== preference.id) {
                    return { ...pref, isDefault: false };
                }
                
                return pref;
            });
            
            setPaymentPreferences(updatedPreferences);
            console.log('Updated payment preference:', preference);
        } catch (error) {
            console.log("Error updating payment preference", error);
            throw new Error('Error updating payment preference');
        }
    };
    
    // Remove a payment preference
    const removePaymentPreference = async (preferenceId: string) => {
        if (!address) return;
        
        try {
            // Mock API call - in a real app this would remove the preference from your backend or smart contract
            const updatedPreferences = paymentPreferences.filter(pref => pref.id !== preferenceId);
            setPaymentPreferences(updatedPreferences);
            console.log('Removed payment preference:', preferenceId);
        } catch (error) {
            console.log("Error removing payment preference", error);
            throw new Error('Error removing payment preference');
        }
    };
    
    // Fetch groups (mock data for now)
    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            // Mock data for groups
            const mockGroups: Group[] = [
                {
                    id: '1',
                    name: 'Trip to Taipei',
                    description: 'ETH Taipei 2023 expenses',
                    members: [
                        { id: '1', name: 'You', walletAddress: address || 'unknown' },
                        { id: '2', name: 'Alice', walletAddress: '0x4c2077e4B6A55Fbc0b41Cd67c453d81865Bd68D4' },
                        { id: '3', name: 'Bob', walletAddress: '0x8c2077e4B6A55Fbc0b41Cd67c453d81865Bd68E5' },
                    ],
                    expenses: [
                        {
                            id: '1',
                            groupId: '1',
                            name: 'Dinner',
                            amount: 150,
                            currency: 'USDC',
                            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
                            participants: [
                                { id: '1', name: 'You', share: 50 },
                                { id: '2', name: 'Alice', share: 50 },
                                { id: '3', name: 'Bob', share: 50 },
                            ],
                            createdBy: '1',
                            isPaid: false,
                        },
                    ],
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
                    createdBy: '1',
                },
            ];
            
            setGroups(mockGroups);
            return mockGroups;
        } catch (error) {
            console.log("Error fetching groups", error);
            throw new Error('Error fetching groups');
        } finally {
            setLoadingGroups(false);
        }
    };
    
    // Create group
    const createGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'createdBy'>) => {
        try {
            // This would normally be a call to a backend
            const newGroup: Group = {
                ...group,
                id: Date.now().toString(),
                createdAt: new Date(),
                createdBy: '1', // Assuming the current user's ID is '1'
            };
            
            setGroups([...groups, newGroup]);
            return newGroup;
        } catch (error) {
            console.log("Error creating group", error);
            throw new Error('Error creating group');
        }
    };
    
    // Add expense
    const addExpense = async (expense: Omit<GroupExpense, 'id'>) => {
        try {
            // This would normally be a call to a backend
            const newExpense: GroupExpense = {
                ...expense,
                id: Date.now().toString(),
            };
            
            const updatedGroups = groups.map(group => {
                if (group.id === expense.groupId) {
                    return {
                        ...group,
                        expenses: [...group.expenses, newExpense],
                    };
                }
                return group;
            });
            
            setGroups(updatedGroups);
            return newExpense;
        } catch (error) {
            console.log("Error adding expense", error);
            throw new Error('Error adding expense');
        }
    };
    
    // Settle expense
    const settleExpense = async (expenseId: string, paymentDetails: any) => {
        try {
            // This would normally be a call to a backend and smart contract
            const updatedGroups = groups.map(group => {
                const updatedExpenses = group.expenses.map(expense => {
                    if (expense.id === expenseId) {
                        return {
                            ...expense,
                            isPaid: true,
                            paymentTx: 'mockTxHash',
                        };
                    }
                    return expense;
                });
                
                return {
                    ...group,
                    expenses: updatedExpenses,
                };
            });
            
            setGroups(updatedGroups);
        } catch (error) {
            console.log("Error settling expense", error);
            throw new Error('Error settling expense');
        }
    };
    
    // Helper function to get chain ID from name
    const getChainIdFromName = (chainName: string): number => {
        const chainMap: Record<string, number> = {
            ethereum: 1,
            polygon: 137,
            bsc: 56,
            avalanche: 43114,
            base: 8453,
            arbitrum: 42161,
        };
        
        return chainMap[chainName.toLowerCase()] || 1;
    };
    
    // Helper function to get tokens for a chain
    const tokensForChain = (chainId: number): Token[] => {
        return SUPPORTED_TOKENS[chainId] || [];
    };
    
    // Load initial data
    useEffect(() => {
        // Fetch initial data when the component mounts
        fetchAllBeefyVaults();
        fetchUserInvestments();
        fetchPaymentPreferences();
        fetchGroups();
    }, []);
    
    // Update data when wallet address changes
    useEffect(() => {
        if (address) {
            // Fetch user-specific data when wallet is connected
            fetchUserInvestments();
            fetchPaymentPreferences();
        }
    }, [address]);
    
    return (
        <GlobalContext.Provider value={{
            allBeefyVaults,
            loadingBeefyVaults,
            setAllBeefyVaults,
            fetchAllBeefyVaults,
            fetchBeefyVaultsByChain,
            
            userInvestments,
            setUserInvestments,
            loadingUserInvestments,
            fetchUserInvestments,
            
            paymentPreferences,
            setPaymentPreferences,
            loadingPaymentPreferences,
            fetchPaymentPreferences,
            addPaymentPreference,
            updatePaymentPreference,
            removePaymentPreference,
            
            groups,
            setGroups,
            loadingGroups,
            fetchGroups,
            createGroup,
            addExpense,
            settleExpense,
            
            supportedChains: SUPPORTED_CHAINS,
            tokensForChain,
        }}>
            {children}
        </GlobalContext.Provider>
    );
};