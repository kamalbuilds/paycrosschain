// Polyfills for web environment
import 'react-native-get-random-values';
import { Platform } from 'react-native';

// Add global React for libraries that expect it
if (typeof window !== 'undefined') {
  window.React = require('react');
}

// Other potential polyfills
if (typeof process === 'undefined') {
  global.process = { env: {} };
}

// Mock WalletConnect for development
global.RNWalletConnectModule = {
  initializeWalletConnect: () => {},
  // Add other methods that might be needed
}; 