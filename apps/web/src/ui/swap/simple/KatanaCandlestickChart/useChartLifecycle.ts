import { useRef, useCallback, MutableRefObject } from 'react';
import { createChart, IChartApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';

interface UseChartLifecycleProps {
  tokenAddress: string | null;
  isKatanaChain: boolean;
  onChartReady: (ready: boolean) => void;
  onError: (error: string) => void;
}

export const useChartLifecycle = ({
  tokenAddress,
  isKatanaChain,
  onChartReady,
  onError,
}: UseChartLifecycleProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const containerObserverRef = useRef<ResizeObserver | null>(null);

  // Clean up chart function
  const cleanupChart = useCallback(() => {
    if (containerObserverRef.current) {
      containerObserverRef.current.disconnect();
      containerObserverRef.current = null;
    }

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (err) {
        console.error('Error removing chart:', err);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    }
    onChartReady(false);
  }, [onChartReady]);

  // Initialize chart function
  const initializeChart = useCallback(() => {
    console.log('initializeChart called:', { tokenAddress, isKatanaChain });
    
    if (!chartContainerRef.current || !tokenAddress || !isKatanaChain) {
      console.log('Initialization conditions not met');
      return;
    }

    try {
      cleanupChart();

      const container = chartContainerRef.current;

      // Wait for container to be properly sized
      const checkAndCreateChart = () => {
        const rect = container.getBoundingClientRect();
        console.log('Container dimensions:', rect);

        if (rect.width === 0 || rect.height === 0) {
          setTimeout(checkAndCreateChart, 50);
          return;
        }

        try {
          console.log('Creating chart...');
          // Create chart
          const chart = createChart(container, {
            layout: {
              background: { color: '#0d1117' },
              textColor: '#DDD',
            },
            grid: {
              vertLines: { color: '#1e222d' },
              horzLines: { color: '#1e222d' },
            },
            width: Math.floor(rect.width),
            height: Math.floor(rect.height),
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: '#1e222d',
            },
            rightPriceScale: {
              borderColor: '#2B2B43',
              textColor: '#d1d4dc',
              autoScale: true,
            },
            crosshair: {
              vertLine: {
                color: '#758696',
                width: 1,
                style: 1,
              },
              horzLine: {
                color: '#758696',
                width: 1,
                style: 1,
              },
            },
          });

          // Add candlestick series
          const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          });

          chartRef.current = chart;
          candlestickSeriesRef.current = candlestickSeries;

          // Set up resize observer
          containerObserverRef.current = new ResizeObserver(() => {
            if (chartRef.current && chartContainerRef.current) {
              const newRect = chartContainerRef.current.getBoundingClientRect();
              chartRef.current.applyOptions({
                width: Math.floor(newRect.width),
                height: Math.floor(newRect.height),
              });
            }
          });

          containerObserverRef.current.observe(container);
          console.log('Chart created successfully');
          onChartReady(true);

        } catch (err) {
          console.error('Error creating chart:', err);
          onError(`Chart creation error: ${err}`);
        }
      };

      checkAndCreateChart();
    } catch (err) {
      console.error('Error initializing chart:', err);
      onError(`Chart initialization error: ${err}`);
    }
  }, [tokenAddress, isKatanaChain, onChartReady, onError]);

  // Update chart data
  const updateChartData = useCallback((newData: CandlestickData[]) => {
    console.log('updateChartData called with:', newData.length, 'points');
    
    if (!chartRef.current || !candlestickSeriesRef.current) {
      console.log('Chart or series not ready');
      return;
    }

    try {
      if (newData.length === 0) {
        console.log('No data, clearing chart');
        candlestickSeriesRef.current.setData([]);
        return;
      }

      console.log('Setting chart data:', newData);
      candlestickSeriesRef.current.setData(newData);

      // Set default zoom to last 3 days if this is initial load
      if (newData.length > 0) {
        setTimeout(() => {
          if (chartRef.current) {
            const lastTime = newData[newData.length - 1].time as number;
            const threeDaysInSeconds = 3 * 24 * 60 * 60;
            const startTime = (lastTime - threeDaysInSeconds) as UTCTimestamp;
            const firstTime = newData[0].time as number;
            const actualStartTime = Math.max(startTime as number, firstTime) as UTCTimestamp;

            try {
              console.log('Setting visible range:', { from: actualStartTime, to: lastTime });
              chartRef.current.timeScale().setVisibleRange({
                from: actualStartTime,
                to: lastTime as UTCTimestamp,
              });
            } catch (err) {
              console.warn('Failed to set initial time range:', err);
              chartRef.current.timeScale().fitContent();
            }
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error updating chart data:', err);
      onError(`Chart update error: ${err}`);
    }
  }, [onError]);

  return {
    chartContainerRef,
    chartRef,
    candlestickSeriesRef,
    initializeChart,
    cleanupChart,
    updateChartData,
  };
};