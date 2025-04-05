// try.js - Fixed NoditService Testing Script

// Import axios for direct API testing
const axios = require('axios');

// Define supported chains directly in this file since import isn't working
const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum' },
  { id: 8453, name: 'Base' },
  { id: 137, name: 'Polygon' },
  { id: 56, name: 'BSC' },
  { id: 42161, name: 'Arbitrum' },
];

// Nodit API configuration
const NODIT_API_URL = 'https://web3.nodit.io';
const NODIT_API_KEY = 'nEJFUENxX3A5-JnSWJiEfgOCfeTADsMy'; 

// Sample address to test with
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth

// Track success/failures
const results = {
  success: [],
  failure: []
};

// Create a client for the requests
const client = axios.create({
  baseURL: NODIT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': NODIT_API_KEY
  }
});

// Helper to run and log test results
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}...`);
  try {
    const result = await testFn();
    console.log(`✅ Success: ${name}`);
    console.log('Result:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
    results.success.push(name);
    return result;
  } catch (error) {
    console.error(`❌ Error: ${name}`);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    results.failure.push(name);
    return null;
  }
}

// Test functions
const NoditTestService = {
  async getEnsNameByAddress(address) {
    const response = await client.get(`/v1/ens/address/${address}`);
    return response.data;
  },
  
  async getAddressByEnsName(ensName) {
    const response = await client.get(`/v1/ens/name/${ensName}`);
    return response.data;
  },
  
  async getNativeBalance(address, chainId) {
    const response = await client.get(`/v1/address/${address}/balance`, {
      params: { chainId }
    });
    return response.data;
  },
  
  async getTokenBalances(address, chainId) {
    const response = await client.get(`/v1/address/${address}/tokens`, {
      params: { chainId }
    });
    return response.data.tokens || [];
  },
  
  async getNFTs(address, chainId) {
    const response = await client.get(`/v1/address/${address}/nfts`, {
      params: { chainId }
    });
    return response.data.nfts || [];
  }
};

// Main testing function
async function testNoditService() {
  console.log('🚀 Starting NoditService test...');
  
  // First check if the API is reachable
  try {
    await client.get('/');
    console.log('✅ API is reachable');
  } catch (error) {
    console.error('❌ API Connection Error:');
    console.error('The Nodit API appears to be unreachable. Check:');
    console.error('1. Your internet connection');
    console.error('2. If api.nodit.app is a valid domain');
    console.error('3. If the API requires VPN access');
    
    if (error.code === 'ENOTFOUND') {
      console.error('\nDNS lookup failed - Cannot resolve api.nodit.app');
      console.error('Possible solutions:');
      console.error('- Check if the API URL is correct');
      console.error('- Try direct IP address if available');
      console.error('- Check your DNS settings');
    }
    
    // Exit early
    return;
  }
  
  // Test ENS lookup
  await runTest('getEnsNameByAddress', () => 
    NoditTestService.getEnsNameByAddress(TEST_ADDRESS)
  );
  
  // Test reverse ENS lookup
  await runTest('getAddressByEnsName', () => 
    NoditTestService.getAddressByEnsName('vitalik.eth')
  );
  
  // Test all supported chains
  for (const chain of SUPPORTED_CHAINS) {
    // Test native balance
    await runTest(`getNativeBalance (${chain.name})`, () => 
      NoditTestService.getNativeBalance(TEST_ADDRESS, chain.id)
    );
    
    // Test token balances
    await runTest(`getTokenBalances (${chain.name})`, () => 
      NoditTestService.getTokenBalances(TEST_ADDRESS, chain.id)
    );
    
    // Test NFTs
    await runTest(`getNFTs (${chain.name})`, () => 
      NoditTestService.getNFTs(TEST_ADDRESS, chain.id)
    );
  }
  
  // Summary
  console.log('\n📋 Test Summary');
  console.log(`✅ Successful tests: ${results.success.length}`);
  results.success.forEach(name => console.log(`  - ${name}`));
  
  console.log(`\n❌ Failed tests: ${results.failure.length}`);
  results.failure.forEach(name => console.log(`  - ${name}`));
}

// Run tests
testNoditService()
  .then(() => console.log('\n🏁 Testing completed'))
  .catch(err => console.error('\n💥 Unexpected error:', err));