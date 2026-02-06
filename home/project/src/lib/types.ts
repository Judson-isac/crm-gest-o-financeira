
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
  categoria: string;
  descricao: string;
  valor: number;
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
};

export type Spacepoint = {
    id: string;
    processoSeletivo: string;
    date: Date;
    percentage: number;
};

export type TipoCurso = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
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

    
