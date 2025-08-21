import { useState, useEffect } from 'react';

// Token interface for initialization
interface TokenData {
  price_to_usd: number;
  chain_id: number;
  contract_address?: string;
  address?: string;
  symbol?: string;
}

// Custom hook for managing entry prices in localStorage
export function useEntryPrices(
  address: string | undefined, 
  data?: TokenData[]
) {
  const [entryPrices, setEntryPrices] = useState<{ [key: string]: number }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize entry prices when data first loads
  useEffect(() => {
    if (!address || !data || isInitialized) return;

    const storageKey = `entry_prices_${address}`;
    const stored = localStorage.getItem(storageKey);
    let storedEntryPrices: { [key: string]: number } = {};

    if (stored) {
      try {
        storedEntryPrices = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored entry prices:', error);
      }
    }

    // Initialize entry prices for tokens that don't have stored prices
    const newEntryPrices = { ...storedEntryPrices };
    let hasNewPrices = false;

    data.forEach((token) => {
      const tokenKey = generateTokenKey(
        token.chain_id,
        token.contract_address || token.address || ''
      );
      
      if (!(tokenKey in newEntryPrices)) {
        // Use current price as initial entry price
        newEntryPrices[tokenKey] = token.price_to_usd;
        hasNewPrices = true;
      }
    });

    setEntryPrices(newEntryPrices);
    
    // Save to localStorage if we added new prices
    if (hasNewPrices) {
      localStorage.setItem(storageKey, JSON.stringify(newEntryPrices));
    }
    
    setIsInitialized(true);
  }, [address, data, isInitialized]);

  // Load existing prices when address changes (but no data yet)
  useEffect(() => {
    if (!address || data) return;

    const storageKey = `entry_prices_${address}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setEntryPrices(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing stored entry prices:', error);
        setEntryPrices({});
      }
    }
    setIsInitialized(false); // Reset for potential data initialization
  }, [address, data]);

  const updateEntryPrice = (tokenKey: string, price: number) => {
    if (!address) return;

    const newEntryPrices = { ...entryPrices, [tokenKey]: price };
    setEntryPrices(newEntryPrices);
    
    const storageKey = `entry_prices_${address}`;
    localStorage.setItem(storageKey, JSON.stringify(newEntryPrices));
  };

  const getEntryPrice = (tokenKey: string, defaultPrice: number) => {
    return entryPrices[tokenKey] ?? defaultPrice;
  };

  const hasCustomPrice = (tokenKey: string, defaultPrice: number) => {
    const storedPrice = entryPrices[tokenKey];
    return storedPrice !== undefined && Math.abs(storedPrice - defaultPrice) > 0.01;
  };

  const clearEntryPrices = () => {
    if (!address) return;
    
    setEntryPrices({});
    setIsInitialized(false);
    const storageKey = `entry_prices_${address}`;
    localStorage.removeItem(storageKey);
  };

  return { 
    entryPrices, 
    updateEntryPrice, 
    getEntryPrice, 
    hasCustomPrice,
    clearEntryPrices,
    isInitialized
  };
}

// Helper function to generate consistent token keys
function generateTokenKey(chainId: number, address: string): string {
  return `${chainId}-${address.toLowerCase()}`;
}