import '@walletconnect/react-native-compat'
import "./polyfills.js";
import * as React from "react";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit, defaultWagmiConfig, AppKit } from '@reown/appkit-wagmi-react-native'
import { arbitrum, mainnet, polygon } from 'viem/chains'
import { ReactNode } from 'react'

const queryClient = new QueryClient()

const projectId = '850177d586718c4459d29ac742471ae1'

// 2. Create config
const metadata = {
    name: 'AppKit RN',
    description: 'AppKit RN Example',
    url: 'https://reown.com/appkit',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
    redirect: {
        native: 'YOUR_APP_SCHEME://',
        universal: 'YOUR_APP_UNIVERSAL_LINK.com'
    }
}

const chains = [mainnet, polygon, arbitrum] as const

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })

// 3. Create modal
createAppKit({
    projectId,
    wagmiConfig,
    defaultChain: mainnet, // Optional
    enableAnalytics: true // Optional - defaults to your Cloud configuration
})

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
                <AppKit />
            </QueryClientProvider>
        </WagmiProvider>
    )
}