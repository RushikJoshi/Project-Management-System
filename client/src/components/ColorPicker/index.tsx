import React, { useId, useRef } from 'react';
import { Paintbrush } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  palette: string[];
  disallowedColors?: string[];
  disabled?: boolean;
  helperText?: string;
}

function normalizeColor(value: string) {
  return String(value || '').trim().toLowerCase();
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  palette,
  disallowedColors = [],
  disabled = false,
  helperText,
}) => {
  const inputId = useId();
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedValue = normalizeColor(value);
  const blockedColors = new Set(disallowedColors.map(normalizeColor));
  const valueBlocked = blockedColors.has(normalizedValue);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-surface-100 bg-surface-50/70 p-2 dark:border-surface-800 dark:bg-surface-800/40">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg border border-surface-200 dark:border-surface-700"
            style={{ backgroundColor: value }}
          />
          <div className="min-w-0 flex-1">
            <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
              Selected Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={inputId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn('input h-8 rounded-lg px-3 font-mono uppercase', valueBlocked && 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/20')}
                placeholder="#3366FF"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => hiddenInputRef.current?.click()}
                className="btn-secondary h-8 rounded-lg px-3 text-sm"
                disabled={disabled}
              >
                <Paintbrush size={14} />
                Custom
              </button>
              <input
                ref={hiddenInputRef}
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
        {palette.map((color) => {
          const normalizedPaletteColor = normalizeColor(color);
          const isSelected = normalizedPaletteColor === normalizedValue;
          const isBlocked = blockedColors.has(normalizedPaletteColor);

          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              disabled={disabled || isBlocked}
              title={isBlocked ? `${color} is already used` : color}
              className={cn(
                'relative h-7 w-full rounded-lg border transition-all',
                isSelected
                  ? 'scale-105 border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-surface-200 hover:border-surface-300 dark:border-surface-700 dark:hover:border-surface-600',
                (disabled || isBlocked) && 'cursor-not-allowed opacity-45'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            >
              {isBlocked ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/20 dark:bg-surface-900/20">
                  <span className="block h-0.5 w-6 rotate-[-35deg] rounded-full bg-surface-700/80 dark:bg-white/80" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {(valueBlocked || helperText) ? (
        <p className={cn('text-xs', valueBlocked ? 'text-rose-500' : 'text-surface-400')}>
          {valueBlocked ? 'This color is already assigned and cannot be reused for another team.' : helperText}
        </p>
      ) : null}
    </div>
  );
};

export default ColorPicker;
