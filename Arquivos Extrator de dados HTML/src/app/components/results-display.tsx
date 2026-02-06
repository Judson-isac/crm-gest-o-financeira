
import type { ExtractedData, ExtractedPoloData, ExtractedRecord } from "@/lib/extractor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building, FileText, Info, MinusCircle, PieChart } from "lucide-react";
import React from "react";

type ResultsDisplayProps = {
  isLoading: boolean;
  extractedData: ExtractedData | null;
};

function formatCurrency(value: string | null | undefined): string {
    if (value === null || value === undefined || value.trim() === '') return 'N/A';
    const numberValue = parseFloat(value);
    if (isNaN(numberValue)) return 'N/A';
  
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);
}

const RevenueTable = ({ records }: { records: ExtractedRecord[] }) => (
    <div className="rounded-lg border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>RA/Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Curso</TableHead>
                    <TableHead className="hidden lg:table-cell">Ingresso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Parcela</TableHead>
                    <TableHead className="hidden lg:table-cell">Vencimento</TableHead>
                    <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Comissão (Repasse)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {records.length > 0 ? records.map((record, i) => (
                    <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{record.idSequencial}</TableCell>
                        <TableCell className="font-mono text-xs">{record.raCodigo}</TableCell>
                        <TableCell className="font-medium">{record.nomeAluno}</TableCell>
                        <TableCell className="hidden md:table-cell">{record.curso}</TableCell>
                        <TableCell className="hidden lg:table-cell">{record.dataIngresso}</TableCell>
                        <TableCell>{record.tipoLancamento}</TableCell>
                        <TableCell className="hidden lg:table-cell">{record.parcela}</TableCell>
                        <TableCell className="hidden lg:table-cell">{record.vencimento}</TableCell>
                        <TableCell className="hidden lg:table-cell">{record.pagamento}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(record.valorBruto)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(record.valorLiquido)}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={11} className="text-center h-24 text-muted-foreground">Nenhuma receita encontrada para esta categoria.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    </div>
);

const PoloDetails = ({ polo }: { polo: ExtractedPoloData }) => {
    const revenueTabs = [
        { title: "Graduação", data: polo.revenues_graduacao, count: polo.revenues_graduacao.length },
        { title: "Pós-Graduação", data: polo.revenues_pos_graduacao, count: polo.revenues_pos_graduacao.length },
        { title: "Técnico", data: polo.revenues_tecnico, count: polo.revenues_tecnico.length },
        { title: "Profissionalizante", data: polo.revenues_profissionalizante, count: polo.revenues_profissionalizante.length },
        { title: "Universo EAD", data: polo.revenues_universo_ead, count: polo.revenues_universo_ead.length },
    ].filter(tab => tab.count > 0);
    
    const totalStudents = polo.revenues_graduacao.length + polo.revenues_pos_graduacao.length + polo.revenues_tecnico.length + polo.revenues_profissionalizante.length + polo.revenues_universo_ead.length;

    const summaryHeaders = ["Graduação", "Pós-Graduação", "Universo EAD", "Profissionalizante", "Técnico"];
    const resumoDetalhes = polo.resumo_categorias?.detalhes;

    const getResumoRow = (type: 'mensalidade' | 'servico' | 'acordo' | 'total') => {
        const emptyRow = Array(5).fill({ pago: '0.00', repasse: '0.00' });
        if (!resumoDetalhes || !resumoDetalhes[type] || resumoDetalhes[type].length === 0) return emptyRow;
        
        const data = resumoDetalhes[type];
        // Ensure the data has the correct length, padding with empty values if necessary
        return [...data, ...emptyRow.slice(data.length)];
    }
    
    const calculateTotalRow = (rowData: {pago: string; repasse: string}[]) => {
        if (!rowData || rowData.length === 0) return { pago: '0.00', repasse: '0.00' };
        const totalPago = rowData.reduce((sum, item) => sum + parseFloat(item.pago || '0'), 0);
        const totalRepasse = rowData.reduce((sum, item) => sum + parseFloat(item.repasse || '0'), 0);
        return { pago: totalPago.toFixed(2), repasse: totalRepasse.toFixed(2) };
    }


    return (
        <AccordionItem value={`polo-${polo.nomePoloCidade}`} key={polo.nomePoloCidade} className="rounded-lg border bg-card mb-2">
            <AccordionTrigger className="p-4 text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <span>{polo.nomePoloCidade || 'Unknown Polo'}</span>
                </div>
                <Badge variant="secondary">{totalStudents} alunos</Badge>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-4 pb-4 pt-0">
                <div className="rounded-lg border bg-secondary/30 p-4">
                    <h4 className="mb-2 font-semibold">Detalhes do Polo</h4>
                    <p className="text-sm"><strong>Razão Social:</strong> {polo.razaoSocial || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground"><strong>Dados Bancários:</strong> {polo.dadosBancarios || 'N/A'}</p>
                </div>

                {polo.discounts && polo.discounts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MinusCircle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-lg">Deduções e Ajustes</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Parcela</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead>Pagamento</TableHead>
                                        <TableHead className="text-right">Valor Bruto</TableHead>
                                        <TableHead className="text-right">Valor Repasse</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {polo.discounts.map((discount, i) => (
                                        <TableRow key={`discount-${i}`}>
                                            <TableCell>{discount.descricao}</TableCell>
                                            <TableCell>{discount.parcela}</TableCell>
                                            <TableCell>{discount.vencimento}</TableCell>
                                            <TableCell>{discount.pagamento}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{formatCurrency(discount.valorBruto)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{formatCurrency(discount.valorLiquido)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {totalStudents > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Receitas por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={revenueTabs[0]?.title} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                                    {revenueTabs.map(tab => (
                                        <TabsTrigger key={tab.title} value={tab.title}>{tab.title} ({tab.count})</TabsTrigger>
                                    ))}
                                </TabsList>
                                {revenueTabs.map(tab => (
                                    <TabsContent key={tab.title} value={tab.title} className="mt-4">
                                        <RevenueTable records={tab.data} />
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Resumo Geral por Categoria</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-left w-24"></TableHead>
                                    {summaryHeaders.map(header => (
                                        <TableHead key={header} colSpan={2} className="text-center border-l">{header}</TableHead>
                                    ))}
                                     <TableHead key="Total" colSpan={2} className="text-center border-l bg-muted/50 font-bold">Total</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="text-left font-semibold">Tipo</TableHead>
                                    {[...summaryHeaders, "Total"].flatMap(header => 
                                        [
                                            <TableHead key={`${header}-pago`} className={`text-right border-l font-normal ${header === 'Total' ? 'bg-muted/50' : ''}`}>Valor Pago</TableHead>,
                                            <TableHead key={`${header}-repasse`} className={`text-right font-normal ${header === 'Total' ? 'bg-muted/50' : ''}`}>Repasse</TableHead>
                                        ]
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(['mensalidade', 'servico', 'acordo', 'total'] as const).map(type => {
                                    const rowData = getResumoRow(type);
                                    const total = calculateTotalRow(rowData);
                                    return (
                                        <TableRow key={type} className={type === 'total' ? 'font-bold bg-secondary/50' : ''}>
                                            <TableCell className="font-semibold uppercase">{type}</TableCell>
                                            {rowData.map((item, index) => (
                                                <React.Fragment key={index}>
                                                    <TableCell className="text-right font-mono text-sm border-l">{formatCurrency(item.pago)}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">{formatCurrency(item.repasse)}</TableCell>
                                                </React.Fragment>
                                            ))}
                                            <TableCell className="text-right font-mono text-sm border-l bg-muted/50 font-bold">{formatCurrency(total.pago)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm bg-muted/50 font-bold">{formatCurrency(total.repasse)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-right">
                    <div className="rounded-md border p-3">
                        <p className="text-sm text-muted-foreground">Total NF (Bruto)</p>
                        <p className="font-mono text-lg font-semibold">{formatCurrency(polo.totalBruto) || 'N/A'}</p>
                    </div>
                    <div className="rounded-md border p-3">
                        <p className="text-sm text-muted-foreground">Total Descontos</p>
                        <p className="font-mono text-lg font-semibold text-destructive">{formatCurrency(polo.totalDescontos) || 'N/A'}</p>
                    </div>
                    <div className="rounded-md border bg-primary/10 p-3">
                        <p className="text-sm text-primary">Total Líquido (Repasse)</p>
                        <p className="font-mono text-lg font-bold text-primary">{formatCurrency(polo.totalLiquido) || 'N/A'}</p>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};


export function ResultsDisplay({ isLoading, extractedData }: ResultsDisplayProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!extractedData) {
    return (
      <Card className="text-center bg-secondary/50">
        <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Info className="h-6 w-6 text-secondary-foreground" />
            </div>
          <CardTitle>Awaiting Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Your extracted data will appear here once processed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {extractedData.polos && extractedData.polos.length > 0 ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <CardTitle>Report Metadata</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">Unidade</dt>
                        <dd className="mt-1 text-lg font-semibold">{extractedData.nomeUnidade || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">Mês/Referência</dt>
                        <dd className="mt-1 text-lg font-semibold">{extractedData.mesReferencia || 'N/A'}</dd>
                    </div>
                     <div>
                        <dt className="text-sm font-medium text-muted-foreground">Período</dt>
                        <dd className="mt-1 text-lg font-semibold">{extractedData.periodo || 'N/A'}</dd>
                    </div>
                </dl>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full">
            {extractedData.polos?.map((polo) => (
                <PoloDetails polo={polo} key={polo.nomePoloCidade} />
            ))}
          </Accordion>
        </div>
      ) : (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Extracted</AlertTitle>
            <AlertDescription>
                Could not extract any data. Please check if the HTML content is correct.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
        </div>
    </div>
  );
}
