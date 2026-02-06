"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type TopCursosPorPoloData = Record<string, { name: string; value: number }[]>;

type WidgetProps = {
  data: TopCursosPorPoloData;
  onRemove?: () => void;
};

export function TopCursosPorPoloTable({ data, onRemove }: WidgetProps) {
  return (
    <Card className="h-full grid grid-rows-[auto_1fr]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="drag-handle cursor-move">
            <CardTitle className="text-base">Top 5 Cursos por Polo</CardTitle>
            <CardDescription className="text-xs">Cursos mais vendidos em cada polo por faturamento</CardDescription>
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
                        <TableHead>1º</TableHead>
                        <TableHead>2º</TableHead>
                        <TableHead>3º</TableHead>
                        <TableHead>4º</TableHead>
                        <TableHead>5º</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(data).map(([polo, cursos]) => (
                        <TableRow key={polo}>
                            <TableCell className="font-medium">{polo}</TableCell>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableCell key={i} className="text-xs">
                                    {cursos[i] ? (
                                        <div>
                                            <div className="font-medium">{cursos[i].name}</div>
                                            <div className="text-muted-foreground">{formatCurrency(cursos[i].value)}</div>
                                        </div>
                                    ) : '-'}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
