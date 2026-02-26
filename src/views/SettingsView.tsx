import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Loader2, Camera, User, CreditCard, Activity, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPlanSettings } from '../lib/planLimits';

export const SettingsView = ({ showToast }: { showToast?: (msg: string) => void }) => {
    const location = useLocation();
    const initialTab = location.state?.tab === 'conta' ? 'conta' : 'financeiro';
    const [activeTab, setActiveTab] = useState<'financeiro' | 'conta'>(initialTab);

    const [usage, setUsage] = useState({
        plays: 0,
        videos: 0
    });
    const [profileData, setProfileData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        company: '',
        avatar_url: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Profile
            const { data: prof, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profError && profError.code !== 'PGRST116') throw profError;

            setProfileData(prof);
            setProfile({
                full_name: prof?.full_name || user.user_metadata?.full_name || '',
                email: user.email || '',
                company: prof?.company || '',
                avatar_url: prof?.avatar_url || ''
            });

            // Fetch Usage (Plays and Videos)
            const { data: vids } = await supabase
                .from('videos')
                .select('plays')
                .eq('user_id', user.id);

            if (vids) {
                const totalPlays = vids.reduce((acc, v) => acc + (v.plays || 0), 0);
                setUsage({
                    plays: totalPlays,
                    videos: vids.length
                });
            }

        } catch (err: any) {
            console.error('Error fetching settings data:', err);
        } finally {
        }
    };

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    company: profile.company
                });

            if (error) throw error;
            if (showToast) showToast('Perfil atualizado com sucesso!');
            fetchData(); // Refresh to get latest profileData
        } catch (err: any) {
            console.error('Error updating profile:', err);
            if (showToast) showToast(`Erro ao salvar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Pruning: delete old avatars for this user
            const { data: oldFiles } = await supabase.storage.from('avatars').list();
            if (oldFiles) {
                const userFiles = oldFiles.filter(f => f.name.startsWith(`${user.id}-`));
                if (userFiles.length > 0) {
                    await supabase.storage.from('avatars').remove(userFiles.map(f => f.name));
                }
            }

            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    avatar_url: publicUrl,
                    full_name: profile.full_name // Keep current name
                });

            if (updateError) throw updateError;

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
            if (showToast) showToast('Foto de perfil atualizada!');
            fetchData();
        } catch (err: any) {
            console.error('Error uploading avatar:', err);
            if (showToast) showToast(`Erro no upload: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Derived Data for Financeiro Tab
    const planSettings = getPlanSettings(profileData?.plan || 'trial');
    const bandwidthLimit = planSettings.maxStreamingHours || 10;
    const bandwidthUsed = profileData?.current_bandwidth_gb || 0;

    // Feature list mapping (more human readable)
    const activeFeatures = [
        ...(planSettings.maxVideos === Infinity ? ['Vídeos Ilimitados'] : [`Até ${planSettings.maxVideos} Vídeos`]),
        ...(planSettings.features.advancedAnalytics ? ['Analytics Avançado'] : ['Analytics Básico']),
        ...(planSettings.features.leadCapture ? ['Captação de Leads'] : []),
        ...(planSettings.features.socialProof ? ['Prova Social'] : []),
        ...(planSettings.features.domainWhitelist ? ['Domínios Permitidos'] : []),
        ...(planSettings.features.watermark ? ['Watermarking DRM'] : []),
        'Player Customizável',
        'Suporte Prioritário'
    ].slice(0, 4); // Limit to 4 for card aesthetics

    const currentPlan = {
        name: planSettings.name || 'Plano PRO',
        price: profileData?.plan === 'basic' ? 'R$ 49,90' : profileData?.plan === 'ultra' ? 'R$ 297,00' : 'R$ 129,90',
        nextBilling: '28 de março de 2026', // Ideally fetched from Kiwify
        playsUsed: usage.plays,
        playsTotal: planSettings.maxStreamingHours * 10, // Rough estimate if we don't have play limits
        features: activeFeatures
    };


    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full max-w-6xl mx-auto px-2">

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-6 border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('financeiro')}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'financeiro' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-400 hover:text-white'}`}
                >
                    <DollarSign className="w-4 h-4" />
                    Financeiro
                </button>
                <button
                    onClick={() => setActiveTab('conta')}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'conta' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-400 hover:text-white'}`}
                >
                    <User className="w-4 h-4" />
                    Conta
                </button>
            </div>

            {/* FINANCEIRO TAB CONTENT */}
            {activeTab === 'financeiro' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

                    {/* Primary Plan Card */}
                    <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-8 justify-between">
                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                        <div className="flex-1 z-10">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-neutral-400 text-sm font-medium uppercase tracking-wider">Plano Atual</span>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2">{currentPlan.name}</h2>
                            <p className="text-xl text-neutral-300 mb-1">{currentPlan.price} <span className="text-sm text-neutral-500 font-normal">/ mês</span></p>
                            <p className="text-sm text-neutral-500 mb-8">Próxima fatura em {currentPlan.nextBilling}, no valor de {currentPlan.price}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <h4 className="text-sm font-bold text-neutral-300 border-b border-white/10 pb-2 mb-4">Benefícios do Plano</h4>
                                    <ul className="space-y-3">
                                        {currentPlan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-neutral-400">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                </div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-neutral-300 border-b border-white/10 pb-2 mb-4">Uso do Plano (Mensal)</h4>
                                        <div className="space-y-4">
                                            {/* Plays Progress */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm text-neutral-400 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-primary" /> Visualizações</span>
                                                    <span className="text-sm font-bold text-white">{currentPlan.playsUsed.toLocaleString('pt-BR')} <span className="text-neutral-500 font-normal">/ {currentPlan.playsTotal.toLocaleString('pt-BR')}</span></span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden mb-1">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-brand-primary to-rose-400 rounded-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (currentPlan.playsUsed / currentPlan.playsTotal) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Bandwidth Progress */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm text-neutral-400 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-primary" /> Banda (Streaming)</span>
                                                    <span className="text-sm font-bold text-white">{bandwidthUsed.toFixed(1)} GB <span className="text-neutral-500 font-normal">/ {bandwidthLimit} GB</span></span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden mb-1">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${bandwidthUsed / bandwidthLimit > 0.9 ? 'bg-red-500' : 'bg-brand-primary'}`}
                                                        style={{ width: `${Math.min(100, (bandwidthUsed / bandwidthLimit) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-500 text-right mt-2">O limite reinicia mensalmente</p>
                                    </div>
                                    <div className="pt-2">
                                        <button onClick={() => setActiveTab('financeiro')} className="text-brand-primary text-sm font-bold hover:underline transition-all">Ver detalhes completos do uso</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-start gap-4 z-10 border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
                            <button
                                onClick={() => window.open('https://hostfy.pro', '_blank')}
                                className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(232,42,88,0.2)] hover:shadow-[0_0_30px_rgba(232,42,88,0.4)] whitespace-nowrap w-full md:w-auto"
                            >
                                {profileData?.plan === 'trial' ? 'Assinar Hostfy' : 'Alterar meu plano'}
                            </button>
                            <button
                                onClick={() => window.open('https://customer.kiwify.com.br', '_blank')}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-8 rounded-xl transition-colors whitespace-nowrap w-full md:w-auto"
                            >
                                Detalhes do pagamento
                            </button>
                        </div>
                    </div>

                    {/* Secondary Cards Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Kiwify Payment Info Card */}
                        <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <CreditCard className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-lg font-bold text-white">Gestão de Cobrança</h3>
                            </div>

                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-neutral-400 leading-relaxed">
                                    Seus pagamentos são processados com total segurança pela **Kiwify**.
                                    Para alterar o cartão de crédito, baixar notas fiscais ou cancelar sua assinatura, acesse o portal do cliente.
                                </p>

                                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                                    <div className="flex items-center gap-3 text-brand-primary mb-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Atenção</span>
                                    </div>
                                    <p className="text-xs text-neutral-300">
                                        As atualizações de plano levam aproximadamente 2 minutos para serem refletidas no dashboard após a confirmação do pagamento.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open('https://customer.kiwify.com.br', '_blank')}
                                className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                            >
                                Acessar Minha Conta Kiwify
                            </button>
                        </div>

                        {/* FAQ or Tips Card */}
                        <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <Activity className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-lg font-bold text-white">Dicas de Consumo</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <h4 className="text-sm font-bold text-white mb-1">Como economizar banda?</h4>
                                    <p className="text-xs text-neutral-400">Utilize nosso player inteligente que ajusta a qualidade automaticamente de acordo com a conexão do espectador.</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <h4 className="text-sm font-bold text-white mb-1">Limite de vídeos</h4>
                                    <p className="text-xs text-neutral-400">Você está usando **{usage.videos}** vídeos do seu limite de **{planSettings.maxVideos === Infinity ? 'Ilimitados' : planSettings.maxVideos}**. </p>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 text-center">
                                <button className="text-brand-primary text-xs font-bold hover:underline" onClick={() => window.open('https://hostfy.pro', '_blank')}>Deseja aumentar seu limite? Fale conosco.</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* CONTA TAB CONTENT */}
            {activeTab === 'conta' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-8 max-w-3xl">
                        <h3 className="text-xl font-bold text-white mb-8 pb-4 border-b border-white/5">
                            Dados do Perfil
                        </h3>

                        <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                            <div className="flex flex-col items-center gap-4 shrink-0">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-24 h-24 rounded-full border-2 border-brand-primary/50 group-hover:border-brand-primary transition-colors bg-brand-dark flex items-center justify-center overflow-hidden shadow-xl">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center">
                                                <User className="w-10 h-10 text-brand-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                                    </div>
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                    />
                                </div>
                                <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Foto do Perfil</span>
                            </div>

                            <div className="flex-1 w-full space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-neutral-300 mb-2">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50"
                                            placeholder="Seu nome"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-neutral-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-neutral-500 cursor-not-allowed"
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-neutral-300 mb-2">Nome da Empresa</label>
                                    <input
                                        type="text"
                                        value={profile.company}
                                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50"
                                        placeholder="Minha Empresa Inc."
                                    />
                                </div>
                                <div className="pt-4 flex justify-end border-t border-white/5">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={saving}
                                        className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 disabled:opacity-50 min-w-[180px] flex items-center justify-center"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
