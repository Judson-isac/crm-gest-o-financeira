'use client';
import { redirect } from 'next/navigation';

export default function GerenciarCampanhasPage() {
  redirect('/cadastros/campanhas');
  return null;
}
