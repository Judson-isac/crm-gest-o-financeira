'use client';
import { redirect } from 'next/navigation';

export default function GerenciarProcessoSeletivoPage() {
  redirect('/cadastros/processo-seletivo');
  return null;
}
