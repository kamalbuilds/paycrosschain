"use client";

import { useState } from "react";
import {
    createWalletClient,
    http,
    encodeFunctionData,
    HttpTransport,
    type Chain,
    type Account,
    type WalletClient,
    type Hex,
    TransactionExecutionError,
    parseUnits,
    createPublicClient,
    formatUnits,
    parseEther,
} from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import axios from "axios";
import { sepolia, avalancheFuji, baseSepolia } from "viem/chains";
import {
    SupportedChainId,
    CHAIN_IDS_TO_USDC_ADDRESSES,
    CHAIN_IDS_TO_TOKEN_MESSENGER,
    CHAIN_IDS_TO_MESSAGE_TRANSMITTER,
    DESTINATION_DOMAINS,
} from "../components/circle/utils/chains";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { getContract } from 'viem'

export type TransferStep =
    | "idle"
    | "approving"
    | "burning"
    | "waiting-attestation"
    | "minting"
    | "completed"
    | "error";

const chains = {
    [SupportedChainId.ETH_SEPOLIA]: sepolia,
    [SupportedChainId.AVAX_FUJI]: avalancheFuji,
    [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
};

export function useCrossChainTransfer() {
    const [currentStep, setCurrentStep] = useState<TransferStep>("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { address, connector } = useAccount();

    const DEFAULT_DECIMALS = 6;

    const addLog = (message: string) =>
        setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${message}`,
        ]);

    const getPublicClient = (chainId: SupportedChainId) => {
        return createPublicClient({
            chain: chains[chainId],
            transport: http(),
        });
    };

    const getClients = (chainId: SupportedChainId) => {
        if (!address) {
            throw new Error('Account not connected')
        }

        return createWalletClient({
            chain: chains[chainId],
            transport: http(),
            account: address,
        });
    };

    const getBalance = async (chainId: SupportedChainId) => {
        const publicClient = getPublicClient(chainId);

        const balance = await publicClient.readContract({
            address: CHAIN_IDS_TO_USDC_ADDRESSES[chainId],
            abi: [
                {
                    constant: true,
                    inputs: [{ name: "_owner", type: "address" }],
                    name: "balanceOf",
                    outputs: [{ name: "balance", type: "uint256" }],
                    payable: false,
                    stateMutability: "view",
                    type: "function",
                },
            ],
            functionName: "balanceOf",
            args: [address!],
        });

        const formattedBalance = formatUnits(balance, DEFAULT_DECIMALS);

        return formattedBalance;
    };

    const approveUSDC = async (
        sourceChainId: number,
        amount: number
    ) => {
        setCurrentStep("approving");
        addLog("Approving USDC transfer...");

        const provider = await connector?.getProvider();
        if (!provider) return null

        const amountInBigInt = amount * 10 ** 6

        const ethersProvider = new ethers.providers.Web3Provider(provider);

        const signer = ethersProvider.getSigner();

        const CONTRACT_ABI = [
            {
                type: "function",
                name: "approve",
                stateMutability: "nonpayable",
                inputs: [
                    { name: "spender", type: "address" },
                    { name: "amount", type: "uint256" },
                ],
                outputs: [{ name: "", type: "bool" }],
            },
            {
                constant: true,
                inputs: [
                    { name: "_owner", type: "address" },
                    { name: "_spender", type: "address" }
                ],
                name: "allowance",
                outputs: [{ name: "remaining", type: "uint256" }],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
        ]

        const contract = new ethers.Contract(CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId], CONTRACT_ABI, signer);

        const approvedAmount = await contract.allowance(address, CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId]);

        if (approvedAmount >= amountInBigInt) {
            console.log('Approved amount is greater than or equal to the amount to approve', amountInBigInt);
            return;
        }

        const tx = await contract.approve(CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId], amountInBigInt);

        const txReceipt = await tx.wait();
        console.log("txReceipt", txReceipt);

        addLog(`USDC Approval Tx: ${tx}`);
        return txReceipt;

    };

    const burnUSDC = async (
        sourceChainId: number,
        amount: bigint,
        destinationChainId: number,
        destinationAddress: string,
        hookData: `0x${string}`
    ) => {
        setCurrentStep("burning");
        addLog("Burning USDC...");

        const finalityThreshold = 1000
        const maxFee = BigInt(amount.toString()) - BigInt(1);
        const mintRecipient = `0x${destinationAddress
            .replace(/^0x/, "")
            .padStart(64, "0")}`;

        const provider = await connector?.getProvider();

        if (!provider) return null

        const ethersProvider = new ethers.providers.Web3Provider(provider);

        const signer = ethersProvider.getSigner();

        const CONTRACT_ABI = [
            {
                "inputs": [
                    { "internalType": "uint256", "name": "amount", "type": "uint256" },
                    {
                        "internalType": "uint32",
                        "name": "destinationDomain",
                        "type": "uint32"
                    },
                    { "internalType": "bytes32", "name": "mintRecipient", "type": "bytes32" },
                    { "internalType": "address", "name": "burnToken", "type": "address" },
                    {
                        "internalType": "bytes32",
                        "name": "destinationCaller",
                        "type": "bytes32"
                    },
                    { "internalType": "uint256", "name": "maxFee", "type": "uint256" },
                    {
                        "internalType": "uint32",
                        "name": "minFinalityThreshold",
                        "type": "uint32"
                    },
                    { "internalType": "bytes", "name": "hookData", "type": "bytes" }
                ],
                "name": "depositForBurnWithHook",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
        ]

        const contract = new ethers.Contract(CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId], CONTRACT_ABI, signer);

        console.log("destinationDomain", DESTINATION_DOMAINS[destinationChainId]);

        const tx = await contract.depositForBurnWithHook(
            amount,
            DESTINATION_DOMAINS[destinationChainId],
            mintRecipient as Hex,
            CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxFee,
            finalityThreshold,
            hookData
        );

        const txReceipt = await tx.wait();
        console.log("txReceipt", txReceipt);

        addLog(`Burn Tx: ${txReceipt.transactionHash}`);
        return txReceipt.transactionHash;

    };

    const handleEncode = async () => {
        const res = encodeFunctionData({
            abi: [{}],
            functionName: "transfer",
            args: ['0x9452BCAf507CD6547574b78B810a723d8868C85a', 1000000]
        })

        //TODO:Encoded data here goes to the hook data
        console.log("res", res);

    }

    const retrieveAttestation = async (
        transactionHash: string,
        sourceChainId: number
    ) => {
        setCurrentStep("waiting-attestation");
        addLog("Retrieving attestation...");

        const url = `https://iris-api-sandbox.circle.com/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;

        console.log("url", url);

        while (true) {
            try {
                const response = await axios.get(url);
                console.log("response", response.data);

                if (response.data?.messages?.[0]?.status === "complete") {
                    addLog("Attestation retrieved!");
                    console.log("Attestation", response.data.messages[0]);

                    return response.data.messages[0];
                }
                addLog("Waiting for attestation...");
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    continue;
                }
                setError("Attestation retrieval failed");
                throw error;
            }
        }
    };

    const mintUSDC = async (
        destinationChainId: number,
        attestation: any
    ) => {
        const MAX_RETRIES = 3;
        let retries = 0;
        setCurrentStep("minting");
        addLog("Minting USDC...");

        // First switch the chain to the destination chain
        try {
            addLog(`Switching chain to destination chain ID: ${destinationChainId}...`);
            if (connector && connector.switchChain) {
                await connector.switchChain({
                    chainId: destinationChainId
                });
                addLog(`Successfully switched to destination chain`);
            } else {
                addLog(`Manual chain switch required - please switch your wallet to chain ID: ${destinationChainId}`);
                // Alert the user to switch chains manually if automatic switching is not supported
                alert(`Please switch your wallet to chain ID: ${destinationChainId} to complete the transfer.`);
            }
        } catch (switchError) {
            console.error("Error switching chain:", switchError);
            addLog(`Error switching chain: ${switchError instanceof Error ? switchError.message : "Unknown error"}`);
            // Continue with the minting attempt even if chain switching failed
            // The wallet provider's RPC might handle the correct chain internally
        }

        while (retries < MAX_RETRIES) {
            try {
                const publicClient = getPublicClient(destinationChainId);
                const feeData = await publicClient.estimateFeesPerGas();
                console.log("fee data", feeData);

                const provider = await connector?.getProvider();
                if (!provider) return null

                const ethersProvider = new ethers.providers.Web3Provider(provider);

                const signer = ethersProvider.getSigner();

                const CONTRACT_ABI = [
                    {
                        type: "function",
                        name: "receiveMessage",
                        stateMutability: "nonpayable",
                        inputs: [
                            { name: "message", type: "bytes" },
                            { name: "attestation", type: "bytes" },
                        ],
                        outputs: [],
                    },
                ]

                const contract = new ethers.Contract(CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationChainId], CONTRACT_ABI, signer);

                const contractConfig = {
                    address: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[
                        destinationChainId
                    ] as `0x${string}`,
                    abi: [
                        {
                            type: "function",
                            name: "receiveMessage",
                            stateMutability: "nonpayable",
                            inputs: [
                                { name: "message", type: "bytes" },
                                { name: "attestation", type: "bytes" },
                            ],
                            outputs: [],
                        },
                    ] as const,
                };

                // Estimate gas with buffer
                const gasEstimate = await publicClient.estimateContractGas({
                    ...contractConfig,
                    functionName: "receiveMessage",
                    args: [attestation.message, attestation.attestation],
                    account: address,
                });
                // // Add 20% buffer to gas estimate
                const gasWithBuffer = (gasEstimate * BigInt(150)) / BigInt(100);
                addLog(`Gas Used: ${gasWithBuffer} Gwei`);
                console.log("gasWithBuffer", gasWithBuffer);

                console.log("Minting on chain:", destinationChainId);
                console.log("Contract address:", CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationChainId]);
                console.log("Message:", attestation.message);
                console.log("Attestation:", attestation.attestation);

                const tx = await contract.receiveMessage(attestation.message, attestation.attestation, {
                    gasLimit: gasWithBuffer,
                    maxFeePerGas: feeData.maxFeePerGas,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                });

                const txReceipt = await tx.wait();
                console.log("Mint transaction receipt:", txReceipt);
                addLog(`Mint Tx: ${txReceipt.transactionHash}`);

                setCurrentStep("completed");
                break;
            } catch (err) {
                console.error("Error minting USDC:", err);
                addLog(`Error attempt ${retries + 1}/${MAX_RETRIES}: ${err instanceof Error ? err.message : "Unknown error"}`);
                
                if (retries < MAX_RETRIES - 1) {
                    retries++;
                    addLog(`Retrying in 5 seconds... (${retries}/${MAX_RETRIES})`);
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                } else {
                    setCurrentStep("error");
                    setError("Failed to mint USDC after multiple attempts");
                    throw err;
                }
            }
        }
    };

    const executeTransfer = async (
        sourceChainId: number,
        destinationChainId: number,
        amount: string,
        recipient: string,
        hookData: `0x${string}`
    ) => {
        try {
            const numericAmount = parseUnits(amount, DEFAULT_DECIMALS);
            const destinationAddress = recipient ? recipient : address!

            const checkNativeBalance = async (chainId: SupportedChainId) => {
                const publicClient = getPublicClient(chainId);
                const balance = await publicClient.getBalance({
                    address: destinationAddress as `0x${string}`,
                });
                return balance;
            };

            // Map mainnet chain IDs to their testnet equivalents for Circle CCTP
            const getTestnetChainId = (chainId: number): SupportedChainId => {
                switch (chainId) {
                    case 1: // Ethereum Mainnet
                        return SupportedChainId.ETH_SEPOLIA;
                    case 43114: // Avalanche Mainnet
                        return SupportedChainId.AVAX_FUJI;
                    case 8453: // Base Mainnet  
                        return SupportedChainId.BASE_SEPOLIA;
                    default:
                        return chainId as SupportedChainId;
                }
            };

            // Convert chain IDs to testnet if needed
            const sourceTestnetChainId = getTestnetChainId(sourceChainId);
            const destinationTestnetChainId = getTestnetChainId(destinationChainId);

            // Log the chain ID mapping
            if (sourceTestnetChainId !== sourceChainId) {
                console.log(`Mapping source chain ${sourceChainId} to testnet ${sourceTestnetChainId}`);
            }
            if (destinationTestnetChainId !== destinationChainId) {
                console.log(`Mapping destination chain ${destinationChainId} to testnet ${destinationTestnetChainId}`);
            }

            console.log("Calling approve func ");
            console.log("source chain id", sourceTestnetChainId);
            console.log("amount", amount);
            console.log("Destination chain id", destinationTestnetChainId);

            await approveUSDC(sourceTestnetChainId, Number(amount));
            const burnTx = await burnUSDC(
                sourceTestnetChainId,
                numericAmount,
                destinationTestnetChainId,
                destinationAddress,
                hookData
            );
            console.log("burnTx", burnTx);
            const attestation = await retrieveAttestation(burnTx, sourceTestnetChainId);
            console.log("attestation recieved", attestation);
            const minBalance = parseEther("0.01"); // 0.01 native token
            const balance = await checkNativeBalance(destinationTestnetChainId);
            if (balance < minBalance) {
                throw new Error("Insufficient native token for gas fees");
            }
            
            await mintUSDC(destinationTestnetChainId, attestation);
        } catch (error) {
            setCurrentStep("error");
            addLog(
                `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            );
            throw error
        }
    };

    const reset = () => {
        setCurrentStep("idle");
        setLogs([]);
        setError(null);
    };

    return {
        currentStep,
        logs,
        error,
        executeTransfer,
        getBalance,
        reset,
    };
}
