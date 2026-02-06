
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette } from 'lucide-react';
import { palettes, PaletteName } from '@/lib/color-palettes';
import { useDashboard } from '@/contexts/DashboardContext';

export function ColorPaletteSwitcher() {
  const { paletteName, setPaletteName } = useDashboard();

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={paletteName} onValueChange={(value) => setPaletteName(value as PaletteName)}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Paleta de Cores" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(palettes).map(([key, { name }]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
