--
-- PostgreSQL database dump
--

\restrict w8OAUFVw2LjerdfUDv5EjWHqzz5JjExBqaVCBmuAEPZai1QBa2jka5615f4InzQ

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg13+2)
-- Dumped by pg_dump version 18.1 (Debian 18.1-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: campanhas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campanhas (
    id text NOT NULL,
    nome text,
    ativo boolean,
    "redeId" text,
    "dataInicial" timestamp without time zone,
    "dataFinal" timestamp without time zone,
    status text
);


--
-- Name: canais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canais (
    id text NOT NULL,
    nome text,
    ativo boolean,
    "redeId" text
);


--
-- Name: cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cursos (
    id text NOT NULL,
    nome text,
    sigla text,
    tipo text,
    ativo boolean,
    sigla_alternativa text,
    nicho text,
    "redeId" text
);


--
-- Name: despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.despesas (
    id text NOT NULL,
    polo text,
    data date,
    descricao text,
    valor numeric,
    categoria text,
    "redeId" text
);


--
-- Name: financial_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_records (
    id text NOT NULL,
    polo text,
    categoria text,
    tipo text,
    parcela integer,
    valor_pago numeric,
    valor_repasse numeric,
    referencia_mes integer,
    referencia_ano integer,
    import_id text,
    nome_arquivo text,
    tipo_importacao text,
    sigla_curso text,
    data_importacao timestamp without time zone,
    "redeId" text
);


--
-- Name: funcoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funcoes (
    id text NOT NULL,
    nome text,
    permissoes jsonb,
    "redeId" character varying(255) NOT NULL,
    polos text[],
    "verRanking" boolean DEFAULT false
);


--
-- Name: import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_logs (
    id text NOT NULL,
    import_id text,
    nome_arquivo text,
    data_importacao timestamp without time zone,
    total_registros integer,
    referencia_mes integer,
    referencia_ano integer,
    tipo_importacao text,
    "redeId" text
);


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriculas (
    id text NOT NULL,
    "redeId" text NOT NULL,
    "dataMatricula" timestamp without time zone NOT NULL,
    "processoSeletivoId" text,
    polo text NOT NULL,
    estado text NOT NULL,
    cidade text NOT NULL,
    "nomeAluno" text NOT NULL,
    telefone text,
    ra text,
    "tipoCursoId" text,
    "cursoSigla" text NOT NULL,
    "campanhaId" text,
    "canalId" text,
    "primeiraMensalidade" numeric(10,2),
    "segundaMensalidade" numeric(10,2) NOT NULL,
    "criadoEm" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    anexos text[],
    "usuarioId" text
);


--
-- Name: metas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metas (
    id text NOT NULL,
    rede text,
    mes integer,
    ano integer,
    valor numeric,
    "redeId" text
);


--
-- Name: numeros_processo_seletivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.numeros_processo_seletivo (
    id text NOT NULL,
    numero text,
    processo_seletivo_id text,
    "redeId" text
);


--
-- Name: processos_seletivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processos_seletivos (
    id text NOT NULL,
    nome text,
    ativo boolean,
    "redeId" text,
    numero text,
    ano integer,
    "dataInicial" timestamp without time zone,
    "dataFinal" timestamp without time zone
);


--
-- Name: ranking_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_config (
    "redeId" text NOT NULL,
    "voiceEnabled" boolean DEFAULT true,
    "voiceSpeed" numeric DEFAULT 1.1,
    "soundEnabled" boolean DEFAULT true,
    "alertMode" text DEFAULT 'confetti'::text,
    "soundUrl" text,
    "updatedAt" timestamp without time zone DEFAULT now(),
    "manualAlertSoundUrl" text,
    manualalertsoundurl text
);


--
-- Name: ranking_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "redeId" text,
    message text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


--
-- Name: redes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redes (
    id text NOT NULL,
    nome text,
    polos text[],
    modulos text[] DEFAULT '{}'::text[]
);


--
-- Name: saved_sounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_sounds (
    id text NOT NULL,
    "redeId" text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


--
-- Name: spacepoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spacepoints (
    id text NOT NULL,
    nome text,
    ativo boolean,
    "redeId" text,
    "processoSeletivo" text,
    date timestamp without time zone,
    percentage numeric(5,2)
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    key character varying(50) NOT NULL,
    value text
);


--
-- Name: tipos_curso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_curso (
    id text NOT NULL,
    nome text,
    sigla text,
    ativo boolean,
    "redeId" text
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id text NOT NULL,
    nome text,
    email text,
    senha text,
    funcao text,
    status text,
    rede text,
    avatarurl text,
    "redeId" character varying(255) NOT NULL,
    "isSuperadmin" boolean DEFAULT false NOT NULL,
    polos text[] DEFAULT '{}'::text[]
);


--
-- Name: campanhas campanhas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campanhas
    ADD CONSTRAINT campanhas_pkey PRIMARY KEY (id);


--
-- Name: canais canais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canais
    ADD CONSTRAINT canais_pkey PRIMARY KEY (id);


--
-- Name: cursos cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_pkey PRIMARY KEY (id);


--
-- Name: cursos cursos_sigla_rede_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_sigla_rede_key UNIQUE (sigla, "redeId");


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);


--
-- Name: financial_records financial_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);


--
-- Name: funcoes funcoes_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcoes
    ADD CONSTRAINT funcoes_nome_key UNIQUE (nome);


--
-- Name: funcoes funcoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcoes
    ADD CONSTRAINT funcoes_pkey PRIMARY KEY (id);


--
-- Name: import_logs import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_pkey PRIMARY KEY (id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: metas metas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_pkey PRIMARY KEY (id);


--
-- Name: numeros_processo_seletivo numeros_processo_seletivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_processo_seletivo
    ADD CONSTRAINT numeros_processo_seletivo_pkey PRIMARY KEY (id);


--
-- Name: processos_seletivos processos_seletivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processos_seletivos
    ADD CONSTRAINT processos_seletivos_pkey PRIMARY KEY (id);


--
-- Name: ranking_config ranking_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_config
    ADD CONSTRAINT ranking_config_pkey PRIMARY KEY ("redeId");


--
-- Name: ranking_messages ranking_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_messages
    ADD CONSTRAINT ranking_messages_pkey PRIMARY KEY (id);


--
-- Name: redes redes_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redes
    ADD CONSTRAINT redes_nome_key UNIQUE (nome);


--
-- Name: redes redes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redes
    ADD CONSTRAINT redes_pkey PRIMARY KEY (id);


--
-- Name: saved_sounds saved_sounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_sounds
    ADD CONSTRAINT saved_sounds_pkey PRIMARY KEY (id);


--
-- Name: spacepoints spacepoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spacepoints
    ADD CONSTRAINT spacepoints_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (key);


--
-- Name: tipos_curso tipos_curso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_curso
    ADD CONSTRAINT tipos_curso_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_matriculas_datamatricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriculas_datamatricula ON public.matriculas USING btree ("dataMatricula");


--
-- Name: idx_matriculas_nomealuno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriculas_nomealuno ON public.matriculas USING btree ("nomeAluno");


--
-- Name: idx_matriculas_redeid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matriculas_redeid ON public.matriculas USING btree ("redeId");


--
-- Name: campanhas campanhas_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campanhas
    ADD CONSTRAINT "campanhas_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: canais canais_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canais
    ADD CONSTRAINT "canais_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: cursos cursos_redeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_redeid_fkey FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: despesas despesas_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT "despesas_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: funcoes fk_redes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funcoes
    ADD CONSTRAINT fk_redes FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: usuarios fk_redes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_redes FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: matriculas matriculas_campanhaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES public.campanhas(id);


--
-- Name: matriculas matriculas_canalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES public.canais(id);


--
-- Name: matriculas matriculas_processoSeletivoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_processoSeletivoId_fkey" FOREIGN KEY ("processoSeletivoId") REFERENCES public.processos_seletivos(id);


--
-- Name: matriculas matriculas_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: matriculas matriculas_tipoCursoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_tipoCursoId_fkey" FOREIGN KEY ("tipoCursoId") REFERENCES public.tipos_curso(id);


--
-- Name: matriculas matriculas_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT "matriculas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id);


--
-- Name: metas metas_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT "metas_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: numeros_processo_seletivo numeros_processo_seletivo_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_processo_seletivo
    ADD CONSTRAINT "numeros_processo_seletivo_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: processos_seletivos processos_seletivos_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processos_seletivos
    ADD CONSTRAINT "processos_seletivos_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: ranking_config ranking_config_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_config
    ADD CONSTRAINT "ranking_config_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: ranking_messages ranking_messages_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_messages
    ADD CONSTRAINT "ranking_messages_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: spacepoints spacepoints_processoSeletivo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spacepoints
    ADD CONSTRAINT "spacepoints_processoSeletivo_fkey" FOREIGN KEY ("processoSeletivo") REFERENCES public.processos_seletivos(id);


--
-- Name: spacepoints spacepoints_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spacepoints
    ADD CONSTRAINT "spacepoints_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- Name: tipos_curso tipos_curso_redeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_curso
    ADD CONSTRAINT "tipos_curso_redeId_fkey" FOREIGN KEY ("redeId") REFERENCES public.redes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict w8OAUFVw2LjerdfUDv5EjWHqzz5JjExBqaVCBmuAEPZai1QBa2jka5615f4InzQ

