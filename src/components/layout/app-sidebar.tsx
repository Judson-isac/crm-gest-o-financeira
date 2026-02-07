'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Wallet, Landmark, DownloadCloud, ChevronsLeft, ChevronsRight, ClipboardList, ChevronDown, ChevronRight, UserPlus, Table2, Users, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Permissoes } from '@/lib/types';


const cadastrosSubItems = [
  { href: "/cadastros/metas-rede-polo", label: "Metas Rede/Polo" },
  { href: "/cadastros/metas-usuarios", label: "Metas Usuários" },
  { href: "/cadastros/space-points", label: "SpacePoints" },
  { href: "/cadastros/campanhas", label: "Campanhas" },
  { href: "/cadastros/processo-seletivo", label: "Processo Seletivo" },
  { href: "/cadastros/canais", label: "Canais" },
  { href: "/cadastros/tipos-de-curso", label: "Tipos de Cursos" },
  { href: "/cadastros/cursos", label: "Cursos" },
  { href: "/cadastros/numero-processo-seletivo", label: "Nº Processo Seletivo" },
];


export default function AppSidebar({
  permissions,
  appName,
  appLogo,
  appLogoHeight,
  appLogoIconHeight,
  logoVerticalUrl
}: {
  permissions: Permissoes,
  appName: string,
  appLogo: string,
  appLogoHeight?: string,
  appLogoIconHeight?: string,
  logoVerticalUrl?: string
}) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();

  const isMatriculaActive = pathname.startsWith('/matricula');
  const isGestaoFinanceiraActive = pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/despesas');
  const isImportacaoActive = pathname.startsWith('/importacao');
  const isCadastrosActive = pathname.startsWith('/cadastros');
  const isUsuariosActive = pathname.startsWith('/usuarios');

  const [isCadastrosOpen, setIsCadastrosOpen] = React.useState(isCadastrosActive);
  const [isUsuariosOpen, setIsUsuariosOpen] = React.useState(isUsuariosActive);
  const [isMatriculaOpen, setIsMatriculaOpen] = React.useState(isMatriculaActive);
  const [isGestaoOpen, setIsGestaoOpen] = React.useState(isGestaoFinanceiraActive);
  const [isImportacaoOpen, setIsImportacaoOpen] = React.useState(isImportacaoActive);

  return (
    <>
      <SidebarHeader>
        <div className="flex h-12 items-center justify-start gap-2 overflow-hidden px-2 w-full transition-all duration-300">
          {/* Horizontal Logo (Visible when Expanded) */}
          <div className="group-data-[state=collapsed]:hidden flex items-center justify-start flex-1 min-w-0">
            {appLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={appLogo}
                alt="Logo"
                style={{ height: `${appLogoHeight || '32'}px`, maxHeight: '40px' }}
                className="w-auto object-contain object-left shrink-0 transition-all duration-300"
              />
            ) : (
              <Landmark className="text-primary h-8 w-8 shrink-0" />
            )}
            <h2 className={cn(
              "text-lg font-semibold text-sidebar-foreground whitespace-nowrap ml-2 opacity-100 transition-opacity duration-300",
              appLogo ? "sr-only" : "" // Hide text if logo exists to prevent clutter, or keep it if design permits
            )}>
              {!appLogo && appName}
            </h2>
          </div>

          {/* Vertical Logo (Visible when Collapsed) */}
          <div className="hidden group-data-[state=collapsed]:flex items-center justify-center w-full">
            {logoVerticalUrl || appLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoVerticalUrl || appLogo}
                alt="Icon"
                style={{ height: `${appLogoIconHeight || '32'}px` }}
                className="w-auto object-contain shrink-0 mx-auto"
              />
            ) : (
              <Landmark className="text-primary h-6 w-6 shrink-0 mx-auto" />
            )}
          </div>

          <h2 className={cn(
            "text-lg font-semibold text-sidebar-foreground whitespace-nowrap transition-all duration-300 ease-in-out",
            "group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden"
          )}>
            {appName}
          </h2>
        </div>
      </SidebarHeader >
      <SidebarContent>
        <SidebarMenu>
          {permissions.gerenciarMatriculas && (
            <Collapsible asChild open={isMatriculaOpen} onOpenChange={setIsMatriculaOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isMatriculaActive}
                    className={cn("w-full")}
                    tooltip={{ children: "Matrículas" }}
                  >
                    <UserPlus />
                    <span>Matrículas</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <Link href="/matricula/nova" passHref>
                        <SidebarMenuSubButton isActive={pathname.startsWith("/matricula/nova")}>
                          Nova Matrícula
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/matricula/listar" passHref>
                        <SidebarMenuSubButton isActive={pathname.startsWith("/matricula/listar")}>
                          Listar Matrículas
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {(permissions.verDashboard || permissions.verRelatoriosFinanceiros) && (
            <Collapsible asChild open={isGestaoOpen} onOpenChange={setIsGestaoOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isGestaoFinanceiraActive}
                    className={cn("w-full")}
                    tooltip={{ children: "Gestão Financeira" }}
                  >
                    <Wallet />
                    <span>Gestão Financeira</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {permissions.verRelatoriosFinanceiros && (
                      <SidebarMenuSubItem>
                        <Link href="/" passHref>
                          <SidebarMenuSubButton isActive={pathname === "/"}>
                            Visão Geral
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    )}
                    {permissions.verDashboard && (
                      <SidebarMenuSubItem>
                        <Link href="/dashboard" passHref>
                          <SidebarMenuSubButton isActive={pathname === "/dashboard"}>
                            Dashboard
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    )}
                    {permissions.verRelatoriosFinanceiros && (
                      <SidebarMenuSubItem>
                        <Link href="/despesas" passHref>
                          <SidebarMenuSubButton isActive={pathname.startsWith('/despesas')}>
                            Lançar Despesas
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {/* Ranking Link - Accessible to all verified users or specific permission if needed. */}
          {(permissions.verRanking) && (
            <Collapsible asChild className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Ranking Matrículas">
                    <Trophy />
                    <span>Ranking Matrículas</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <Link href="/ranking" target="_blank" passHref>
                        <SidebarMenuSubButton>
                          <span>Visualizar Ranking</span>
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/ranking/configuracoes" passHref>
                        <SidebarMenuSubButton isActive={pathname.startsWith("/ranking/configuracoes")}>
                          <span>Configurações</span>
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {permissions.gerenciarCadastrosGerais && (
            <Collapsible asChild open={isCadastrosOpen} onOpenChange={setIsCadastrosOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isCadastrosActive}
                    className={cn("w-full")}
                    tooltip={{ children: "Cadastros" }}
                  >
                    <Table2 />
                    <span>Cadastros</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {cadastrosSubItems.map((item) => (
                      <SidebarMenuSubItem key={item.href}>
                        <Link href={item.href} passHref>
                          <SidebarMenuSubButton isActive={pathname === item.href}>
                            {item.label}
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {permissions.gerenciarUsuarios && (
            <Collapsible asChild open={isUsuariosOpen} onOpenChange={setIsUsuariosOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isUsuariosActive}
                    className={cn("w-full")}
                    tooltip={{ children: "Usuários" }}
                  >
                    <Users />
                    <span>Usuários</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <Link href="/usuarios/listar" passHref>
                        <SidebarMenuSubButton isActive={pathname.startsWith("/usuarios/listar")}>
                          Listar Usuários
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/usuarios/funcoes" passHref>
                        <SidebarMenuSubButton isActive={pathname.startsWith("/usuarios/funcoes")}>
                          Funções Personalizadas
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {permissions.realizarImportacoes && (
            <Collapsible asChild open={isImportacaoOpen} onOpenChange={setIsImportacaoOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isImportacaoActive}
                    className={cn("w-full")}
                    tooltip={{ children: "Importações" }}
                  >
                    <DownloadCloud />
                    <span>Importações</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <Link href="/importacao/nead" passHref>
                        <SidebarMenuSubButton isActive={pathname === "/importacao/nead"}>
                          Importação NEAD
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/importacao/cursos" passHref>
                        <SidebarMenuSubButton isActive={pathname === "/importacao/cursos"}>
                          Importar Arquivo de Cursos
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-10 w-10">
          {state === 'expanded' ? <ChevronsLeft /> : <ChevronsRight />}
          <span className="sr-only">Recolher sidebar</span>
        </Button>
      </SidebarFooter>
    </>
  );
}
