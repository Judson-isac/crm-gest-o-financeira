
'use server';
import { NumeroProcessoSeletivoManager } from '@/components/cadastros/numero-processo-seletivo-manager';
import { getNumerosProcessoSeletivo, getRedes } from '@/lib/api';

export default async function NumeroProcessoSeletivoPage() {
  const numeros = await getNumerosProcessoSeletivo();
  const redes = await getRedes();
  return <NumeroProcessoSeletivoManager initialNumeros={numeros} redes={redes.map(r => ({ id: r.id, nome: r.nome }))} />;
}
