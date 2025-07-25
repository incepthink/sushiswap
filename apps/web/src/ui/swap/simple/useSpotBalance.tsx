// hooks/useSpotBalance.ts
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface TokenBalance {
  symbol: string;
  balance: number;
  contractAddress: string;
  decimals: number;
  name: string;
  logo?: string;
  price: number;
  usdValue: number;
}

export interface SpotBalanceData {
  totalUsd: number;
  tokens: TokenBalance[];
  ethBalance: {
    balance: number;
    price: number;
    usdValue: number;
  };
}

// Main function to fetch spot balance data from Covalent
async function fetchSpotBalance(address: string): Promise<SpotBalanceData> {
  if (!address) {
    throw new Error("Address is required");
  }
  

  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/eth-mainnet/address/${address}/balances_v2/?quote-currency=USD&format=JSON&nft=false&no-nft-fetch=true`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_COVALENT_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Covalent API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.items) {
      throw new Error("Invalid response from Covalent API");
    }

    const items = data.data.items;
    let ethBalance = { balance: 0, price: 0, usdValue: 0 };
    const tokens: TokenBalance[] = [];
    let totalTokenValue = 0;

    items.forEach((item: any) => {
      const balance = parseFloat(item.balance) / Math.pow(10, item.contract_decimals);
      const price = item.quote_rate || 0;
      const usdValue = balance * price;

      // Handle ETH (native token)
      if (item.contract_address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        ethBalance = {
          balance,
          price,
          usdValue,
        };
      } else {
        // Handle ERC-20 tokens
        if (usdValue > 0.01 && balance > 0) {
          tokens.push({
            symbol: item.contract_ticker_symbol || "UNKNOWN",
            balance,
            contractAddress: item.contract_address,
            decimals: item.contract_decimals,
            name: item.contract_name || "Unknown Token",
            logo: item.logo_url,
            price,
            usdValue,
          });
          totalTokenValue += usdValue;
        }
      }
    });

    // Sort tokens by USD value (descending)
    tokens.sort((a, b) => b.usdValue - a.usdValue);

    return {
      totalUsd: ethBalance.usdValue + totalTokenValue,
      tokens,
      ethBalance,
    };
  } catch (error) {
    console.error("Error fetching spot balance:", error);
    throw error;
  }
}

// Custom hook with TanStack Query
export function useSpotBalance() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["spotBalance", address],
    queryFn: () => fetchSpotBalance(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache for rate limit management
    gcTime: 20 * 60 * 1000, // 20 minutes - longer cache time
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent unnecessary API calls
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (likely API key issues or rate limits)
      if (error?.message?.includes("40") || error?.message?.includes("429")) {
        return false;
      }
      return failureCount < 1; // Only retry once for other errors
    },
    retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 60000), // Longer delays to respect rate limits
  });
}

// Additional hook for just the total balance (lighter weight)
export function useSpotBalanceTotal() {
  const { data, isLoading, error } = useSpotBalance();

  return {
    totalUsd: data?.totalUsd || 0,
    isLoading,
    error,
  };
}

// Hook for getting specific token data
export function useTokenBalance(tokenAddress: string) {
  const { data, isLoading, error } = useSpotBalance();

  const token = data?.tokens.find(
    (t) => t.contractAddress.toLowerCase() === tokenAddress.toLowerCase()
  );

  return {
    token: token || null,
    isLoading,
    error,
  };
}

// Hook for ETH balance specifically
export function useEthBalance() {
  const { data, isLoading, error } = useSpotBalance();

  return {
    ethBalance: data?.ethBalance || { balance: 0, price: 0, usdValue: 0 },
    isLoading,
    error,
  };
}