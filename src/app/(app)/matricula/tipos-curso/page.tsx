'use client';
import { redirect } from 'next/navigation';

export default function GerenciarTiposCursoPage() {
  redirect('/cadastros/tipos-de-curso');
  return null;
}
