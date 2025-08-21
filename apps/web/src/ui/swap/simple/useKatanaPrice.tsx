import { useState, useEffect } from 'react';
import { BACKEND_URL } from './ChartSpot';

// Types for the API responses
export interface TokenBalance {
  symbol: string;
  balance: string;
  address?: string; // Add token address to the response
}

interface BalanceResponse {
  data: TokenBalance[];
}

interface PriceResponse {
  status: string;
  token: string;
  actualToken?: string;
  quoteToken: string;
  price: number;
  poolAddress: string;
  fee: number;
  factoryUsed: string;
  tokenInfo?: any;
  poolInfo?: any;
}

interface ErrorResponse {
  status: string;
  message: string;
  details?: any;
}

// Hook for getting token price
export function useKatanaPrice(tokenAddress: string | null) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);

  useEffect(() => {
    if (!tokenAddress) {
      setPrice(null);
      setPriceData(null);
      setError(null);
      return;
    }

    const fetchPrice = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // console.log("URL",  `${BACKEND_URL}/api/price/katana?tokenAddress=${encodeURIComponent(tokenAddress)}`);
        
        const response = await fetch(
          `${BACKEND_URL}/api/price/katana?tokenAddress=${encodeURIComponent(tokenAddress)}`
        );
        
        const data: PriceResponse | ErrorResponse = await response.json();
        
        if (response.ok && data.status === 'ok') {
          const priceResponse = data as PriceResponse;
          setPrice(priceResponse.price);
          setPriceData(priceResponse);
          setError(null);
        } else {
          const errorResponse = data as ErrorResponse;
          setError(errorResponse.message || 'Failed to fetch price');
          setPrice(null);
          setPriceData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setPrice(null);
        setPriceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [tokenAddress, BACKEND_URL]);

  const refetch = () => {
    if (tokenAddress) {
      // Re-trigger the effect by updating a dependency
      setLoading(true);
    }
  };

  return {
    price,
    loading,
    error,
    priceData,
    refetch
  };
}