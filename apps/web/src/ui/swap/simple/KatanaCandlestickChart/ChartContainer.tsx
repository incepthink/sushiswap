import React, { useEffect, useRef, useState } from 'react';
import { CandlestickData } from 'lightweight-charts';
import { useChartLifecycle } from './useChartLifecycle';

interface ChartContainerProps {
  tokenAddress: string | null;
  isKatanaChain: boolean;
  chartData: CandlestickData[];
  renderKey: number;
  resolution: 'hour' | 'day';
  onChartReady: (ready: boolean) => void;
  onError: (error: string) => void;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  tokenAddress,
  isKatanaChain,
  chartData,
  renderKey,
  resolution,
  onChartReady,
  onError,
}) => {
  const initializationRef = useRef<number>(0);
  const currentRenderKey = useRef<number>(renderKey);
  const [isChartInitialized, setIsChartInitialized] = useState(false);

  const {
    chartContainerRef,
    initializeChart,
    cleanupChart,
    updateChartData,
  } = useChartLifecycle({
    tokenAddress,
    isKatanaChain,
    onChartReady: (ready) => {
      setIsChartInitialized(ready);
      onChartReady(ready);
    },
    onError,
  });

  // Track render key changes to prevent loops
  useEffect(() => {
    currentRenderKey.current = renderKey;
  }, [renderKey]);

  // Initialize chart only when needed
  useEffect(() => {
    if (!tokenAddress || !isKatanaChain) {
      cleanupChart();
      setIsChartInitialized(false);
      return;
    }

    const currentInit = ++initializationRef.current;
    
    const timer = setTimeout(() => {
      // Only initialize if this is still the latest initialization
      if (currentInit === initializationRef.current) {
        console.log('Initializing chart for token:', tokenAddress);
        initializeChart();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (currentInit === initializationRef.current) {
        cleanupChart();
        setIsChartInitialized(false);
      }
    };
  }, [tokenAddress, isKatanaChain, renderKey]);

  // Update chart data when chart is ready AND data is available
  useEffect(() => {
    console.log('Data update effect:', { 
      isChartInitialized, 
      isKatanaChain, 
      chartDataLength: chartData.length,
      hasData: chartData.length > 0 
    });
    
    if (isChartInitialized && isKatanaChain && chartData.length > 0) {
      // Add a small delay to ensure chart is fully ready
      const timer = setTimeout(() => {
        console.log('Updating chart with data after initialization...');
        updateChartData(chartData);
      }, 100); // Increased delay slightly
      
      return () => clearTimeout(timer);
    }
  }, [isChartInitialized, chartData, isKatanaChain]);

  // Handle resolution changes with cleanup
  useEffect(() => {
    if (tokenAddress && isKatanaChain) {
      const currentInit = ++initializationRef.current;
      
      const timer = setTimeout(() => {
        if (currentInit === initializationRef.current) {
          console.log('Resolution changed, reinitializing chart...');
          cleanupChart();
          setIsChartInitialized(false);
          setTimeout(() => {
            if (currentInit === initializationRef.current) {
              initializeChart();
            }
          }, 50);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [resolution]);

  return (
    <div className="w-full h-full">
      <div
        ref={chartContainerRef}
        className="w-full h-full bg-[#0d1117] rounded-lg"
        style={{
          minHeight: '400px',
          position: 'relative',
        }}
      />
    </div>
  );
};

export default ChartContainer;