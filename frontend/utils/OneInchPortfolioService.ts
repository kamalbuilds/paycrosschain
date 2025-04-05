import axios from 'axios';

// 1inch API base URL
const ONE_INCH_API_URL = 'https://api.1inch.dev/portfolio/portfolio/v4';

// API key (should be stored securely in environment variables in production)
const ONE_INCH_API_KEY = 'yaKQVmmFk88T7BoxB8SFqUuE4YHEWu2F';

// Create axios instance with default headers
const oneInchClient = axios.create({
  baseURL: ONE_INCH_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ONE_INCH_API_KEY}`
  }
});

// Time ranges for profit/loss calculations
export type TimeRange = '1day' | '1week' | '1month' | '3months' | '1year';

// Map chain IDs to 1inch supported chain IDs
const chainIdMap: Record<number, number> = {
  1: 1,        // Ethereum
  8453: 8453,  // Base
  137: 137,    // Polygon
  56: 56,      // BSC
  42161: 42161 // Arbitrum
};

export interface OneInchTokenValue {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_decimals: number;
  token_price_usd: number;
  token_amount: string;
  value_usd: number;
  icon_url?: string;
}

export interface OneInchProfitLoss {
  chain_id: number | null;
  abs_profit_usd: number;
  roi: number;
}

export interface ValueChartItem {
  timestamp: number;
  value_usd: number;
}

class OneInchPortfolioService {
  // Get token values for an address
  static async getTokenValues(address: string, chainId: number) {
    try {
      const mappedChainId = chainIdMap[chainId] || chainId;
      
      const response = await oneInchClient.get('/overview/erc20/current_value', {
        params: {
          addresses: [address],
          chain_id: mappedChainId
        }
      });
      
      // Extract token values from the response
      const tokens: OneInchTokenValue[] = response.data.result?.[0]?.tokens || [];
      
      return tokens;
    } catch (error) {
      console.error('Error fetching token values from 1inch:', error);
      return [];
    }
  }

  // Get profit/loss data for an address
  static async getProfitAndLoss(address: string, chainId: number, timerange: TimeRange = '1month') {
    try {
      const mappedChainId = chainIdMap[chainId] || chainId;
      
      const response = await oneInchClient.get('/overview/erc20/profit_and_loss', {
        params: {
          addresses: [address],
          chain_id: mappedChainId,
          timerange
        }
      });
      
      // Extract profit/loss data from the response
      const profitLoss: OneInchProfitLoss[] = response.data.result || [];
      
      return profitLoss;
    } catch (error) {
      console.error('Error fetching profit/loss from 1inch:', error);
      return [];
    }
  }

  // Get portfolio value chart data
  static async getValueChart(address: string, chainId: number, timerange: TimeRange = '1month') {
    try {
      const mappedChainId = chainIdMap[chainId] || chainId;
      
      const response = await oneInchClient.get('/general/value_chart', {
        params: {
          addresses: [address],
          chain_id: mappedChainId,
          timerange
        }
      });
      
      // Extract chart data from the response
      const chartData: ValueChartItem[] = response.data.result || [];
      
      return chartData;
    } catch (error) {
      console.error('Error fetching value chart from 1inch:', error);
      return [];
    }
  }

  // Get protocols data
  static async getProtocolsCurrentValue(address: string, chainId: number) {
    try {
      const mappedChainId = chainIdMap[chainId] || chainId;
      
      const response = await oneInchClient.get('/overview/protocols/current_value', {
        params: {
          addresses: [address],
          chain_id: mappedChainId
        }
      });
      
      return response.data.result?.[0]?.protocols || [];
    } catch (error) {
      console.error('Error fetching protocols from 1inch:', error);
      return [];
    }
  }

  // Get general portfolio overview
  static async getGeneralProfitLoss(address: string, chainId: number, timerange: TimeRange = '1month') {
    try {
      const mappedChainId = chainIdMap[chainId] || chainId;
      
      const response = await oneInchClient.get('/general/profit_and_loss', {
        params: {
          addresses: [address],
          chain_id: mappedChainId,
          timerange
        }
      });
      
      return response.data.result || [];
    } catch (error) {
      console.error('Error fetching general profit/loss from 1inch:', error);
      return [];
    }
  }
}

export default OneInchPortfolioService;
