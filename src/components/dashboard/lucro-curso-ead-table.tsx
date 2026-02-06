"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucratividadePorCursoData } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type WidgetProps = {
  data: LucratividadePorCursoData[];
  onRemove?: () => void;
};

export function LucroCursoEADTable({ data, onRemove }: WidgetProps) {
    const tableData = data.filter(item => item.metodologia === 'EAD');

    const footerData = tableData.reduce((acc, row) => {
        acc.repasse += row.repasse;
        acc.despesa += row.despesa;
        acc.lucro += row.lucro;
        return acc;
    }, { repasse: 0, despesa: 0, lucro: 0});

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="drag-handle cursor-move">
            <CardTitle className="text-base">Tabela: Lucro por Curso EAD</CardTitle>
            <CardDescription className="text-xs">Repasse do Curso - Despesa Direta do Curso</CardDescription>
        </div>
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
                 <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead className="text-right">Repasse</TableHead>
                        <TableHead className="text-right">Despesa Direta</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tableData.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{row.nome}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(row.repasse)}</TableCell>
                             <TableCell className="text-right font-mono text-destructive/80">{formatCurrency(row.despesa)}</TableCell>
                            <TableCell className={`text-right font-mono font-semibold ${row.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(row.lucro)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 <TableFooter className="sticky bottom-0 bg-card font-bold">
                    <TableRow>
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(footerData.repasse)}</TableCell>
                        <TableCell className="text-right font-mono text-destructive/80">{formatCurrency(footerData.despesa)}</TableCell>
                        <TableCell className={`text-right font-mono ${footerData.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(footerData.lucro)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
