'use server';

import { getRankingConfig, saveRankingConfig, createRankingMessage, getLastRankingMessage, getEnrollmentRanking, getEnrollmentStats, getRedeById, getLastEnrollment, getSavedSounds, saveSound, deleteSound, getDistinctValuesForRanking } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSpacepointStatsAction } from '@/actions/dashboard';

export async function getRankingAction(
    period: 'today' | 'month' | 'campaign',
    filters?: {
        polos?: string[],
        processo?: string,
        date?: string
    }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) {
            return { success: false, message: "Acesso negado." };
        }

        const [ranking, stats, config, latestMessage, distinctValues] = await Promise.all([
            getEnrollmentRanking(user.redeId, period, {
                polos: filters?.polos,
                processoId: filters?.processo,
                date: filters?.date
            }),
            getEnrollmentStats(user.redeId, period, {
                polos: filters?.polos,
                processoId: filters?.processo,
                date: filters?.date
            }),
            getRankingConfig(user.redeId),
            getLastRankingMessage(user.redeId),
            getDistinctValuesForRanking(user.redeId)
        ]);

        const latestEnrollment = await getLastEnrollment(user.redeId);

        // Fetch Spacepoint stats if we have a process selected or can find one
        let spacepointData = null;
        let processoId = filters?.processo;

        if (!processoId && distinctValues?.processos?.length > 0) {
            // Find an active process or just the first one
            const activeProcesso = distinctValues.processos.find((p: any) => p.ativo) || distinctValues.processos[0];
            processoId = activeProcesso.id;
        }

        if (processoId) {
            spacepointData = await getSpacepointStatsAction(processoId, filters?.polos?.[0] || 'Todos');
        }

        return {
            success: true,
            data: ranking,
            stats,
            latestEnrollment,
            config,
            latestMessage,
            distinctValues,
            spacepointData,
            redeId: user.redeId,
            redeNome: (await getRedeById(user.redeId))?.nome || 'Minha Rede'
        };
    } catch (error: any) {
        console.error("Erro ao buscar ranking:", error);
        return { success: false, message: "Falha ao carregar ranking." };
    }
}

export async function saveRankingConfigAction(config: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) return { success: false, message: "Erro de permissão" };

        await saveRankingConfig({ ...config, redeId: user.redeId });
        return { success: true };
    } catch (e) {
        return { success: false, message: "Erro ao salvar config" };
    }
}

export async function triggerRankingAlertAction(message: string) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) return { success: false, message: "Erro de permissão" };

        await createRankingMessage(user.redeId, message);
        return { success: true };
    } catch (e) {
        return { success: false, message: "Erro ao disparar alerta" };
    }
}

export async function getSavedSoundsAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) return { success: false, message: "Erro de permissão" };

        const sounds = await getSavedSounds(user.redeId);
        return { success: true, data: sounds };
    } catch (e) {
        return { success: false, message: "Erro ao buscar sons" };
    }
}

export async function saveSoundAction(name: string, url: string) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) return { success: false, message: "Erro de permissão" };

        const sound = await saveSound(user.redeId, name, url);
        return { success: true, data: sound };
    } catch (e: any) {
        console.error("❌ Erro ao salvar som (Action):", e);
        if (e.code) console.error("❌ Código erro DB:", e.code);
        if (e.detail) console.error("❌ Detalhe erro DB:", e.detail);
        return { success: false, message: `Erro ao salvar som: ${e.message || 'Erro desconhecido'}` };
    }
}

export async function deleteSoundAction(id: string) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.redeId) return { success: false, message: "Erro de permissão" };

        await deleteSound(id, user.redeId);
        return { success: true };
    } catch (e) {
        return { success: false, message: "Erro ao deletar som" };
    }
}
