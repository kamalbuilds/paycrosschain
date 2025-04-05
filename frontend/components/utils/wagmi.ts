import {
  defaultWagmiConfig,
} from "@reown/appkit-wagmi-react-native";
import { mainnet, bsc, polygon, avalanche, arbitrum, base, optimism, rootstock, celoAlfajores, celo, baseSepolia, sepolia } from "viem/chains";
import { authConnector } from "@reown/appkit-auth-wagmi-react-native";

// 1. Get projectId at https://cloud.reown.com
export const projectId = "b1e1aefc0165086def75803b4e1cda7e";

// 2. Create config
export const metadata = {
  name: "PayCrossChain",
  description: "Cross-chain payment splitting app",
  url: "https://paycrosschain.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "com.anonymous.PayCrossChain://",
    universal: "https://paycrosschain.com",
  },
};

// Add all supported chains as a readonly array to ensure proper typing
export const chains = [mainnet, baseSepolia, sepolia, bsc, polygon, avalanche, celo, base, optimism, rootstock, celoAlfajores] as const;

// Create auth connector
export const auth = authConnector({ projectId, metadata });

// Create wagmi config
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata
});

// Log available connectors for debugging
console.log("Available connectors:", wagmiConfig.connectors.map(c => c.id));