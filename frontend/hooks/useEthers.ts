import { useMemo } from 'react'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'

// Returns an Ethers provider when a wallet is connected
export function useEthersProvider() {
  const { connector } = useAccount()
  
  return useMemo(() => {
    if (!connector) return null
    
    return {
      getProvider: async () => {
        try {
          const provider = await connector.getProvider()
          return new ethers.providers.Web3Provider(provider as any)
        } catch (error) {
          console.error('Failed to get provider:', error)
          return null
        }
      }
    }
  }, [connector])
}

// Returns an Ethers signer for the connected wallet
export function useEthersSigner() {
  const { connector } = useAccount()
  
  return useMemo(() => {
    if (!connector) return null
    
    return {
      getSigner: async () => {
        try {
          const provider = await connector.getProvider()
          const ethersProvider = new ethers.providers.Web3Provider(provider as any)
          return ethersProvider.getSigner()
        } catch (error) {
          console.error('Failed to get signer:', error)
          return null
        }
      }
    }
  }, [connector])
} 