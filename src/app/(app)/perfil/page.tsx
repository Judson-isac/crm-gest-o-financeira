'use client';

import { useState, useRef, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Save, User as UserIcon } from 'lucide-react';
import { updateProfileAction } from '@/app/auth-actions';
import type { Usuario } from '@/lib/types';
import { useEffect } from 'react';
import { getAuthenticatedUser } from '@/lib/api';

export default function ProfilePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<Omit<Usuario, 'senha'> | null>(null);
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadUser() {
            const authUser = await getAuthenticatedUser();
            if (authUser) {
                setUser(authUser);
                setNome(authUser.nome);
                setEmail(authUser.email);
                setAvatarUrl(authUser.avatarUrl || '');
            }
        }
        loadUser();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({
                    variant: 'destructive',
                    title: 'Arquivo muito grande',
                    description: 'A imagem deve ter no máximo 2MB.'
                });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateProfileAction({
                nome,
                email,
                avatarUrl
            });

            if (result.success) {
                toast({
                    title: 'Sucesso!',
                    description: result.message
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro!',
                    description: result.message
                });
            }
        });
    };

    if (!user) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const initials = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Meu Perfil</CardTitle>
                    <CardDescription>Gerencie suas informações pessoais e foto de perfil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-32 w-32 border-4 border-primary/10 transition-all group-hover:border-primary/30">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-3xl bg-primary/5 text-primary">
                                    {initials || <UserIcon className="h-12 w-12" />}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Alterar foto"
                            >
                                <Camera className="h-5 w-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground italic">Recomendado: Quadrada, máx 2MB</p>
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome Completo</Label>
                            <Input
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Seu nome"
                                className="bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="bg-background/50"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-6 rounded-b-lg">
                    <Button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-8"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-none shadow-md bg-card/40 backdrop-blur-sm border-l-4 border-l-primary/50">
                <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary" />
                        Informações do Sistema
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground block">Função:</span>
                        <span className="font-medium text-primary">{user.funcao}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Status:</span>
                        <span className="font-medium text-green-500">{user.status}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
