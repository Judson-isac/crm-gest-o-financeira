
"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { ImportDialog } from "../financial-records/import-dialog";
import { ClientOnly } from "../client-only";
import { ThemeToggle } from "./theme-toggle";
import { UserNav } from "./user-nav";
import type { Usuario } from "@/lib/types";

const getTitle = (path: string) => {
  if (path.startsWith("/matricula/nova")) return "Nova Matrícula";
  if (path.startsWith("/matricula/listar")) return "Listar Matrículas";
  if (path.startsWith("/matricula")) return "Matrículas";

  if (path.startsWith("/cadastros")) return "Cadastros Gerais";

  if (path.startsWith("/usuarios/listar")) return "Gerenciamento de Usuários";
  if (path.startsWith("/usuarios/funcoes")) return "Funções Personalizadas";
  if (path.startsWith("/usuarios")) return "Usuários e Permissões";

  if (path === "/") return "Gestão de Receitas";
  if (path === "/dashboard") return "Dashboard Financeiro";
  if (path.startsWith("/despesas")) return "Lançamento de Despesas";

  if (path === "/importacao/nead") return "Importação NEAD";
  if (path === "/importacao/cursos") return "Importação de Cursos";
  if (path.startsWith("/importacao")) return "Importações";

  if (path.startsWith("/importacao")) return "Importações";

  return "APP_NAME_PLACEHOLDER"; // Will be replaced by dynamic title component
};

export function AppHeader({ user, appName }: { user: Omit<Usuario, 'senha'> | null, appName: string }) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="flex h-16 items-center gap-4 rounded-lg border bg-card/60 px-4 shadow-sm md:px-6 mx-4 mt-4 backdrop-blur-lg">
      <SidebarTrigger />
      <h1 className="text-xl font-semibold md:text-2xl">
        {title === 'APP_NAME_PLACEHOLDER' ? appName : title}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        {pathname === '/' && (
          <ClientOnly>
            <ImportDialog />
          </ClientOnly>
        )}
        <ThemeToggle />
        <UserNav user={user} />
      </div>
    </header>
  );
}

