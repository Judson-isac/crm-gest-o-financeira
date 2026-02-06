
"use client";

import { useActionState, useState, useEffect, useCallback, useTransition } from "react";
import { Send, Loader2, KeyRound, CheckCircle, List, ServerCrash, Code, ExternalLink, AlertTriangle, Clipboard, FileJson, Upload, PlayCircle, Bot } from "lucide-react";

import { fetchUrlContent, authenticateAndGetCookie, fetchRepasseOptions } from "@/app/actions";
import { storeParsedRecordsAction } from "@/actions/financial-records";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { FinancialRecord } from "@/lib/types";
import { NeadImportDebugger } from "@/components/financial-records/nead-import-debugger";
import { parseNeadHtml } from "@/lib/nead-html-parser";

type RepasseOption = {
  value: string;
  label: string;
};

type RepasseOptionsState = {
    success: boolean;
    options?: RepasseOption[];
    error?: string;
    rawBody?: string;
    amfBodyString?: string;
};

type ExtractedDataState = {
    records: Omit<FinancialRecord, 'id' | 'data_importacao'>[];
    errors: string[];
} | null;

function ResultDisplay({ htmlContent }: { htmlContent: string; }) {
    const { toast } = useToast();

    if (!htmlContent) return null;
    
    const handleOpenInNewTab = () => {
        if (typeof window !== 'undefined') {
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.open();
                newWindow.document.write(htmlContent);
                newWindow.document.close();
            }
        }
    };

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(htmlContent).then(() => {
            toast({
                title: "Copiado!",
                description: "O código HTML foi copiado para a área de transferência."
            });
        }).catch(err => {
             toast({
                variant: "destructive",
                title: "Falha ao copiar",
                description: "Não foi possível copiar o código HTML."
            });
        });
    }

    return (
        <Card className="w-full mt-6 animate-in fade-in-50">
            <CardHeader>
                <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                        <CardTitle>1. Pré-visualização do Relatório</CardTitle>
                        <CardDescription>O conteúdo do relatório gerado é exibido abaixo.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir em nova guia
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[600px] border rounded-md">
                    <iframe
                        srcDoc={htmlContent}
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
                 <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="html-source">
                        <AccordionTrigger>Ver Código HTML Fonte</AccordionTrigger>
                        <AccordionContent>
                            <div className="relative">
                                <Textarea
                                    readOnly
                                    value={htmlContent}
                                    className="w-full h-96 font-mono text-xs bg-muted"
                                    rows={25}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={handleCopyHtml}
                                >
                                    <Clipboard className="h-4 w-4" />
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}

function ExtractedDataDisplay({ extractedData }: { extractedData: ExtractedDataState }) {
    const { toast } = useToast();
    const [isStoring, startStoreTransition] = useTransition();

    if (!extractedData) return null;

    const { records, errors } = extractedData;

    const handleImport = () => {
        if (!records || records.length === 0) {
            toast({
                variant: "destructive",
                title: "Nenhum registro para importar",
                description: "A extração não encontrou dados válidos."
            });
            return;
        }

        startStoreTransition(async () => {
            const result = await storeParsedRecordsAction(records);
            if (result.success) {
                toast({
                    title: "Importação Concluída!",
                    description: result.message
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Falha na Importação",
                    description: result.message
                });
            }
        });
    }

    return (
        <Card className="w-full mt-6 animate-in fade-in-50">
            <CardHeader>
                 <CardTitle>3. Dados Extraídos para Importação</CardTitle>
                 <CardDescription>
                    A análise do HTML foi concluída. Abaixo estão os dados extraídos. Verifique e importe para o banco de dados.
                 </CardDescription>
            </CardHeader>
            <CardContent>
                {errors.length > 0 && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Ocorreram Avisos na Extração</AlertTitle>
                        <AlertDescription>
                            <ul>
                                {errors.map((error, index) => <li key={index}>- {error}</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <FileJson className="h-5 w-5 text-primary" />
                        <span className="font-medium">{records.length} registros encontrados.</span>
                    </div>
                    <Button onClick={handleImport} disabled={isStoring || records.length === 0}>
                        {isStoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                        {isStoring ? "Importando..." : "Importar Registros"}
                    </Button>
                </div>
                <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted">
                    <pre className="text-xs break-all whitespace-pre-wrap">
                        {JSON.stringify(records, null, 2)}
                    </pre>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

function LoadingSkeleton() {
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <Skeleton className="h-8 w-1/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </CardContent>
    </Card>
  );
}

export default function NeadImportPage() {
  const { toast } = useToast();
  const initialFetchState = { success: false, html: undefined, error: undefined, contentType: undefined };
  const [fetchState, fetchFormAction, isFetchPending] = useActionState(fetchUrlContent, initialFetchState);

  const initialAuthState = { success: false, cookie: undefined, error: undefined };
  const [authState, authFormAction, isAuthPending] = useActionState(authenticateAndGetCookie, initialAuthState);
  
  const [cookie, setCookie] = useState<string>('');
  const [repasseOptions, setRepasseOptions] = useState<RepasseOption[]>([]);
  const [isRepasseLoading, setIsRepasseLoading] = useState(false);
  const [selectedRepasse, setSelectedRepasse] = useState<string>("");
  const [repasseOptionsState, setRepasseOptionsState] = useState<RepasseOptionsState | null>(null);

  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  
  const [extractedData, setExtractedData] = useState<ExtractedDataState>(null);
  
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);
  const [debuggerLogs, setDebuggerLogs] = useState<string[]>([]);
  const [isParsing, startParsingTransition] = useTransition();

  const handleStartParsing = () => {
    if (!fetchState.success || !fetchState.html) {
      toast({
        variant: "destructive",
        title: "Conteúdo HTML não encontrado",
        description: "Gere um relatório primeiro para poder analisá-lo.",
      });
      return;
    }
    
    setDebuggerLogs(['Iniciando análise...']);
    setIsDebuggerOpen(true);
    
    startParsingTransition(() => {
        try {
            const fileName = `repasse_${selectedRepasse}.html`;
            const result = parseNeadHtml(fetchState.html!, fileName, (log) => {
                 setDebuggerLogs(prev => [...prev, log]);
            });
            
            setDebuggerLogs(prev => [...prev, `SUCESSO: Análise concluída. ${result.records.length} registros encontrados.`]);
            setExtractedData(result);

            if(result.records.length === 0) {
                 toast({
                    variant: "destructive",
                    title: "Nenhum dado extraído",
                    description: "A análise do HTML não encontrou registros válidos. Verifique os logs do depurador.",
                });
            } else {
                 toast({
                    title: "Análise Concluída",
                    description: `${result.records.length} registros extraídos.`,
                });
            }

            // Atrasar o fechamento para o usuário ver a mensagem de sucesso
            setTimeout(() => {
                setIsDebuggerOpen(false);
            }, 1500);

        } catch (e: any) {
            setDebuggerLogs(prev => [...prev, `ERRO CRÍTICO: ${e.message}`]);
            toast({
                variant: "destructive",
                title: "Erro na Análise",
                description: "Ocorreu um erro inesperado ao analisar o relatório.",
            });
        }
    });
  };
  
  const handleFetchRepasseOptions = useCallback(async (cookieParam: string) => {
    if (!cookieParam) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa se autenticar primeiro.",
      });
      return;
    }
    setIsRepasseLoading(true);
    const result = await fetchRepasseOptions({ cookie: cookieParam });
    setRepasseOptionsState(result);
    
    if (result.success && result.options) {
      setRepasseOptions(result.options);
      toast({
        title: "Sucesso",
        description: `${result.options.length} repasses carregados.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Falha ao carregar repasses",
        description: result.error || "Ocorreu um erro desconhecido.",
      });
    }
    setIsRepasseLoading(false);
  }, [toast]);

  useEffect(() => {
    if (authState.success && authState.cookie) {
      setCookie(authState.cookie);
       toast({
        variant: "default",
        title: "Autenticado com sucesso!",
        description: "Carregando a lista de repasses...",
        className: "bg-green-100 border-green-300 text-green-800"
      });
      handleFetchRepasseOptions(authState.cookie);
    }
    if (authState.error) {
        toast({
            variant: "destructive",
            title: "Falha na Autenticação",
            description: authState.error,
        });
    }
  }, [authState, toast, handleFetchRepasseOptions]);

  useEffect(() => {
    if (repasseOptions.length > 0) {
      const lastOption = repasseOptions[repasseOptions.length - 1];
      if (lastOption) {
        setSelectedRepasse(lastOption.value);
      }
    }
  }, [repasseOptions]);

  useEffect(() => {
    if (fetchState.success && fetchState.html) {
      setExtractedData(null);
    }
    if(!fetchState.success && fetchState.error){
         toast({
            variant: "destructive",
            title: "Falha ao Gerar Relatório",
            description: fetchState.error,
        });
    }
  }, [fetchState, toast]);
  
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExtractedData(null);
    fetchFormAction(new FormData(event.currentTarget));
  };


  return (
    <div className="flex flex-col items-center p-4 sm:p-8 md:p-12 gap-6">
      <div className="w-full max-w-5xl">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2"><KeyRound/>1. Autenticação</CardTitle>
            <CardDescription>Faça login no sistema NEAD para obter um cookie de sessão.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={authFormAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input id="login" name="login" required value={login} onChange={(e) => setLogin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" name="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button type="submit" disabled={isAuthPending} className="w-full sm:w-auto">
                {isAuthPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Autenticando...</>
                ) : (
                  <>Obter Cookie de Sessão</>
                )}
              </Button>
            </form>
             {authState.success && authState.cookie && (
                <Alert variant="default" className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Autenticação bem-sucedida</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Cookie pronto. Prossiga para o passo 2.
                    </AlertDescription>
                </Alert>
            )}
            {authState.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Falha na Autenticação</AlertTitle>
                <AlertDescription>{authState.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-5xl">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2"><Send/>2. Geração do Relatório</CardTitle>
            <CardDescription>Selecione um repasse para gerar e visualizar o relatório.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => handleFetchRepasseOptions(cookie)} disabled={!cookie || isRepasseLoading} className="w-full sm:w-auto">
                 {isRepasseLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</>
                ) : (
                  <><List className="mr-2 h-4 w-4" />Carregar Lista de Repasses</>
                )}
              </Button>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <input type="hidden" name="cookie" value={cookie || ''} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="repasse">Repasse</Label>
                      <Select name="repasse" onValueChange={setSelectedRepasse} value={selectedRepasse} disabled={!cookie || repasseOptions.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um repasse da lista" />
                        </SelectTrigger>
                        <SelectContent>
                          {isRepasseLoading && <SelectItem value="loading" disabled>Carregando lista...</SelectItem>}
                          {!isRepasseLoading && repasseOptions.length === 0 && <SelectItem value="empty" disabled>Carregue a lista primeiro</SelectItem>}
                          {repasseOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="parceiro">Polo (Opcional)</Label>
                      <Input id="parceiro" name="parceiro" placeholder="Deixe em branco para [TODOS]" disabled={!cookie}/>
                  </div>
                </div>
                
                <Button type="submit" disabled={isFetchPending || !cookie || !selectedRepasse} className="w-full sm:w-auto">
                  {isFetchPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando Relatório...</>
                  ) : (
                    <>Gerar Relatório</>
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {repasseOptionsState && repasseOptionsState.rawBody && (
            <Card className="w-full shadow-lg mt-6">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2"><Code />Depuração da Resposta AMF</CardTitle>
                    <CardDescription>Visualização dos dados brutos e do resultado do parsing.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Corpo da Resposta (Hex)</AccordionTrigger>
                            <AccordionContent>
                                <ScrollArea className="h-72 w-full rounded-md border p-4">
                                     <pre className="text-xs break-all whitespace-pre-wrap">{repasseOptionsState.rawBody || 'Nenhum dado bruto recebido.'}</pre>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Opções de Repasse (JSON Convertido)</AccordionTrigger>
                             <AccordionContent>
                                <ScrollArea className="h-72 w-full rounded-md border p-4">
                                    <pre className="text-xs break-all whitespace-pre-wrap">{JSON.stringify(repasseOptionsState.options, null, 2) || 'Nenhuma opção encontrada.'}</pre>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-3">
                            <AccordionTrigger>Corpo da Requisição (Hex)</AccordionTrigger>
                            <AccordionContent>
                                 <ScrollArea className="h-72 w-full rounded-md border p-4">
                                     <pre className="text-xs break-all whitespace-pre-wrap">{repasseOptionsState.amfBodyString || 'Nenhum corpo de requisição enviado.'}</pre>
                                 </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        )}

        {isFetchPending && <LoadingSkeleton />}
        
        {!isFetchPending && fetchState.success && fetchState.html && (
          <>
            <ResultDisplay htmlContent={fetchState.html} />
            <Card className="w-full mt-6 animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2"><Bot />2. Extração e Importação</CardTitle>
                    <CardDescription>Inicie a análise do relatório para extrair os dados e prepará-los para importação.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleStartParsing} disabled={isParsing}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {isParsing ? "Analisando..." : "Analisar Relatório e Extrair Dados"}
                    </Button>
                </CardContent>
            </Card>
          </>
        )}
        
        {!isParsing && extractedData && <ExtractedDataDisplay extractedData={extractedData} />}
        
        {!isFetchPending && fetchState.error && (
          <Alert variant="destructive" className="mt-6">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Falha na Geração do Relatório</AlertTitle>
            <AlertDescription>{fetchState.error}</AlertDescription>
          </Alert>
        )}

        <NeadImportDebugger 
            isOpen={isDebuggerOpen}
            onOpenChange={setIsDebuggerOpen}
            logs={debuggerLogs}
            isProcessing={isParsing}
        />
        
      </div>
    </div>
  );
}

    