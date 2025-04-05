

# PayCrossChain

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Cross-chain payments made simple

PayCrossChain is a powerful mobile application for cross-chain payments and expense splitting with a focus on usability and flexibility. Set up your payment preferences once and receive funds across multiple blockchains seamlessly.



## 🚀 Features

- **Multi-Chain Support**: Seamlessly interact with Ethereum, Polygon, BSC, Avalanche, Base, and Arbitrum networks
- **Payment Preference Management**: Define how you want to receive payments across different chains with conditional rules
- **IPFS Integration**: Store your payment preferences securely on IPFS through Pinata
- **Cross-Chain Expense Splitting**: Split bills and expenses with friends across multiple blockchains
- **Investment Features**: Access Beefy Finance vaults across multiple chains from a single interface
- **Consistent Navigation**: User-friendly interface with consistent navigation across all screens

## 🔧 Technology Stack

- **Frontend**: React Native with Expo
- **State Management**: React Query and Context API
- **Web3 Integration**: ethers.js, wagmi
- **Authentication**: Reown App Kit
- **Storage**: IPFS via Pinata, AsyncStorage
- **Styling**: React Native StyleSheet

## 📋 Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)
- Pinata API keys (for IPFS functionality)

## 🛠️ Installation & Setup

1. **Clone the repository**

```bash
git clone https://github.com/kamalbuilds/paycrosschain.git
cd paycrosschain/frontend
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Create a `.env` file in the frontend directory with your configuration (see Environment Variables section below).

4. **Start the development server**

```bash
npm run dev
# or
yarn dev
```

5. **Run on a device or emulator**

```bash
# For iOS
npm run ios

# For Android
npm run android
```

## 🌐 Environment Variables

This application uses environment variables for configuration. Follow these steps to set up your environment:

### Setup

1. Create the following files in the root directory:
   - `.env` - Main environment file (used by default)
   - `.env.development` - Development environment variables
   - `.env.production` - Production environment variables

2. Add your environment variables to these files using the following format:

```
# Pinata IPFS Configuration
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Application Configuration
APP_NAME=PayCrossChain
APP_VERSION=1.0.0

# API Endpoints
API_URL=https://api.paycrosschain.com
BACKEND_URL=https://api.paycrosschain.com/v1

# Default Chain Configuration
DEFAULT_CHAIN_ID=1

# Web3 Configuration
REOWN_PROJECT_ID=your_reown_project_id
```

3. Replace placeholder values with your actual API keys and configurations.

### Running with Environment Variables

- Development environment: `npm run dev`
- Production environment: `npm run prod`
- Default environment: `npm start`

### Accessing Environment Variables in Code

Import environment variables in your code like this:

```typescript
import { PINATA_API_KEY, API_URL } from '@env';

console.log('API URL:', API_URL);
```

Make sure to add any new environment variables to the `declarations.d.ts` file.

## 📱 Key Components

### Payment Preferences

The Payment Preferences component allows users to set up and manage how they want to receive payments across different blockchains. Users can:

- Create default payment preferences
- Set up conditional preferences based on amount, token type, etc.
- Store preferences securely on IPFS for cross-device access

### Cross-Chain Payments

The Cross-Chain Payment component enables users to send payments to others across different blockchains:

- Select source and destination chains
- Choose from supported tokens
- Estimate fees and execution time
- Track payment status

### Investments

The Investments component provides access to yield-generating opportunities:

- View available investment vaults across multiple chains
- See APY, TVL, and risk assessments
- Invest and track performance
- Withdraw funds when needed

## 🏗️ Project Structure

```
frontend/
├── assets/              # Images, fonts and static assets
├── components/          # React components
│   ├── screens/         # Screen components
│   └── utils/           # Component utilities
├── utils/               # Utility functions
│   ├── ipfs/            # IPFS integration
│   └── constants.ts     # Application constants
├── store/               # State management
├── .env                 # Environment variables
└── App.tsx              # Application entry point
```

## 🔗 Related Repositories

- Backend

- Contracts

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Pinata](https://pinata.cloud) - For IPFS infrastructure
- [Beefy Finance](https://beefy.finance) - For yield optimization protocols
- [Reown App Kit](https://reown.com/appkit) - For authentication infrastructure
