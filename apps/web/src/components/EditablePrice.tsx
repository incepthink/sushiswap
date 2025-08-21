import { useMemo, useState } from 'react';

interface EditablePriceProps {
  tokenKey: string;
  currentPrice: number | string | null | undefined;
  defaultPrice: number | string | null | undefined;
  onPriceChange: (price: number) => void;
  hasCustomPrice?: boolean; // New prop from the hook
}

function asNumber(v: number | string | null | undefined, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function EditablePrice({
  tokenKey,
  currentPrice,
  defaultPrice,
  onPriceChange,
  hasCustomPrice = false, // Default to false for backward compatibility
}: EditablePriceProps) {
  // Normalize incoming values once per render
  const safeDefault = useMemo(() => asNumber(defaultPrice, 0), [defaultPrice]);
  const safeCurrent = useMemo(
    () => asNumber(currentPrice, safeDefault),
    [currentPrice, safeDefault]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => safeCurrent.toFixed(2));

  // Keep local state in sync if parent updates price externally
  // (optional but helpful)
  if (!isEditing && editValue !== safeCurrent.toFixed(2)) {
    setEditValue(safeCurrent.toFixed(2));
  }

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (Number.isFinite(newPrice) && newPrice > 0) {
      onPriceChange(newPrice);
      setIsEditing(false);
    } else {
      setEditValue(safeCurrent.toFixed(2));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(safeCurrent.toFixed(2));
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className="w-24 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-[#00F5E0]"
          autoFocus
          step="0.01"
          min="0"
          aria-label={`Edit price for ${tokenKey}`}
        />
      </div>
    );
  }

  return (
    <div
      className="group flex items-center justify-center"
      onClick={() => setIsEditing(true)}
      title="Click to edit entry price"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? setIsEditing(true) : null)}
    >
      <div className="flex justify-center gap-2 relative cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors">
        <span>${safeCurrent.toFixed(2)}</span>
        {hasCustomPrice && (
          <div className="text-xs text-blue-400 mt-1">Custom</div>
        )}
      </div>
    </div>
  );
}