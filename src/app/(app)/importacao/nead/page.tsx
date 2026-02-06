
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { Send, Loader2, KeyRound, CheckCircle, List, LogOut } from "lucide-react";

import { authenticateAndGetCookie, fetchRepasseOptions } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FinancialRecord } from "@/lib/types";
import { parseAndTransformHtml } from "@/lib/html-parser";
import { NeadImportConfirmationDialog } from "@/components/financial-records/nead-import-confirmation-dialog";
import { ClientOnly } from "@/components/client-only";

type RepasseOption = {
  value: string;
  label: string;
};

type ExtractedDataState = {
    records: Omit<FinancialRecord, 'id' | 'data_importacao'>[];
    errors: string[];
} | null;

export default function NeadImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthPending, startAuthTransition] = useTransition();
  
  const [isRepasseLoading, setIsRepasseLoading] = useState(false);
  const [repasseOptions, setRepasseOptions] = useState<RepasseOption[]>([]);
  const [selectedRepasse, setSelectedRepasse] = useState<string>("");

  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isImporting, startImportingTransition] = useTransition();

  const [extractedData, setExtractedData] = useState<ExtractedDataState>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // On initial mount, check for saved credentials and update UI
  useEffect(() => {
    const savedCreds = localStorage.getItem('nead_credentials');
    if (savedCreds) {
      try {
        const { login: savedLogin, senha: savedSenha } = JSON.parse(savedCreds);
        if (savedLogin && savedSenha) {
          setLogin(savedLogin);
          setSenha(savedSenha);
          setRememberMe(true);
          setIsAuthenticated(true); // This immediately shows the import form
        }
      } catch (e) {
        console.error("Failed to parse saved credentials", e);
        localStorage.removeItem('nead_credentials');
      }
    }
  }, []);

  // When isAuthenticated becomes true, automatically fetch repasses
  useEffect(() => {
    const authAndFetchRepasses = async () => {
      // Don't fetch if options are already loaded or if we don't have creds
      if (repasseOptions.length > 0 || !login || !senha) return;

      setIsRepasseLoading(true);
      
      const authFormData = new FormData();
      authFormData.append('login', login);
      authFormData.append('senha', senha);
      const authResult = await authenticateAndGetCookie({ success: false }, authFormData);

      if (authResult.success && authResult.cookie) {
        const result = await fetchRepasseOptions({ cookie: authResult.cookie });
        if (result.success && result.options) {
          setRepasseOptions(result.options);
          toast({ title: "Repasses carregados." });
        } else {
          toast({ variant: "destructive", title: "Falha ao carregar repasses", description: result.error });
        }
      } else {
        toast({ variant: "destructive", title: "Falha na autenticação automática.", description: "Suas credenciais salvas podem estar desatualizadas. Por favor, faça o login novamente." });
        setIsAuthenticated(false); // De-authenticate on failure
        localStorage.removeItem('nead_credentials');
      }
      setIsRepasseLoading(false);
    };

    if (isAuthenticated) {
        authAndFetchRepasses();
    }
  }, [isAuthenticated, login, senha, toast, repasseOptions.length]);

  // Auto-select latest repasse
  useEffect(() => {
    if (repasseOptions.length > 0 && !selectedRepasse) {
        const lastOption = repasseOptions[repasseOptions.length - 1];
        if (lastOption) {
            setSelectedRepasse(lastOption.value);
        }
    }
  }, [repasseOptions, selectedRepasse]);
  
  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startAuthTransition(async () => {
      const authResult = await authenticateAndGetCookie({ success: false }, formData);
      if (authResult.success) {
        setIsAuthenticated(true);
        toast({
          title: "Autenticado com sucesso!",
          description: "Carregando lista de repasses...",
          className: "bg-green-100 border-green-300 text-green-800"
        });
        if (rememberMe) {
          localStorage.setItem('nead_credentials', JSON.stringify({ login, senha }));
        } else {
          localStorage.removeItem('nead_credentials');
        }
      } else {
        setIsAuthenticated(false);
        toast({
          variant: "destructive",
          title: "Falha na Autenticação",
          description: authResult.error,
        });
      }
    });
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    setRepasseOptions([]);
    setSelectedRepasse("");
    localStorage.removeItem('nead_credentials');
    setRememberMe(false);
    // Don't clear login/senha fields to allow easy re-login
    toast({ title: "Você foi desconectado." });
  }
  
  const handleGenerateAndExtract = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const repasse = formData.get("repasse") as string;
    const parceiro = formData.get("parceiro") as string;
    
    startGeneratingTransition(async () => {
      try {
        // Re-authenticate to get a fresh cookie, using credentials from state
        const authFormData = new FormData();
        authFormData.append('login', login);
        authFormData.append('senha', senha);
        const authResult = await authenticateAndGetCookie({ success: false }, authFormData);

        if (!authResult.success || !authResult.cookie) {
          throw new Error(authResult.error || "Falha ao reautenticar. Verifique suas credenciais.");
        }
        
        const freshCookie = authResult.cookie;
        
        const response = await fetch('/api/fetch-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: freshCookie, repasse, parceiro }),
        });

        const htmlContent = await response.text();
        if (!response.ok) {
          // Attempt to parse error from JSON response
          try {
            const errorJson = JSON.parse(htmlContent);
            throw new Error(errorJson.error || `Falha na requisição: ${response.statusText}`);
          } catch {
             throw new Error(`Falha na requisição: ${response.statusText}. Resposta não-JSON recebida.`);
          }
        }
        
        toast({ title: "Relatório gerado", description: "Analisando dados..." });
        
        const parseResult = parseAndTransformHtml(htmlContent, `repasse_${repasse}.html`, (log) => console.log(log));
        setExtractedData(parseResult);
        setIsConfirmationOpen(true);

      } catch (e: any) {
        const errorMessage = e.message || "Ocorreu um erro desconhecido ao gerar o relatório.";
        toast({
          variant: "destructive",
          title: "Falha ao Gerar ou Analisar",
          description: errorMessage,
        });
      }
    });
  };

  const handleConfirmImport = async () => {
    if (!extractedData || extractedData.records.length === 0) {
        toast({ variant: "destructive", title: "Nenhum dado para importar" });
        return;
    }
    
    startImportingTransition(async () => {
      const response = await fetch('/api/import-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData.records),
      });
      const result = await response.json();
      
      if (result.success) {
        toast({ title: "Importação Concluída!", description: result.message });
        router.push('/');
      } else {
        toast({ variant: "destructive", title: "Falha na Importação", description: result.message });
      }
      setIsConfirmationOpen(false);
    });
  }

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('nead_credentials');
    }
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 md:p-12 gap-6">
      {!isAuthenticated ? (
        <Card className="w-full max-w-2xl shadow-lg animate-in fade-in-0 zoom-in-95">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2"><KeyRound/>Login</CardTitle>
            <CardDescription>Faça login no sistema NEAD para obter acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input id="login" name="login" required value={login} onChange={(e) => setLogin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" name="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => handleRememberMeChange(checked as boolean)} />
                <Label htmlFor="remember">Permanecer Logado</Label>
              </div>
              <Button type="submit" disabled={isAuthPending} className="w-full sm:w-auto">
                {isAuthPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Autenticando...</> : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl shadow-lg animate-in fade-in-0 zoom-in-95">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2"><Send/>Importação de Relatório</CardTitle>
                    <CardDescription>Conectado como: <span className="font-semibold">{login}</span></CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateAndExtract} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="repasse">Repasse</Label>
                    <ClientOnly>
                      <Select name="repasse" onValueChange={setSelectedRepasse} value={selectedRepasse} disabled={isRepasseLoading || repasseOptions.length === 0 || isGenerating}>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isRepasseLoading ? "Carregando..." : 
                            repasseOptions.length === 0 ? "Nenhum repasse encontrado" : 
                            "Selecione um repasse"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {repasseOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ClientOnly>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="parceiro">Polo (Opcional)</Label>
                    <Input id="parceiro" name="parceiro" placeholder="Deixe em branco para [TODOS]" disabled={isGenerating}/>
                </div>
              </div>
              
              <Button type="submit" disabled={isGenerating || isRepasseLoading || !selectedRepasse} className="w-full sm:w-auto">
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Gerar e Extrair Dados'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <NeadImportConfirmationDialog 
        isOpen={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        extractedData={extractedData}
        onConfirm={handleConfirmImport}
        isImporting={isImporting}
      />
    </div>
  );
}
