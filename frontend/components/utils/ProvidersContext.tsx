import * as React from "react";
import { AppKit, createAppKit } from "@reown/appkit-wagmi-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet } from "viem/chains";
import { WagmiProvider, createConfig } from 'wagmi';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { projectId, wagmiConfig } from "./wagmi";
import { Platform, StyleSheet } from 'react-native';
import WalletConnector from "./WalletConnector";
import { PaymentProvider } from "./PaymentContext";

// 0. Setup queryClient
const queryClient = new QueryClient();

type Props = {
  children: React.ReactNode;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

// Initialize AppKit directly during module load
// This ensures createAppKit is called before any components try to use the hooks
try {
  createAppKit({
    projectId,
    wagmiConfig,
    defaultChain: mainnet,
    enableAnalytics: true,
  });
  console.log("AppKit initialized successfully");
} catch (error) {
  console.error("Failed to initialize AppKit:", error);
}

// For debugging
console.log("Wagmi config initialized with chains:", wagmiConfig.chains.map(chain => chain.name));

export default function ProvidersContext({ children }: Props) {
  return (
    <GestureHandlerRootView style={styles.container}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletConnector>
            <PaymentProvider>
              {children}
              {Platform.OS !== 'web' && <AppKit />}
            </PaymentProvider>
          </WalletConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </GestureHandlerRootView>
  );
}
