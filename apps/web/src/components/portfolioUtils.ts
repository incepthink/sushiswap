// Portfolio calculation utilities

export interface PortfolioCalculations {
  customTotalPnL: number;
  customTotalROI: number;
  investedValue: number;
}

export interface TokenPnLData {
  entryPrice: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  roi: number;
}

// Calculate custom P&L and ROI for a single token
export function calculateTokenPnL(
  amount: number,
  currentPrice: number,
  entryPrice: number
): TokenPnLData {
  const investedValue = entryPrice * amount;
  const currentValue = currentPrice * amount;
  const pnl = currentValue - investedValue;
  const roi = investedValue > 0 ? pnl / investedValue : 0;

  return {
    entryPrice,
    investedValue,
    currentValue,
    pnl,
    roi,
  };
}

// Calculate portfolio totals based on custom entry prices
export function calculatePortfolioTotals(
  tokens: Array<{
    amount: number;
    currentPrice: number;
    entryPrice: number;
  }>
): PortfolioCalculations {
  let customTotalPnL = 0;
  let totalInvested = 0;

  tokens.forEach((token) => {
    const { investedValue, pnl } = calculateTokenPnL(
      token.amount,
      token.currentPrice,
      token.entryPrice
    );
    
    customTotalPnL += pnl;
    totalInvested += investedValue;
  });

  const customTotalROI = totalInvested > 0 ? customTotalPnL / totalInvested : 0;

  return {
    customTotalPnL,
    customTotalROI,
    investedValue: totalInvested,
  };
}

// Get token logo URL based on symbol and chain
export function getTokenLogo(symbol: string, chainId: number): string | null {
  const symbolUpper = symbol.toUpperCase();
  
  // For Katana network, use Katana-specific logos
  if (chainId === 747474) {
    switch (symbolUpper) {
      case 'ETH':
      case 'WETH':
        return 'https://assets.katana.network/icons/eth.svg';
      case 'USDC':
        return 'https://assets.katana.network/icons/usdc.svg';
      case 'USDT':
        return 'https://assets.katana.network/icons/usdt.svg';
      case 'WBTC':
        return 'https://assets.katana.network/icons/btc.svg';
      case 'KAT':
        return 'https://assets.katana.network/icons/kat.svg';
      case 'USDS':
        return 'https://assets.katana.network/icons/usds.svg';
      case 'AUSD':
        return 'https://assets.katana.network/icons/ausd.svg';
      case 'LBTC':
        return 'https://assets.katana.network/icons/lbtc.svg';
      case 'BTCK':
        return 'https://assets.katana.network/icons/btck.svg';
      case 'JITOSOL':
        return 'https://assets.katana.network/icons/jitosol.svg';
      case 'USOL':
        return 'https://assets.katana.network/icons/usol.png';
      case 'USUI':
        return 'https://assets.katana.network/icons/usui.png';
      case 'UXRP':
        return 'https://assets.katana.network/icons/uxrp.png';
      case 'MORPHO':
        return 'https://assets.katana.network/icons/morpho.svg';
      case 'POL':
        return 'https://assets.katana.network/icons/pol.svg';
      case 'SUSHI':
        return 'https://assets.katana.network/icons/sushi.svg';
      case 'YFI':
        return 'https://assets.katana.network/icons/yearn.svg';
      case 'WEETH':
        return 'https://assets.katana.network/icons/weeth.svg';
      case 'WSTETH':
        return 'https://assets.katana.network/icons/wsteth.svg';
      case 'BVUSD':
        return 'https://assets.katana.network/icons/bvusd.svg';
      default:
        return null;
    }
  }

  // Fallback to original logos for other chains
  switch (symbolUpper) {
    case 'ETH':
      return 'https://cdn.moralis.io/eth/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png';
    case 'USDC':
      return '/logos/usdc.png';
    case 'USDT':
      return 'https://cdn.moralis.io/eth/0xdac17f958d2ee523a2206206994597c13d831ec7.png';
    case 'WETH':
      return '/logos/weth.png';
    case 'WBTC':
      return '/logos/wbtc.png';
    case 'LINK':
      return 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png';
    default:
      return null;
  }
}

// Chain name mapping
export const CHAIN_NAMES: { [key: number]: string } = {
  1: 'Ethereum',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  56: 'BSC',
  747474: 'Katana'
};

// Generate token key for localStorage
export function generateTokenKey(chainId: number, address: string): string {
  return `${chainId}-${address}`;
}