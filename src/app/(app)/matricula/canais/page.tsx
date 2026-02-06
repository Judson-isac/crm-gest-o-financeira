'use client';
import { redirect } from 'next/navigation';

export default function GerenciarCanaisPage() {
  redirect('/cadastros/canais');
  return null;
}
