import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
} from "react-native";
import { useGlobalContext } from "../../context/GlobalContext";
import { Token } from "../TokenPicker";
import { MaterialIcons } from '@expo/vector-icons';

export default function TokensChoose({ navigation, route }: { navigation: any, route: any }) {
  const { supportedChains, tokensForChain } = useGlobalContext();
  const [selectedChainId, setSelectedChainId] = useState(1); // Default to Ethereum
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  const availableTokens = tokensForChain(selectedChainId);

  const handleTokenSelect = (tokenSymbol: string) => {
    if (selectedTokens.includes(tokenSymbol)) {
      setSelectedTokens(selectedTokens.filter(t => t !== tokenSymbol));
    } else {
      setSelectedTokens([...selectedTokens, tokenSymbol]);
    }
  };

  const renderTokenItem = (token: Token) => {
    const isSelected = selectedTokens.includes(token.symbol);
    
    return (
      <Pressable
        key={token.symbol}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 15,
          backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
          borderRadius: 10,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: isSelected ? '#2F28D0' : '#E0E0E0',
        }}
        onPress={() => handleTokenSelect(token.symbol)}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F5F7FA',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
          }}
        >
          <Text style={{ fontSize: 20 }}>{token.icon}</Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 16 }}>{token.name}</Text>
          <Text style={{ color: '#666', fontSize: 14 }}>{token.symbol}</Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '600', fontSize: 16 }}>{token.balance}</Text>
          {isSelected && (
            <MaterialIcons name="check-circle" size={24} color="#2F28D0" />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '700', 
            textAlign: 'center', 
            fontFamily: 'Arame',
            flex: 1,
            marginRight: 24,
          }}>
            SELECT TOKENS
          </Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: '500' }}>Network</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ flexDirection: 'row' }}
            contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
          >
            {supportedChains.map((chain) => (
              <Pressable
                key={chain.id}
                style={{
                  backgroundColor: selectedChainId === chain.id ? '#F0F4FF' : '#F5F7FA',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: selectedChainId === chain.id ? '#2F28D0' : '#E0E0E0',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedChainId(chain.id)}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>{chain.icon}</Text>
                <Text style={{ 
                  color: selectedChainId === chain.id ? '#2F28D0' : '#333',
                  fontWeight: selectedChainId === chain.id ? '600' : '400',
                }}>
                  {chain.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: '500' }}>Available Tokens</Text>
        <ScrollView style={{ flex: 1 }}>
          {availableTokens.map(renderTokenItem)}
        </ScrollView>

        <View style={{ paddingVertical: 15 }}>
          <Pressable
            style={{
              backgroundColor: selectedTokens.length > 0 ? '#2F28D0' : '#CCCCCC',
              borderRadius: 10,
              padding: 15,
              alignItems: 'center',
            }}
            onPress={() => {
              if (selectedTokens.length > 0) {
                // Here you would handle the selected tokens
                // For now, just navigate back
                navigation.goBack();
              }
            }}
            disabled={selectedTokens.length === 0}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
              Continue with {selectedTokens.length} {selectedTokens.length === 1 ? 'token' : 'tokens'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
 
 