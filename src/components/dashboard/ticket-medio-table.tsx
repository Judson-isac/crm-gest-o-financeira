"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "../ui/scroll-area";

type TicketMedioTableProps = {
    data: {
        polo: string;
        ticket1: number;
        ticket2: number;
        discount: number;
    }[];
    onRemove?: () => void;
}

export function TicketMedioTable({ data, onRemove }: TicketMedioTableProps) {
    return (
        <Card className="h-full grid grid-rows-[auto_1fr]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base drag-handle cursor-move">Ticket Médio</CardTitle>
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
                                <TableHead className="text-right">1ª Mens.</TableHead>
                                <TableHead className="text-right">2ª Mens.</TableHead>
                                <TableHead className="text-right">Desc. Médio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data && data.length > 0 ? data.map(item => (
                                <TableRow key={item.polo}>
                                    <TableCell className="font-medium">{item.polo}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.ticket1)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.ticket2)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.discount)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Sem dados para exibir.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
