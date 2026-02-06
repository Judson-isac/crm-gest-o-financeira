
'use client';

import React, { createContext, useState, useContext, useMemo } from 'react';
import { palettes, PaletteName } from '@/lib/color-palettes';

type DashboardContextType = {
  palette: string[];
  setPaletteName: (name: PaletteName) => void;
  paletteName: PaletteName;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [paletteName, setPaletteName] = useState<PaletteName>('vibrant');

  const value = useMemo(() => ({
    palette: palettes[paletteName].colors,
    paletteName,
    setPaletteName,
  }), [paletteName]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
