'use client';
import { Rows, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ChartLayout = 'vertical' | 'horizontal'; // 'vertical' = vertical bars, 'horizontal' = horizontal bars

type ChartLayoutSwitcherProps = {
  value: ChartLayout;
  onChange: (value: ChartLayout) => void;
  className?: string;
};

export function ChartLayoutSwitcher({ value, onChange, className }: ChartLayoutSwitcherProps) {
  const handleToggle = () => {
    onChange(value === 'vertical' ? 'horizontal' : 'vertical');
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle} className={`h-8 w-8 ${className}`}>
      {value === 'vertical' ? <Columns className="h-4 w-4" /> : <Rows className="h-4 w-4" />}
      <span className="sr-only">Alternar para barras {value === 'vertical' ? 'horizontais' : 'verticais'}</span>
    </Button>
  );
}
