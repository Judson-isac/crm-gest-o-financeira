
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "../ui/scroll-area";

type TableViewProps = {
  data: any[];
  footer: any;
  columns: string[];
  onRemove?: () => void;
};

export function ReceitaPorPoloTable({ data, footer, columns, onRemove }: TableViewProps) {
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base drag-handle cursor-move">Receita por Polo</CardTitle>
                <div className="flex items-center gap-2">
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                    <Move className="h-4 w-4 text-muted-foreground drag-handle cursor-move" />
                </div>
            </CardHeader>
            <CardContent>
                <p>Sem dados para exibir.</p>
            </CardContent>
        </Card>
    );
  }

  const formatHeader = (col: string) => {
    if (col === 'polo') return 'Polo';
    return col.charAt(0).toUpperCase() + col.slice(1);
  }

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base drag-handle cursor-move">Receita por Polo</CardTitle>
        <div className="flex items-center gap-2">
             {onRemove && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
            <Move className="h-4 w-4 text-muted-foreground drag-handle cursor-move" />
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="bg-card sticky top-0 z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className={col.toLowerCase() === 'polo' ? 'text-left' : 'text-right'}>
                    {formatHeader(col)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      className={col.toLowerCase() === 'polo' 
                        ? 'font-medium' 
                        : 'text-right font-mono'
                      }
                    >
                      {col.toLowerCase() === 'polo' ? row[col] : formatCurrency(row[col] || 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="font-bold bg-card sticky bottom-0">
                <TableRow>
                    {columns.map((col) => (
                        <TableCell 
                            key={col}
                            className={col.toLowerCase() === 'polo' ? '' : 'text-right font-mono'}
                        >
                          {col.toLowerCase() === 'polo' ? footer[col] : formatCurrency(footer[col] || 0)}
                        </TableCell>
                    ))}
                </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
