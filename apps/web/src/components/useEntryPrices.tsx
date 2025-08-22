import { useState, useEffect } from 'react';

// Token interface for initialization
interface TokenData {
  price_to_usd: number;
  chain_id: number;
  contract_address?: string;
  address?: string;
  symbol?: string;
}

// Structure to store entry price data
interface EntryPriceData {
  price: number;
  isCustom: boolean;
  timestamp: number;
}

// Custom hook for managing entry prices in localStorage
export function useEntryPrices(
  address: string | undefined, 
  data?: TokenData[]
) {
  const [entryPrices, setEntryPrices] = useState<{ [key: string]: EntryPriceData }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize entry prices when data first loads
  useEffect(() => {
    if (!address || !data || data.length === 0) {
      setIsInitialized(false);
      return;
    }

    // If already initialized for this data set, don't reinitialize
    if (isInitialized) return;

    const storageKey = `entry_prices_${address}`;
    const stored = localStorage.getItem(storageKey);
    let storedEntryPrices: { [key: string]: EntryPriceData } = {};

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle both old format (just numbers) and new format (objects)
        Object.keys(parsed).forEach(key => {
          if (typeof parsed[key] === 'number') {
            // Convert old format to new format
            storedEntryPrices[key] = {
              price: parsed[key],
              isCustom: false,
              timestamp: Date.now()
            };
          } else if (parsed[key] && typeof parsed[key] === 'object') {
            storedEntryPrices[key] = parsed[key];
          }
        });
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
        // Use current price as initial entry price (not custom)
        newEntryPrices[tokenKey] = {
          price: token.price_to_usd,
          isCustom: false,
          timestamp: Date.now()
        };
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
        const parsed = JSON.parse(stored);
        const convertedPrices: { [key: string]: EntryPriceData } = {};
        
        Object.keys(parsed).forEach(key => {
          if (typeof parsed[key] === 'number') {
            // Convert old format to new format
            convertedPrices[key] = {
              price: parsed[key],
              isCustom: false,
              timestamp: Date.now()
            };
          } else if (parsed[key] && typeof parsed[key] === 'object') {
            convertedPrices[key] = parsed[key];
          }
        });
        
        setEntryPrices(convertedPrices);
      } catch (error) {
        console.error('Error parsing stored entry prices:', error);
        setEntryPrices({});
      }
    }
    setIsInitialized(false); // Reset for potential data initialization
  }, [address, data]);

  const updateEntryPrice = (tokenKey: string, price: number) => {
    if (!address) return;

    const newEntryData: EntryPriceData = {
      price,
      isCustom: true, // Mark as custom when manually updated
      timestamp: Date.now()
    };

    const newEntryPrices = { ...entryPrices, [tokenKey]: newEntryData };
    setEntryPrices(newEntryPrices);
    
    const storageKey = `entry_prices_${address}`;
    localStorage.setItem(storageKey, JSON.stringify(newEntryPrices));
  };

  const getEntryPrice = (tokenKey: string, defaultPrice: number) => {
    const entryData = entryPrices[tokenKey];
    return entryData?.price ?? defaultPrice;
  };

  const hasCustomPrice = (tokenKey: string, currentPrice: number) => {
    const entryData = entryPrices[tokenKey];
    return entryData?.isCustom === true;
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