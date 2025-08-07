import { useState, useEffect, useMemo } from 'react';
import { useKatanaBalance } from 'src/ui/swap/simple/useKatanaBalance';
import { getTokenInfoBySymbol } from 'src/constants/katanaTokens';
import { BACKEND_URL } from 'src/ui/swap/simple/ChartSpot';

export interface KatanaPortfolioToken {
  symbol: string;
  name: string;
  address: string;
  balance: number;
  price: number;
  value: number;
  logoUrl?: string;
  decimals: number;
  chain_id: number;
}

export interface KatanaPortfolioData {
  tokens: KatanaPortfolioToken[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
}

export function useKatanaPortfolio(address: string | null): KatanaPortfolioData {
  const { balances, loading: balancesLoading, error: balancesError } = useKatanaBalance(address, BACKEND_URL);
  const [portfolioTokens, setPortfolioTokens] = useState<KatanaPortfolioToken[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  // Get prices for all tokens with balances
  useEffect(() => {
    if (!balances.length) {
      setPortfolioTokens([]);
      return;
    }

    const fetchPrices = async () => {
      setPricesLoading(true);
      setPricesError(null);
      
      try {
        const tokenPromises = balances.map(async (balance) => {
          // Get token info from our mapping
          const tokenInfo = getTokenInfoBySymbol(balance.symbol);
          
          if (!tokenInfo) {
            console.warn(`Token info not found for symbol: ${balance.symbol}`);
            return null;
          }

          // For native ETH, use zero address for price lookup but wETH address for token info
          const priceAddress = balance.symbol === 'ETH' 
            ? '0xEE7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62' 
            : tokenInfo.address;

          try {
            const response = await fetch(
              `${BACKEND_URL}/api/price/katana?tokenAddress=${encodeURIComponent(priceAddress)}`
            );
            
            const priceData = await response.json();
            
            const price = response.ok && priceData.status === 'ok' ? priceData.price : 0;
            console.log("PRICE", price);
            
            const balanceNum = parseFloat(balance.balance);
            
            return {
              symbol: balance.symbol,
              name: tokenInfo.name,
              address: tokenInfo.address || priceAddress,
              balance: balanceNum,
              price,
              value: balanceNum * price,
              logoUrl: tokenInfo.logoUrl,
              decimals: tokenInfo.decimals,
              chain_id: 747474, // Katana chain ID
            } as KatanaPortfolioToken;
          } catch (priceError) {
            console.error(`Error fetching price for ${balance.symbol}:`, priceError);
            const balanceNum = parseFloat(balance.balance);
            
            return {
              symbol: balance.symbol,
              name: tokenInfo.name,
              address: tokenInfo.address || '',
              balance: balanceNum,
              price: 0,
              value: 0,
              logoUrl: tokenInfo.logoUrl,
              decimals: tokenInfo.decimals,
              chain_id: 747474,
            } as KatanaPortfolioToken;
          }
        });

        const results = await Promise.all(tokenPromises);
        const validTokens = results.filter((token): token is KatanaPortfolioToken => token !== null);
        
        // Filter out tokens with zero balance
        const nonZeroTokens = validTokens.filter(token => token.balance > 0);
        
        setPortfolioTokens(nonZeroTokens);
      } catch (error) {
        setPricesError(error instanceof Error ? error.message : 'Failed to fetch prices');
        console.error('Error fetching portfolio prices:', error);
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [balances, BACKEND_URL]);

  const totalValue = useMemo(() => {
    return portfolioTokens.reduce((total, token) => total + token.value, 0);
  }, [portfolioTokens]);

  const isLoading = balancesLoading || pricesLoading;
  const error = balancesError || pricesError;

  return {
    tokens: portfolioTokens,
    totalValue,
    isLoading,
    error,
  };
}