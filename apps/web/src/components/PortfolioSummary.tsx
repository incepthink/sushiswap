import { formatPercent } from 'sushi/format';

interface PortfolioSummaryProps {
  totalValue: number;
  customTotalPnL: number;
  customTotalROI: number;
}

export function PortfolioSummary({ 
  totalValue, 
  customTotalPnL, 
  customTotalROI 
}: PortfolioSummaryProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-50">
      <div className="text-lg sm:text-xl font-semibold">
        Portfolio Overview
      </div>
      
      {/* Portfolio Summary Stats */}
      <div className="flex gap-10">
        <div className="relative z-50 flex flex-col items-center">
          <div className="text-xl sm:text-2xl font-bold">
            ${totalValue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">Total Value</div>
        </div>
        
        <div className="relative z-50 flex flex-col items-center">
          <div className={`text-lg sm:text-xl font-semibold ${
            customTotalPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {customTotalPnL >= 0 ? '+' : ''}${customTotalPnL.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">Custom P&L</div>
        </div>
        
        <div className="relative z-50 flex flex-col items-center">
          <div className={`text-lg sm:text-xl font-semibold ${
            customTotalROI >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {customTotalROI >= 0 ? '+' : ''}{formatPercent(customTotalROI)}
          </div>
          <div className="text-xs text-gray-400">Custom ROI</div>
        </div>
      </div>
    </div>
  );
}