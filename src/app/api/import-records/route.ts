'use server';

import { NextRequest, NextResponse } from 'next/server';
import { storeFinancialRecords } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { FinancialRecord } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/auth';

// Importa a função de contexto que criamos na camada da API para reutilização.
// Idealmente, esta lógica estaria em /lib/api ou /lib/auth, mas para manter a correção focada,
// vamos definir a lógica de contexto diretamente aqui por enquanto.
async function getApiContext() {
    const user = await getAuthenticatedUser();
    const isSuperAdmin = user?.isSuperadmin ?? false;
    const sessionRedeId = user?.redeId;
    return { user, isSuperAdmin, sessionRedeId };
}

export async function POST(request: NextRequest) {
  try {
    // 1. OBTER CONTEXTO DE SEGURANÇA PRIMEIRO
    const { sessionRedeId } = await getApiContext();

    // 2. VALIDAR SESSÃO
    if (!sessionRedeId) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado. O usuário não pertence a uma rede.' },
        { status: 403 } // 403 Forbidden
      );
    }

    const recordsFromRequest = (await request.json()) as Omit<FinancialRecord, 'id' | 'data_importacao'>[];

    if (!recordsFromRequest || recordsFromRequest.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum registro para salvar.' },
        { status: 400 }
      );
    }

    // 3. "CARIMBAR" OS DADOS COM A REDE ID DA SESSÃO
    // Isso garante que os dados são salvos na rede correta, ignorando qualquer `redeId` que possa vir do cliente.
    const recordsToStore = recordsFromRequest.map(record => ({
      ...record,
      redeId: sessionRedeId, // Sobrescreve/Adiciona a redeId do servidor
    }));

    // 4. ENVIAR OS DADOS SEGUROS PARA O BANCO DE DADOS
    await storeFinancialRecords(recordsToStore);

    revalidatePath('/');
    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      message: `${recordsToStore.length} registros foram importados com sucesso na sua rede.`,
    });

  } catch (error) {
    console.error('Erro ao salvar registros na API:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ocorreu um erro desconhecido ao salvar os registros.';
    return NextResponse.json(
      { success: false, message: `Falha ao salvar registros: ${errorMessage}` },
      { status: 500 }
    );
  }
}
