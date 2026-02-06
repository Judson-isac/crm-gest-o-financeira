
'use server';

import * as db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Canal, Campanha, ProcessoSeletivo, NumeroProcessoSeletivo, Meta, Spacepoint, TipoCurso, Usuario, Funcao, Permissoes, Rede } from '@/lib/types';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/api';

// Canais
export async function saveCanalAction(canal: Partial<Canal>) {
  try {
    const isSuperAdmin = cookies().has('superadmin-auth');
    if (!isSuperAdmin) {
        const user = await getAuthenticatedUser();
        if (!user?.redeId) throw new Error("Usuário não está associado a nenhuma rede.");
        canal.redeId = user.redeId;
    } else if (!canal.redeId) {
        throw new Error("Superadmin deve especificar uma rede.");
    }
    
    const savedCanal = await db.saveCanal(canal);
    revalidatePath('/cadastros/canais');
    revalidatePath('/matricula/nova');
    return { success: true, data: savedCanal };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteCanalAction(id: string) {
  try {
    await db.deleteCanal(id);
    revalidatePath('/cadastros/canais');
    revalidatePath('/matricula/nova');
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// Campanhas
export async function saveCampanhaAction(campanha: Partial<Campanha>) {
    try {
        const isSuperAdmin = cookies().has('superadmin-auth');
        if (!isSuperAdmin) {
            const user = await getAuthenticatedUser();
            if (!user?.redeId) throw new Error("Usuário não está associado a nenhuma rede.");
            campanha.redeId = user.redeId;
        } else if (!campanha.redeId) {
            throw new Error("Superadmin deve especificar uma rede.");
        }

        const savedCampanha = await db.saveCampanha(campanha);
        revalidatePath('/cadastros/campanhas');
        revalidatePath('/matricula/nova');
        return { success: true, data: savedCampanha };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteCampanhaAction(id: string) {
    try {
        await db.deleteCampanha(id);
        revalidatePath('/cadastros/campanhas');
        revalidatePath('/matricula/nova');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

// Processo Seletivo
export async function saveProcessoSeletivoAction(processo: Partial<ProcessoSeletivo>) {
    try {
        const isSuperAdmin = cookies().has('superadmin-auth');
        if (!isSuperAdmin) {
            const user = await getAuthenticatedUser();
            if (!user?.redeId) throw new Error("Usuário não está associado a nenhuma rede.");
            processo.redeId = user.redeId;
        } else if (!processo.redeId) {
            throw new Error("Superadmin deve especificar uma rede.");
        }

        const saved = await db.saveProcessoSeletivo(processo);
        revalidatePath('/cadastros/processo-seletivo');
        revalidatePath('/matricula/nova');
        revalidatePath('/cadastros/space-points');
        return { success: true, data: saved };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteProcessoSeletivoAction(id: string) {
    try {
        await db.deleteProcessoSeletivo(id);
        revalidatePath('/cadastros/processo-seletivo');
        revalidatePath('/matricula/nova');
        revalidatePath('/cadastros/space-points');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

// Numero Processo Seletivo
export async function saveNumeroProcessoSeletivoAction(numero: Partial<NumeroProcessoSeletivo>) {
    try {
        if (!numero.redeId) {
            throw new Error("A rede é obrigatória.");
        }
        const saved = await db.saveNumeroProcessoSeletivo(numero);
        revalidatePath('/cadastros/numero-processo-seletivo');
        return { success: true, data: saved };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}


export async function deleteNumeroProcessoSeletivoAction(id: string) {
    try {
        await db.deleteNumeroProcessoSeletivo(id);
        revalidatePath('/cadastros/numero-processo-seletivo');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}


// Metas
export async function saveMetaAction(meta: Partial<Meta>) {
    try {
        const saved = await db.saveMeta(meta);
        revalidatePath('/cadastros/metas-rede-polo');
        return { success: true, data: saved };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteMetaAction(id: string) {
    try {
        await db.deleteMeta(id);
        revalidatePath('/cadastros/metas-rede-polo');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}


// Spacepoints
export async function saveSpacepointsAction(processoSeletivo: string, spacepoints: Omit<Spacepoint, 'id' | 'processoSeletivo'>[]) {
    try {
        await db.saveSpacepoints(processoSeletivo, spacepoints);
        revalidatePath('/cadastros/space-points');
        return { success: true };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

// Tipos de Curso
export async function saveTipoCursoAction(tipo: Partial<TipoCurso>) {
  try {
    const saved = await db.saveTipoCurso(tipo);
    revalidatePath('/cadastros/tipos-de-curso');
    revalidatePath('/matricula/nova');
    return { success: true, data: saved };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteTipoCursoAction(id: string) {
  try {
    await db.deleteTipoCurso(id);
    revalidatePath('/cadastros/tipos-de-curso');
    revalidatePath('/matricula/nova');
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// Usuarios
export async function saveUsuarioAction(usuario: Partial<Usuario>) {
  try {
    if (!usuario.id && !usuario.senha) {
        return { success: false, message: 'Senha é obrigatória para novos usuários.' };
    }
    if (!usuario.funcao) {
        return { success: false, message: 'A função do usuário é obrigatória.' };
    }
    if (!usuario.redeId) {
        return { success: false, message: 'A rede do usuário é obrigatória.' };
    }

    const savedUsuarioWithPassword = await db.saveUsuario(usuario);
    revalidatePath('/usuarios/listar');
    revalidatePath('/superadmin/usuarios');
    const { senha, ...userToReturn } = savedUsuarioWithPassword;
    return { success: true, data: userToReturn };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteUsuarioAction(id: string) {
  try {
    await db.deleteUsuario(id);
    revalidatePath('/usuarios/listar');
    revalidatePath('/superadmin/usuarios');
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// Funções
export async function saveFuncaoAction(funcao: Partial<Funcao>) {
  try {
    const savedFuncao = await db.saveFuncao(funcao);
    revalidatePath('/usuarios/funcoes');
    return { success: true, data: savedFuncao };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteFuncaoAction(id: string) {
  try {
    await db.deleteFuncao(id);
    revalidatePath('/usuarios/funcoes');
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// Redes
export async function saveRedeAction(rede: Partial<Rede>) {
  try {
    const savedRede = await db.saveRede(rede);
    revalidatePath('/superadmin/redes');
    return { success: true, data: savedRede };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteRedeAction(id: string) {
  try {
    await db.deleteRede(id);
    revalidatePath('/superadmin/redes');
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
