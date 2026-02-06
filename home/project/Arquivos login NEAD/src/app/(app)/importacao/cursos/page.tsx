
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload, FileJson } from 'lucide-react';
import { fetchCursosJson } from '@/app/actions';
import { importCursosAction } from '@/actions/cursos';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ImportacaoCursosPage() {
  const [isFetching, startFetching] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [jsonData, setJsonData] = useState<any>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFetch = () => {
    startFetching(async () => {
      setJsonData(null);
      setFileName(null);
      const result = await fetchCursosJson();
      if (result.success) {
        setJsonData(result.data);
        setFileName('cursos_automatico.json');
        toast({ title: 'Sucesso!', description: 'Dados dos cursos carregados.' });
      } else {
        setJsonData({ error: result.error });
        toast({ variant: 'destructive', title: 'Erro!', description: result.error });
      }
    });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          if (typeof content === 'string') {
            const parsedJson = JSON.parse(content);
            setJsonData(parsedJson);
            toast({ title: 'Arquivo carregado', description: `Conteúdo de ${file.name} está pronto para ser importado.`});
          }
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro ao analisar arquivo', description: 'O arquivo selecionado não é um JSON válido.' });
          setJsonData(null);
          setFileName(null);
        }
      };
      reader.readAsText(file);
    }
  }

  const handleDownload = () => {
    if (!jsonData) return;
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cursos.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!jsonData || !Array.isArray(jsonData.CURSOS)) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum dado de curso válido para importar. Busque ou carregue os dados primeiro.' });
        return;
    }
    startImporting(async () => {
        const result = await importCursosAction(jsonData.CURSOS);
        if (result.success) {
            toast({ title: 'Importação Concluída!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Falha na Importação', description: result.message });
        }
    });
  };

  const isProcessing = isFetching || isImporting;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Traduções de Cursos</CardTitle>
          <CardDescription>
            Use o método automático para buscar os dados mais recentes ou o manual para subir um arquivo JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="automatico" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="automatico">Automático</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                </TabsList>
                <TabsContent value="automatico" className="mt-4">
                    <div className="flex items-center gap-4">
                        <Button onClick={handleFetch} disabled={isProcessing}>
                            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isFetching ? 'Buscando...' : 'Buscar Dados (Automático)'}
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="manual" className="mt-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">Arquivo JSON</Label>
                        <Input id="file" type="file" onChange={handleFileChange} accept=".json" disabled={isProcessing} />
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      {jsonData && (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Dados Carregados</CardTitle>
                    <CardDescription>
                        {fileName ? `Dados do arquivo: ${fileName}. ` : "Dados da busca automática. "}
                        Revise o conteúdo e importe para o banco de dados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Button onClick={handleImport} disabled={isProcessing || !jsonData?.CURSOS}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isImporting ? 'Importando...' : 'Importar para o Banco'}
                    </Button>
                    <Button onClick={handleDownload} variant="outline" disabled={isProcessing}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar JSON Carregado
                    </Button>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview do JSON</CardTitle>
                <CardDescription>Apenas a chave `CURSOS` será importada.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted">
                  <pre className="text-xs break-all whitespace-pre-wrap">
                    {JSON.stringify(jsonData, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
        </>
      )}

    </div>
  );
}
