
export type Polo = 'Conchas' | 'Laranjal Paulista' | 'Bofete' | 'Botucatu' | 'Pereiras' | 'Anhembi' | string;
export type Categoria = 'Receita Graduação' | 'Receita Pós-Graduação' | 'Receita Profissionalizantes' | 'Outras Receitas' | 'Receita Técnico' | string;
export type Tipo = 'Mensalidade' | 'Acordo' | 'Serviço' | 'Descontos';

export type FinancialRecord = {
  id: string;
  polo: Polo;
  categoria: Categoria;
  tipo: Tipo;
  parcela: number;
  valor_pago: number;
  valor_repasse: number;
  referencia_mes: number;
  referencia_ano: number;
  data_importacao: string; // ISO string
  import_id: string;
  nome_arquivo: string;
  tipo_importacao: 'NEAD' | 'Arquivo';
  sigla_curso?: string;
  redeId?: string;
};

export type SummaryData = {
  totalRecords: number;
  totalReceita: number;
  totalRepasse: number;
  tipoCounts: Record<Tipo, number>;
  monthlyGrowth?: number;
};

export type Filters = {
  polo?: string | string[];
  categoria?: string;
  mes?: number;
  ano?: number;
  processo?: string; // ID of the process
  modo?: 'pago' | 'repasse';
};

export type ImportInfo = {
  id: string; // The unique ID of the log entry itself
  import_id: string; // The ID shared by all records in this batch or the unique ID for the course import
  nome_arquivo?: string;
  data_importacao: string; // ISO string
  total_registros: number;
  referencia_mes?: number;
  referencia_ano?: number;
  tipo_importacao: 'NEAD' | 'Arquivo' | 'Cursos';
};

export type Despesa = {
  id: string;
  polo: Polo;
  referencia_ano: number;
  referencia_mes: number;
  tipo_despesa: 'GERAL' | 'EAD' | 'HIBRIDO' | 'NICHO';
  sigla_curso?: string;
  nicho_curso?: string;
  descricao: string;
  valor: number;
  redeId?: string;
};

export type LucratividadeData = {
  polo: string;
  receita: number;
  repasse: number;
  despesa: number;
  lucro: number;
};

export type LucratividadePorMetodologiaData = {
  polo: string;
  tipo: 'EAD' | 'HIBRIDO' | 'Outros';
  receita: number;
  repasse: number;
  despesa: number; // prorated
  lucro: number;
};

export type Curso = {
  id: string;
  nome: string;
  sigla: string;
  sigla_alternativa?: string;
  ativo?: boolean;
  tipo: 'EAD' | 'HIBRIDO' | string;
  tipoCursoId?: string;
  nicho?: string;
  redeId?: string;
};

export type LucratividadePorCursoData = {
  sigla: string;
  nome: string;
  tipo: string;
  receita: number;
  repasse: number;
  despesa: number;
  lucro: number;
};

export type Rede = {
  id: string;
  nome: string;
  polos: string[];
  modulos?: string[];
  whatsapp_enabled?: boolean;
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_chatwoot_config?: any;
  whatsapp_profile_id?: string;
};

export type WhatsAppProfile = {
  id: string;
  name: string;
  api_url?: string;
  api_token?: string;
  chatwoot_config?: any;
  created_at?: Date;
  updated_at?: Date;
};

// --- Cadastros ---

export type Canal = {
  id: string;
  nome: string;
  ativo: boolean;
  redeId: string;
};

export type Campanha = {
  id: string;
  nome: string;
  dataInicial: Date;
  dataFinal: Date;
  status: 'Ativo' | 'Inativo';
  redeId: string;
};

export type ProcessoSeletivo = {
  id: string;
  nome?: string; // Added nome
  numero: string;
  ano: number;
  dataInicial: Date;
  dataFinal: Date;
  ativo: boolean;
  redeId: string;
};

export type NumeroProcessoSeletivo = {
  id: string;
  numero: string;
  redeId: string;
};

export type SystemConfig = {
  appName: string;
  appLogo: string;
  appLogoDark?: string; // New
  appFavicon?: string;
  appFaviconDark?: string; // New
  // Sidebar
  appLogoHeight?: string; // Used as Sidebar Open Height
  appLogoIconHeight?: string; // Sidebar Collapsed Height
  appLogoSidebarWidth?: string;
  appLogoSidebarScale?: string; // New
  appLogoSidebarPosition?: 'left' | 'center' | 'right';
  appLogoSidebarOffsetX?: number;
  appLogoSidebarOffsetY?: number;

  // Login (Standard)
  appLogoLoginHeight?: string; // New (was shared)
  appLogoLoginScale?: string;
  appLogoLoginPosition?: 'center' | 'left' | 'right';
  appLogoLoginOffsetX?: number;
  appLogoLoginOffsetY?: number;

  // Login (Super Admin)
  appLogoSuperAdminHeight?: string;
  appLogoSuperAdminScale?: string; // New
  appLogoSuperAdminPosition?: 'left' | 'center' | 'right'; // New
  appLogoSuperAdminOffsetX?: number; // New
  appLogoSuperAdminOffsetY?: number; // New
};

export type Meta = {
  id: string;
  polo: string;
  tipoCurso: string;
  processoSeletivo: string;
  metaQtd: number;
  realizadas: number;
  ticketMedio: number;
  metaRPV: number;
  ativo: boolean;
  redeId: string;
};

export type MetaUsuario = {
  id: string;
  usuarioId: string;
  processoId: string;
  numeroSemana: number;
  metaQtd: number;
  redeId: string;
  criadoEm?: Date;
};

export type Spacepoint = {
  id: string;
  processoSeletivo: string;
  redeId: string;
  numeroSpace: number;
  dataSpace: Date;
  metaTotal: number;
  metasPorTipo: Record<string, number>; // Key: TipoCurso Name in UPPERCASE, Value: Qtd
  polo?: string; // Optional polo specificity
};

export type TipoCurso = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  redeId: string;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  funcao: string;
  status: 'Verificado' | 'Pendente';
  isSuperadmin?: boolean;
  avatarUrl?: string;
  redeId: string;
  polos: string[];
  // This can be derived via JOIN, so it's optional on the core type
  rede?: string;
};

export type Permissoes = {
  verDashboard: boolean;
  gerenciarMatriculas: boolean;
  verRelatoriosFinanceiros: boolean;
  gerenciarCadastrosGerais: boolean;
  gerenciarUsuarios: boolean;
  realizarImportacoes: boolean;
  verRanking: boolean;
  gerenciarWhatsapp: boolean;
};

export type UserPermissions = Permissoes & {
  polos: string[] | null; // null means all polos
  isSuperadmin: boolean;
  redeId: string | null;
};

export type Funcao = {
  id: string;
  nome: string;
  permissoes: Permissoes;
  redeId: string;
  polos?: string[];
};

export type Matricula = {
  id: string;
  redeId: string;
  usuarioId?: string;
  usuarioNome?: string; // Nome do responsável (vendedor)
  dataMatricula: Date;
  processoSeletivoId?: string;
  polo: string;
  estado: string;
  cidade: string;
  nomeAluno: string;
  telefone?: string;
  ra?: string;
  tipoCursoId?: string;
  cursoSigla: string;
  campanhaId?: string;
  canalId?: string;
  primeiraMensalidade?: number;
  segundaMensalidade: number;
  bolsaGestor?: number; // Percentual da Bolsa Gestor (0-100)
  anexos?: string[];
  status?: string; // Added status
  criadoEm?: Date;
  atualizadoEm?: Date;
};

export type RankingConfig = {
  redeId: string;
  voiceEnabled: boolean;
  voiceSpeed: number;
  soundEnabled: boolean;
  alertMode: 'confetti' | 'alert';
  soundUrl?: string; // Som para matrículas
  manualAlertSoundUrl?: string; // Som para disparo manual
  updatedAt: Date;
};

export type RankingMessage = {
  id: string;
  redeId: string;
  message: string;
  createdAt: Date;
};

export type SuperAdminStats = {
  totalRedes: number;
  totalUsuarios: number;
  totalFuncoes: number;
};

export type WhatsAppInstance = {
  id: string;
  redeId: string;
  apiUrl?: string;
  instanceName: string;
  instanceToken: string;
  ownerId?: string;
  status: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};
