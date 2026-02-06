"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucratividadeData } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type WidgetProps = {
  data: LucratividadeData[];
  onRemove?: () => void;
};

export function LucroBrutoTable({ data, onRemove }: WidgetProps) {
    const tableData = data.map((item) => ({
        polo: item.polo,
        receita: item.receita,
        repasse: item.repasse,
        'Enviado para Sede': item.receita - item.repasse,
    }));

    const footerData = tableData.reduce((acc, row) => {
        acc.receita += row.receita;
        acc.repasse += row.repasse;
        acc['Enviado para Sede'] += row['Enviado para Sede'];
        return acc;
    }, { receita: 0, repasse: 0, 'Enviado para Sede': 0});

  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="drag-handle cursor-move">
            <CardTitle className="text-base">Tabela: Enviado para Sede</CardTitle>
            <CardDescription className="text-xs">Receita da unidade - Repasse do polo</CardDescription>
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
                        <TableHead>Polo</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Repasse</TableHead>
                        <TableHead className="text-right">Enviado para Sede</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tableData.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{row.polo}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(row.receita)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(row.repasse)}</TableCell>
                            <TableCell className="text-right font-mono text-primary font-semibold">{formatCurrency(row['Enviado para Sede'])}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter className="sticky bottom-0 bg-card font-bold">
                    <TableRow>
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(footerData.receita)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(footerData.repasse)}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{formatCurrency(footerData['Enviado para Sede'])}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
