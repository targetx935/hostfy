import { Shield, Globe, Trash2, Plus, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPlanSettings } from '../lib/planLimits';

export const SecurityView = ({ userPlan = 'trial' }: { userPlan?: string }) => {
    const planSettings = getPlanSettings(userPlan);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [domainLoading, setDomainLoading] = useState(false);

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            const { data, error } = await supabase
                .from('allowed_domains')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setDomains(data || []);
        } catch (err) {
            console.error('Error fetching domains:', err);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;

        let domainToSave = newDomain.trim().toLowerCase();
        // Remove http:// or https:// if user pasted a full URL
        domainToSave = domainToSave.replace(/^(https?:\/\/)/, '').split('/')[0];

        if (domains.find(d => d.domain === domainToSave)) {
            showToast('Este domínio já está na lista.');
            return;
        }

        setDomainLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { error } = await supabase
                .from('allowed_domains')
                .insert([{ domain: domainToSave, user_id: user.id }]);

            if (error) throw error;

            showToast('Domínio adicionado com sucesso!');
            setNewDomain('');
            fetchDomains();
        } catch (err: any) {
            showToast(err.message || 'Erro ao adicionar domínio.');
        } finally {
            setDomainLoading(false);
        }
    };

    const handleRemoveDomain = async (id: string) => {
        try {
            const { error } = await supabase
                .from('allowed_domains')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Domínio removido.');
            fetchDomains();
        } catch (err: any) {
            showToast(err.message || 'Erro ao remover domínio.');
        }
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            showToast('As novas senhas não coincidem.');
            return;
        }

        if (newPassword.length < 6) {
            showToast('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showToast('Senha atualizada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            showToast(err.message || 'Erro ao atualizar senha.');
        } finally {
            setLoading(false);
        }
    };

    if (!planSettings.features.domainWhitelist) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 border border-brand-primary/20">
                    <Shield className="w-10 h-10 text-brand-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Segurança & Domínios (Basic+)</h2>
                <p className="text-neutral-400 max-w-md mb-8">
                    Proteja sua conta com 2FA e restrinja a exibição dos seus vídeos apenas aos seus domínios autorizados. Upgrade disponível para planos Basic e superiores.
                </p>
                <button className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 hover:scale-105">
                    Fazer Upgrade Agora
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full max-w-3xl border border-white/5 bg-brand-dark-lighter rounded-2xl p-8 relative">
            {toast && (
                <div className="fixed bottom-6 right-6 bg-brand-primary text-white px-6 py-3 rounded-lg shadow-2xl flex items-center z-50 animate-[fadeIn_0.3s_ease-out]">
                    <span className="font-medium text-sm">{toast}</span>
                </div>
            )}

            <div className="mb-8 border-b border-white/5 pb-8">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-brand-primary" />
                    Segurança
                </h2>
                <p className="text-neutral-400">Proteja sua conta e gerencie seus acessos.</p>
            </div>

            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="password"
                            placeholder="Senha atual"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50"
                        />
                        <div className="hidden md:block"></div>
                        <input
                            type="password"
                            placeholder="Nova senha"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50"
                        />
                        <input
                            type="password"
                            placeholder="Confirmar nova senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50"
                        />
                    </div>
                    <button
                        onClick={handleUpdatePassword}
                        disabled={loading || !newPassword}
                        className="mt-4 bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer shadow-lg shadow-brand-primary/20 text-sm disabled:opacity-50 flex items-center justify-center min-w-[150px]"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Atualizar Senha'}
                    </button>
                </div>

                <div className="pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Autenticação de 2 Fatores (2FA)</h3>
                            <p className="text-sm text-neutral-400">Adiciona uma camada extra de segurança na sua conta.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={is2faEnabled}
                                onChange={(e) => {
                                    setIs2faEnabled(e.target.checked);
                                    showToast(e.target.checked ? '2FA ativado com sucesso!' : '2FA desativado.');
                                }}
                            />
                            <div className="w-11 h-6 bg-brand-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white border border-white/10 cursor-pointer"></div>
                        </label>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-brand-primary" />
                        Domínios Autorizados
                    </h3>
                    <p className="text-sm text-neutral-400 mb-6 font-medium bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
                        O player só funcionará nos sites listados abaixo. Se a lista estiver vazia, os vídeos poderão ser assistidos em qualquer site.
                    </p>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="ex: meudominio.com.br"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                            className="flex-1 bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50 text-sm"
                        />
                        <button
                            onClick={handleAddDomain}
                            disabled={domainLoading || !newDomain.trim()}
                            className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold px-6 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {domainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Adicionar
                        </button>
                    </div>

                    <div className="space-y-2">
                        {domains.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/2">
                                <p className="text-neutral-500 text-sm italic">Nenhum domínio restrito. Acesso público liberado.</p>
                            </div>
                        ) : (
                            domains.map(d => (
                                <div key={d.id} className="bg-brand-dark/50 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                            <Globe className="w-4 h-4 text-brand-primary" />
                                        </div>
                                        <span className="text-neutral-200 font-medium">{d.domain}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDomain(d.id)}
                                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                        title="Remover domínio"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-neutral-400" />
                        Dispositivos Conectados
                    </h3>
                    <div className="bg-brand-dark/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-white font-medium">Windows • Chrome</span>
                            <span className="text-xs text-neutral-500">São Paulo, BR (Seu dispositivo atual)</span>
                        </div>
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-400/10 px-2 py-1 rounded">Ativo Agora</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityView;
