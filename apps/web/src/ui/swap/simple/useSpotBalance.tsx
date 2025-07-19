// hooks/useSpotBalance.ts
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

const { Alchemy, Network } = require("alchemy-sdk");

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

// Initialize Alchemy instance outside hook to prevent recreation
const config = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

// Batch price fetching function with error handling
async function getBatchPricesFromAlchemy(
  tokenAddresses: Array<{ network: string; address: string }>
): Promise<{ [key: string]: number }> {
  try {
    const response = await fetch(
      `https://api.g.alchemy.com/prices/v1/${process.env.NEXT_PUBLIC_ALCHEMY_API}/tokens/by-address`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          addresses: tokenAddresses,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Alchemy Price API error: ${response.status}`);
    }

    const data = await response.json();
    const prices: { [key: string]: number } = {};

    data.data.forEach((item: any) => {
      if (item.prices && item.prices.length > 0) {
        const usdPrice = item.prices.find((p: any) => p.currency === "usd");
        if (usdPrice) {
          prices[item.address.toLowerCase()] = Number(usdPrice.value);
        }
      }
    });

    return prices;
  } catch (error) {
    console.error("Error fetching prices from Alchemy:", error);
    return {};
  }
}

// Fallback price function using CoinGecko (free tier)
async function getFallbackPrice(contractAddress: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${contractAddress}&vs_currencies=usd`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data[contractAddress]?.usd || 0;
  } catch (error) {
    console.error(
      `Error fetching fallback price for ${contractAddress}:`,
      error
    );
    return 0;
  }
}

// Main function to fetch spot balance data
async function fetchSpotBalance(address: string): Promise<SpotBalanceData> {
  if (!address) {
    throw new Error("Address is required");
  }

  try {
    // 1. Fetch ETH balance and token balances in parallel
    const [ethBalance, tokenBalances] = await Promise.all([
      alchemy.core.getBalance(address),
      alchemy.core.getTokenBalances(address),
    ]);

    // 2. Filter non-zero token balances
    const nonZeroBalances = tokenBalances.tokenBalances.filter((token: any) => {
      return parseInt(token.tokenBalance, 16) !== 0;
    });

    // 3. Prepare contract addresses for batch price fetching
    const contractAddresses = nonZeroBalances.map((token: any) => ({
      network: "eth-mainnet",
      address: token.contractAddress,
    }));

    // Add ETH address for price fetching
    contractAddresses.push({
      network: "eth-mainnet",
      address: "0x0000000000000000000000000000000000000000", // ETH
    });

    // 4. Fetch prices and metadata in parallel (batched)
    const [prices, ...metadataResults] = await Promise.all([
      getBatchPricesFromAlchemy(contractAddresses),
      ...nonZeroBalances.map((token: any) =>
        alchemy.core.getTokenMetadata(token.contractAddress)
      ),
    ]);

    // 5. Process ETH balance
    const ethBalanceBigInt = BigInt(ethBalance.toString());
    const ethReadableBalance = Number(ethBalanceBigInt) / Math.pow(10, 18);
    const ethPrice = prices["0x0000000000000000000000000000000000000000"] || 0;
    const ethUsdValue = ethReadableBalance * ethPrice;

    // 6. Process token balances
    const tokens: TokenBalance[] = [];
    let totalTokenValue = 0;

    for (let i = 0; i < nonZeroBalances.length; i++) {
      const token = nonZeroBalances[i];
      const metadata = metadataResults[i];

      if (!metadata) continue;

      const balanceDecimal = parseInt(token.tokenBalance, 16);
      const decimals = metadata.decimals || 18;
      const readableBalance = balanceDecimal / Math.pow(10, decimals);

      // Get price from batch result, fallback to CoinGecko if needed
      let tokenPrice = prices[token.contractAddress.toLowerCase()] || 0;

      // If Alchemy didn't return price, try fallback (with rate limiting consideration)
      if (tokenPrice === 0 && readableBalance > 0.001) {
        try {
          tokenPrice = await getFallbackPrice(token.contractAddress);
        } catch (error) {
          console.warn(
            `Failed to get fallback price for ${token.contractAddress}`
          );
        }
      }

      const usdValue = readableBalance * tokenPrice;
      totalTokenValue += usdValue;

      // Only include tokens with meaningful value (>$0.01) to reduce noise
      if (usdValue > 0.01) {
        tokens.push({
          symbol: metadata.symbol || "UNKNOWN",
          balance: readableBalance,
          contractAddress: token.contractAddress,
          decimals,
          name: metadata.name || "Unknown Token",
          logo: metadata.logo,
          price: tokenPrice,
          usdValue,
        });
      }
    }

    // 7. Sort tokens by USD value (descending)
    tokens.sort((a, b) => b.usdValue - a.usdValue);

    return {
      totalUsd: ethUsdValue + totalTokenValue,
      tokens,
      ethBalance: {
        balance: ethReadableBalance,
        price: ethPrice,
        usdValue: ethUsdValue,
      },
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
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
    refetchOnWindowFocus: false, // Prevent unnecessary API calls
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (likely API key issues)
      if (error?.message?.includes("40")) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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
