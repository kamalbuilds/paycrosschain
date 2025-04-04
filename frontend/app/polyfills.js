// Polyfills for web environment
import 'react-native-get-random-values';

// Add global React for libraries that expect it
if (typeof window !== 'undefined') {
  window.React = require('react');
}

// Other potential polyfills
if (typeof process === 'undefined') {
  global.process = { env: {} };
} 