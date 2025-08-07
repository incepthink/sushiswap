import { useState, useEffect } from 'react';

interface BalanceResponse {
  data: TokenBalance[];
}

interface TokenBalance {
  symbol: string;
  balance: string;
}

interface ErrorResponse {
  status: string;
  message: string;
  details?: any;
}

export function useKatanaBalance(address: string | null, backendUrl: string) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBalances([]);
      setError(null);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${backendUrl}/api/balance/katana?address=${encodeURIComponent(address)}`
        );
        
        const data: BalanceResponse | ErrorResponse = await response.json();
        
        if (response.ok && 'data' in data) {
          setBalances(data.data);
          setError(null);
        } else {
          const errorResponse = data as ErrorResponse;
          setError(errorResponse.message || 'Failed to fetch balances');
          setBalances([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setBalances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [address, backendUrl]);

  const refetch = () => {
    if (address) {
      const fetchBalance = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(
            `${backendUrl}/api/balance/katana?address=${encodeURIComponent(address)}`
          );
          
          const data: BalanceResponse | ErrorResponse = await response.json();
          
          if (response.ok && 'data' in data) {
            setBalances(data.data);
            setError(null);
          } else {
            const errorResponse = data as ErrorResponse;
            setError(errorResponse.message || 'Failed to fetch balances');
            setBalances([]);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          setBalances([]);
        } finally {
          setLoading(false);
        }
      };

      fetchBalance();
    }
  };

  return {
    balances,
    loading,
    error,
    refetch
  };
}