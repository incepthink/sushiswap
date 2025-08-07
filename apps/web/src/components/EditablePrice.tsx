import { useState } from 'react';

interface EditablePriceProps {
  tokenKey: string;
  currentPrice: number;
  defaultPrice: number;
  onPriceChange: (price: number) => void;
}

export function EditablePrice({ 
  tokenKey, 
  currentPrice, 
  defaultPrice, 
  onPriceChange 
}: EditablePriceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentPrice.toFixed(2));

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      onPriceChange(newPrice);
      setIsEditing(false);
    } else {
      setEditValue(currentPrice.toFixed(2));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(currentPrice.toFixed(2));
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-[#00F5E0]"
          autoFocus
          step="0.01"
        />
      </div>
    );
  }

  return (
    <div 
      className="group flex items-center justify-center"
      onClick={() => setIsEditing(true)}
      title="Click to edit entry price"
    >
      <div className="flex justify-center gap-2 relative cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors">
        <span>${currentPrice.toFixed(2)}</span>
        {currentPrice !== defaultPrice && (
          <div className="text-xs text-blue-400 mt-1">Custom</div>
        )}
      </div>
    </div>
  );
}