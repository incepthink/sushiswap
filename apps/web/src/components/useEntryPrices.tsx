import { useState, useEffect } from 'react';

// Custom hook for managing entry prices in localStorage
export function useEntryPrices(address: string | undefined) {
  const [entryPrices, setEntryPrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!address) return;

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
  }, [address]);

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

  const clearEntryPrices = () => {
    if (!address) return;
    
    setEntryPrices({});
    const storageKey = `entry_prices_${address}`;
    localStorage.removeItem(storageKey);
  };

  return { 
    entryPrices, 
    updateEntryPrice, 
    getEntryPrice, 
    clearEntryPrices 
  };
}