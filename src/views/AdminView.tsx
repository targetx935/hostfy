import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Users, Video, Play, Activity, ArrowLeft,
    Shield, Search, TrendingUp, RefreshCw, DollarSign
} from 'lucide-react';

export const AdminView = ({ onBack }: { onBack: () => void }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalVideos: 0,
        totalPlays: 0,
        totalLeads: 0,
        totalBandwidthGB: 0,
        recentSignups: 0,
        totalRevenue: 0
    });
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const handleUpdatePlan = async (userId: string, newPlan: string) => {
        setUpdatingUserId(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ plan: newPlan })
                .eq('id', userId);

            if (error) throw error;

            // Update local state to reflect change
            setUsers(currentUsers => {
                const updatedUsers = currentUsers.map(u => u.id === userId ? { ...u, plan: newPlan } : u);

                // Recalculate revenue based on the updated list
                const newRevenue = updatedUsers.reduce((acc, u) => {
                    const plan = u.plan?.toLowerCase();
                    if (plan === 'basic') return acc + 49.90;
                    if (plan === 'pro') return acc + 129.90;
                    if (plan === 'ultra') return acc + 249.90;
                    return acc;
                }, 0);

                setStats(prev => ({ ...prev, totalRevenue: newRevenue }));
                return updatedUsers;
            });

        } catch (err) {
            console.error('Error updating plan:', err);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            // 2. Fetch global video stats
            const { data: allVideos } = await supabase
                .from('videos')
                .select('id, plays, user_id');

            // 3. Fetch session data for bandwidth estimation
            const { data: allSessions } = await supabase
                .from('video_sessions')
                .select('max_time_watched');

            // 4. Fetch leads
            const { data: allLeads } = await supabase
                .from('video_leads')
                .select('id, user_id');

            if (profiles && allVideos) {
                const totalPlays = allVideos.reduce((acc, v) => acc + (v.plays || 0), 0);

                // Bandwidth estimation: 
                // Assuming average bitrate of 2.5 Mbps (approx 1GB per hour of watch time)
                const totalSeconds = allSessions?.reduce((acc, s) => acc + (s.max_time_watched || 0), 0) || 0;
                const totalBandwidthGB = (totalSeconds / 3600) * 1.1; // 1.1GB per hour factor

                // Revenue calculation based on new plans
                // Basic: R$ 49,90, Pro: R$ 129,90, Ultra: R$ 249,90
                const totalRevenue = profiles.reduce((acc, p) => {
                    const plan = p.plan?.toLowerCase();
                    if (plan === 'basic') return acc + 49.90;
                    if (plan === 'pro') return acc + 129.90;
                    if (plan === 'ultra') return acc + 249.90;
                    return acc;
                }, 0);

                // Map users with their stats
                const usersWithStats = profiles.map(profile => {
                    const userVideos = allVideos.filter(v => v.user_id === profile.id);
                    const userPlays = userVideos.reduce((acc, v) => acc + (v.plays || 0), 0);
                    const userLeads = allLeads?.filter(l => l.user_id === profile.id).length || 0;
                    return {
                        ...profile,
                        videoCount: userVideos.length,
                        playCount: userPlays,
                        leadCount: userLeads
                    };
                });

                setUsers(usersWithStats);
                setStats({
                    totalUsers: profiles.length,
                    totalVideos: allVideos.length,
                    totalPlays: totalPlays,
                    totalLeads: allLeads?.length || 0,
                    totalBandwidthGB: parseFloat(totalBandwidthGB.toFixed(2)),
                    totalRevenue: totalRevenue,
                    recentSignups: profiles.filter(p => {
                        const date = new Date(p.created_at);
                        const now = new Date();
                        return (now.getTime() - date.getTime()) < (7 * 24 * 60 * 60 * 1000);
                    }).length
                });
            }
        } catch (err) {
            console.error("Error fetching admin data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    const filteredUsers = users.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-brand-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
                <div className="flex items-start gap-5">
                    <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-white/5 hover:border-white/10 group mt-1">
                        <ArrowLeft className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                    </button>
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-4xl font-black text-white tracking-tight">
                                Master Admin
                            </h2>
                            <div className="bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-brand-primary/20 whitespace-nowrap">
                                SYSTEM ROOT
                            </div>
                        </div>
                        <p className="text-neutral-500 text-base font-medium italic opacity-80">Visão geral de toda a infraestrutura Hostfy</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 lg:gap-8 bg-black/20 p-4 rounded-3xl border border-white/5">
                    <div className="flex flex-col items-start lg:items-end">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 opacity-60">Status do Sistema</span>
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest leading-none">Todos os sistemas operacionais</span>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-white/5 hidden lg:block"></div>

                    <button
                        onClick={fetchAdminData}
                        disabled={loading}
                        className="bg-brand-primary hover:bg-rose-600 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 cursor-pointer flex items-center gap-3 group/refresh overflow-hidden relative active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/refresh:translate-x-full transition-transform duration-1000"></div>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover/refresh:rotate-180 transition-transform duration-500'}`} />
                        <span className="text-sm uppercase tracking-wide">Sincronizar Dados</span>
                    </button>
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-brand-primary/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20 group-hover:scale-110 transition-transform duration-500">
                            <Users className="w-6 h-6 text-brand-primary" />
                        </div>
                        {stats.recentSignups > 0 && (
                            <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[9px] font-black uppercase tracking-tighter">
                                +{stats.recentSignups} esta semana
                            </div>
                        )}
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Usuários</p>
                    <h3 className="text-3xl font-black text-white leading-none">{stats.totalUsers}</h3>
                </div>

                <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Video className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Vídeos Ativos</p>
                    <h3 className="text-3xl font-black text-white leading-none">{stats.totalVideos}</h3>
                </div>

                <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Play className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Plays</p>
                    <h3 className="text-3xl font-black text-white leading-none">{stats.totalPlays.toLocaleString()}</h3>
                </div>

                <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-neutral-400 text-[9px] font-black uppercase tracking-tighter">
                            Infraestrutura
                        </div>
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Tráfego (Bandwidth)</p>
                    <h3 className="text-3xl font-black text-white leading-none">{stats.totalBandwidthGB} GB</h3>
                </div>

                <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Leads</p>
                    <h3 className="text-3xl font-black text-white leading-none">{stats.totalLeads.toLocaleString()}</h3>
                </div>
            </div>

            {/* User List Section */}
            <div className="bg-brand-dark-lighter/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Shield className="w-6 h-6 text-brand-primary" />
                        <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-wider">Gestão de Usuários</h3>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary transition-all placeholder:text-neutral-600 font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Informações do Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status / Plano</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Vídeos</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Plays</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Leads</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Cadastro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-xl bg-neutral-800 object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 text-brand-primary font-black uppercase text-xs">
                                                    {(user.full_name || 'U').charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm tracking-tight">{user.full_name || 'Usuário Sem Nome'}</span>
                                                <span className="text-neutral-500 text-[10px] font-medium uppercase tracking-widest">{user.company || 'Pessoa Física'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1.5 align-start">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={user.plan?.toLowerCase() || 'free'}
                                                    onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                                                    disabled={updatingUserId === user.id}
                                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-transparent cursor-pointer outline-none transition-all ${user.plan === 'pro' || user.plan === 'ultra' || user.plan === 'basic'
                                                        ? 'border-brand-primary/40 text-brand-primary hover:border-brand-primary shadow-[0_0_10px_rgba(232,42,88,0.1)]'
                                                        : 'border-white/10 text-neutral-500 hover:border-white/30'
                                                        } ${updatingUserId === user.id ? 'opacity-50 animate-pulse' : ''}`}
                                                >
                                                    <option value="free" className="bg-brand-dark text-neutral-400">Free (R$ 0)</option>
                                                    <option value="basic" className="bg-brand-dark text-brand-primary">Basic (R$ 49.90)</option>
                                                    <option value="pro" className="bg-brand-dark text-brand-primary">PRO (R$ 129.90)</option>
                                                    <option value="ultra" className="bg-brand-dark text-brand-primary">Ultra (R$ 249.90)</option>
                                                </select>

                                                {user.is_admin && (
                                                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col items-center">
                                            <span className="text-white font-black text-base">{user.videoCount}</span>
                                            <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Arquivos</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-white font-black text-base italic">{user.playCount.toLocaleString()}</span>
                                            <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                                                <TrendingUp className="w-2.5 h-2.5" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-emerald-400 font-black text-base italic">{user.leadCount?.toLocaleString() || 0}</span>
                                            <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Capturados</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-neutral-300 text-xs font-bold">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-neutral-500 font-medium tracking-wide italic">Nenhum usuário encontrado na base de dados.</p>
                    </div>
                )}

                <div className="p-6 bg-brand-primary/5 border-t border-white/5 text-center flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-start">
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1 text-left">Faturamento Total Estimado</p>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                <span className="text-2xl font-black text-white">R$ {stats.totalRevenue.toLocaleString('pt-BR')} <span className="text-sm font-medium text-neutral-500">/mês</span></span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest max-w-sm text-right">Hostfy Enterprise • Segurança HLS AES-128 e Whitelist de Domínios Ativos Globalmente</p>
                </div>
            </div>
        </div>
    );
};
