import React from 'react';

interface ChartDebugProps {
  tokenAddress: string | null;
  isKatanaChain: boolean;
  chainId: number;
  ohlcData: any;
  chartData: any[];
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  chartReady: boolean;
}

const ChartDebug: React.FC<ChartDebugProps> = ({
  tokenAddress,
  isKatanaChain,
  chainId,
  ohlcData,
  chartData,
  isLoading,
  error,
  isSupported,
  chartReady,
}) => {
  return (
    <div className="absolute top-20 left-4 bg-black/80 text-white text-xs p-2 rounded max-w-md z-20">
      <div><strong>Debug Info:</strong></div>
      <div>Token: {tokenAddress?.slice(0, 10)}...{tokenAddress?.slice(-6)}</div>
      <div>Chain: {chainId} (Katana: {isKatanaChain.toString()})</div>
      <div>Loading: {isLoading.toString()}</div>
      <div>Error: {error || 'None'}</div>
      <div>Supported: {isSupported.toString()}</div>
      <div>Chart Ready: {chartReady.toString()}</div>
      <div>Raw OHLC: {ohlcData ? JSON.stringify(Object.keys(ohlcData)) : 'null'}</div>
      <div>Chart Data Length: {chartData.length}</div>
      {chartData.length > 0 && (
        <div>First Point: {JSON.stringify(chartData[0])}</div>
      )}
    </div>
  );
};

export default ChartDebug;