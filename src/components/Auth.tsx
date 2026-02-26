import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react';

export function Auth({ onLogin }: { onLogin: () => void }) {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                onLogin();
            } else {
                // Generate simple browser fingerprint
                const fingerprint = btoa(JSON.stringify({
                    ua: navigator.userAgent,
                    sw: screen.width,
                    sh: screen.height,
                    plat: navigator.platform,
                    lang: navigator.language
                })).slice(0, 100);

                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            browser_fingerprint: fingerprint,
                        },
                    },
                });

                if (signUpError) throw signUpError;

                // Supabase behavior: if require email confirmation is on, session is null
                if (data.session) {
                    onLogin();
                } else {
                    setMessage('Conta criada! Verifique seu e-mail para confirmar (você pode precisar olhar na pasta de SPAM).');
                }
            }
        } catch (err: any) {
            if (err.message === 'Invalid login credentials') {
                setError('E-mail ou senha incorretos.');
            } else if (err.message === 'User already registered') {
                setError('Este e-mail já está cadastrado.');
            } else {
                setError(err.message || 'Ocorreu um erro inesperado.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary opacity-10 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md bg-brand-dark-lighter/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 animate-[fadeIn_0.5s_ease-out]">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-brand-dark border border-brand-primary/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(232,42,88,0.2)] mb-4 overflow-hidden">
                        <img src="/logo.png" alt="Hostfy Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Bem-vindo ao <span className="text-brand-primary">Hostfy</span>
                    </h1>
                    <p className="text-neutral-400 text-sm mt-2 text-center">
                        {isLogin ? 'Faça login para gerenciar vídeos de alta conversão' : 'Crie sua conta e escale suas vendas com vídeos mais rápidos'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-lg mb-6 flex items-start gap-3">
                        <span className="font-medium shrink-0">Erro:</span>
                        <p>{error}</p>
                    </div>
                )}

                {message && (
                    <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-sm p-4 rounded-lg mb-6 text-center">
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">

                    {!isLogin && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-neutral-300">Nome Completo</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-brand-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-brand-dark/50 border border-white/10 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 rounded-lg pl-11 pr-4 py-3 text-white placeholder-neutral-500 transition-all outline-none"
                                    placeholder="Como devemos chamar você?"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-300">E-mail Corporativo</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-brand-primary transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-brand-dark/50 border border-white/10 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 rounded-lg pl-11 pr-4 py-3 text-white placeholder-neutral-500 transition-all outline-none"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-neutral-300">Senha</label>
                            {isLogin && <a href="#" className="text-xs text-brand-primary hover:text-brand-primary-light transition-colors">Esqueceu a senha?</a>}
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-brand-primary transition-colors" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-brand-dark/50 border border-white/10 focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 rounded-lg pl-11 pr-4 py-3 text-white placeholder-neutral-500 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        {!isLogin && <p className="text-xs text-neutral-500">A senha deve ter pelo menos 6 caracteres.</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_15px_rgba(232,42,88,0.3)] hover:shadow-[0_0_25px_rgba(232,42,88,0.5)] mt-6 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Entrar no Dashboard' : 'Criar minha conta agora'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-neutral-400">
                    {isLogin ? 'Ainda não tem uma conta?' : 'Já possui uma conta Hostfy?'}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                            setMessage(null);
                        }}
                        className="ml-2 text-brand-primary hover:text-brand-primary-light font-medium transition-colors border-b border-transparent hover:border-brand-primary cursor-pointer pb-0.5"
                    >
                        {isLogin ? 'Crie uma agora' : 'Faça login aqui'}
                    </button>
                </div>
            </div>

            {/* Logos Falsas/Provas Sociais */}
            <div className="mt-12 text-center z-10 hidden sm:block">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-6">A infraestrutura secreta dos maiores players</p>
                <div className="flex items-center justify-center gap-8 opacity-40 grayscale">
                    <div className="h-6 w-24 bg-neutral-600 rounded drop-shadow-md"></div>
                    <div className="h-6 w-24 bg-neutral-600 rounded drop-shadow-md"></div>
                    <div className="h-6 w-24 bg-neutral-600 rounded drop-shadow-md"></div>
                    <div className="h-6 w-24 bg-neutral-600 rounded drop-shadow-md"></div>
                </div>
            </div>
        </div>
    );
}
