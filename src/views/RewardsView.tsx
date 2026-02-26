import { useState, useEffect } from 'react';
import { Trophy, Star, Shield, Target, Zap, ChevronLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function RewardsView() {
    const navigate = useNavigate();
    const [totalPlays, setTotalPlays] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchTotalPlays = async () => {
            setLoading(true);
            try {
                // Fetch all videos for the user to sum up total plays
                const { data, error } = await supabase
                    .from('videos')
                    .select('plays');

                if (error) throw error;

                if (data) {
                    const sum = data.reduce((acc, video) => acc + (video.plays || 0), 0);
                    setTotalPlays(sum);
                }
            } catch (error) {
                console.error("Error fetching total plays for rewards:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTotalPlays();
    }, []);

    const achievements = [
        {
            id: 1,
            title: 'Primeiro Play',
            description: 'Você enviou seu primeiro vídeo com sucesso.',
            icon: <Play className="w-6 h-6 text-emerald-400" />,
            color: 'from-emerald-600/20 to-emerald-900/20',
            border: 'border-emerald-500/30',
            unlockedAt: '2024-03-20',
            locked: totalPlays < 1,
        },
        {
            id: 2,
            title: 'Mil Visualizações',
            description: 'Acumulou 1.000 reproduções orgânicas.',
            icon: <Star className="w-6 h-6 text-brand-primary" />,
            color: 'from-brand-primary/20 to-brand-dark/20',
            border: 'border-brand-primary/30',
            unlockedAt: '2024-04-12', // Mocked date for now
            locked: totalPlays < 1000,
        },
        {
            id: 3,
            title: 'Engajamento Vital',
            description: 'Retenção média superior a 60% em um vídeo de 10 min.',
            icon: <Target className="w-6 h-6 text-blue-400" />,
            color: 'from-blue-600/20 to-blue-900/20',
            border: 'border-blue-500/30',
            unlockedAt: null,
            locked: true, // Needs deeper analytics check, mock locked for now
        },
        {
            id: 4,
            title: 'Dez mil Plays',
            description: 'Acumulou 10.000 reproduções.',
            icon: <Zap className="w-6 h-6 text-amber-400" />,
            color: 'from-amber-600/20 to-amber-900/20',
            border: 'border-amber-500/30',
            unlockedAt: null,
            locked: totalPlays < 10000,
        },
    ];

    // Helper functions for plaque progress
    const getPlaqueProgress = (goal: number) => {
        const percent = Math.min(100, (totalPlays / goal) * 100);
        return {
            percent: percent,
            isUnlocked: totalPlays >= goal,
            formattedPercent: percent.toFixed(1)
        };
    };

    const silver = getPlaqueProgress(100000);
    const gold = getPlaqueProgress(500000);
    const ruby = getPlaqueProgress(1000000);

    return (
        <div className="h-full bg-brand-dark flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="h-20 border-b border-white/5 bg-brand-dark/50 backdrop-blur-xl px-8 flex items-center justify-between shrink-0 top-0 z-10 sticky">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-brand-primary" />
                            Premiações <span className="text-neutral-500 text-sm font-normal ml-2">Suas Conquistas</span>
                        </h1>
                    </div>
                </div>

                {/* Visual Total Plays */}
                {!loading && (
                    <div className="hidden md:flex items-center gap-2 bg-brand-dark-lighter px-4 py-2 rounded-xl border border-white/10">
                        <span className="text-sm text-neutral-400">Total Acumulado:</span>
                        <span className="font-bold text-white tracking-wide">{totalPlays.toLocaleString('pt-BR')} Plays</span>
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-5xl mx-auto">

                    {/* Tiers Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
                        {/* 100k Views Plaque - Prata */}
                        <div className={`bg-gradient-to-b from-neutral-800 to-brand-dark border border-neutral-700 rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 shadow-xl ${!silver.isUnlocked ? 'opacity-80 grayscale-[0.5]' : ''}`}>
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-neutral-400 to-transparent opacity-50"></div>
                            <div className="w-24 h-24 bg-gradient-to-br from-neutral-300 to-neutral-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-6 border-4 border-brand-dark relative">
                                <span className="text-brand-dark font-black text-2xl tracking-tighter">100K</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide text-neutral-200">Placa de Prata</h3>
                            <p className="text-neutral-400 text-sm mb-6">Para criadores que alcançaram a marca de 100 mil visualizações em seus vídeos.</p>

                            <div className="mt-auto w-full">
                                <div className="flex justify-between text-xs mb-2 font-medium">
                                    {silver.isUnlocked ? (
                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Desbloqueado</span>
                                    ) : (
                                        <span className="text-neutral-400">Progresso</span>
                                    )}
                                    <span className="text-white">{silver.formattedPercent}%</span>
                                </div>
                                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                    <div className="bg-gradient-to-r from-neutral-500 to-neutral-300 h-full rounded-full transition-all duration-1000" style={{ width: `${silver.percent}%` }}></div>
                                </div>
                                <p className="text-xs text-neutral-500 mt-3 font-mono">{totalPlays.toLocaleString('pt-BR')} / 100.000</p>
                            </div>
                        </div>

                        {/* 500k Views Plaque - Ouro */}
                        <div className={`bg-gradient-to-b from-amber-900/40 to-brand-dark border border-amber-500/30 rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 shadow-[0_10px_40px_rgba(251,191,36,0.1)] ${!gold.isUnlocked ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}>
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50"></div>
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)] mb-6 border-4 border-brand-dark relative z-10">
                                <span className="text-brand-dark font-black text-2xl tracking-tighter">500K</span>
                                {gold.isUnlocked && <div className="absolute inset-0 bg-white/20 blur-md rounded-full pointer-events-none"></div>}
                            </div>
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-2 uppercase tracking-wide">Placa de Ouro</h3>
                            <p className="text-amber-500/60 text-sm mb-6">Para os gigantes da criação que ultrapassaram meio milhão de reproduções.</p>

                            <div className="mt-auto w-full transition-all">
                                <div className="flex justify-between text-xs mb-2 font-medium">
                                    {gold.isUnlocked ? (
                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Desbloqueado</span>
                                    ) : (
                                        <span className="text-amber-500/60 flex items-center gap-1"><Lock className="w-3 h-3 inline" /> Bloqueado</span>
                                    )}
                                    <span className="text-white">{gold.formattedPercent}%</span>
                                </div>
                                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-amber-500/10">
                                    <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-1000" style={{ width: `${gold.percent}%` }}></div>
                                </div>
                                <p className="text-xs text-amber-500/40 mt-3 font-mono">{totalPlays.toLocaleString('pt-BR')} / 500.000</p>
                            </div>
                        </div>

                        {/* 1M Views Plaque - Diamante / Rubi */}
                        <div className={`bg-gradient-to-b from-brand-primary/40 to-brand-dark border border-brand-primary/30 rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 shadow-[0_10px_40px_rgba(232,42,88,0.15)] overflow-hidden ${!ruby.isUnlocked ? 'opacity-40 grayscale hover:grayscale-[0.5]' : ''}`}>
                            <Trophy className="absolute -bottom-10 -right-10 w-48 h-48 text-brand-primary/5 rotate-12 pointer-events-none" />
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-70"></div>

                            <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-brand-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(232,42,88,0.4)] mb-6 border-4 border-brand-dark relative z-10">
                                <span className="text-white font-black text-3xl tracking-tighter">1M</span>
                                {ruby.isUnlocked && <div className="absolute inset-0 border-2 border-white/40 rounded-full scale-110 pointer-events-none"></div>}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-primary-light">Placa Rubi</h3>
                            <p className="text-brand-primary/60 text-sm mb-6">O ápice. Para lendas que bateram 1 milhão de reproduções no Hostfy.</p>

                            <div className="mt-auto w-full transition-all z-10">
                                <div className="flex justify-between text-xs text-brand-primary/60 mb-2 font-medium">
                                    {ruby.isUnlocked ? (
                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Desbloqueado</span>
                                    ) : (
                                        <span className="flex items-center gap-1"><Lock className="w-3 h-3 inline" /> Bloqueado</span>
                                    )}
                                    <span className="text-white">{ruby.formattedPercent}%</span>
                                </div>
                                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-brand-primary/10">
                                    <div className="bg-gradient-to-r from-brand-primary to-rose-400 h-full rounded-full transition-all duration-1000" style={{ width: `${ruby.percent}%` }}></div>
                                </div>
                                <p className="text-xs text-brand-primary/40 mt-3 font-mono">{totalPlays.toLocaleString('pt-BR')} / 1.000.000</p>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-6">Conquistas Desbloqueáveis</h3>

                    {/* Achievements Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
                        {achievements.map((achievement) => (
                            <div
                                key={achievement.id}
                                className={`flex gap-5 p-6 rounded-2xl border transition-all duration-300 bg-gradient-to-br ${achievement.color} ${achievement.border} ${achievement.locked ? 'opacity-60 grayscale hover:grayscale-0' : 'hover:-translate-y-1 shadow-lg'}`}
                            >
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-black/40 border border-white/10 relative overflow-hidden`}>
                                    {achievement.locked ? <Lock className="w-6 h-6 text-neutral-500" /> : achievement.icon}
                                    {!achievement.locked && <div className="absolute inset-0 bg-white/5 blur-xl"></div>}
                                </div>

                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                        {achievement.title}
                                        {achievement.locked && <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-black/50 px-2 py-0.5 rounded-md border border-white/10">Bloqueado</span>}
                                    </h4>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-3">
                                        {achievement.description}
                                    </p>

                                    {!achievement.locked && achievement.unlockedAt && (
                                        <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" />
                                            Desbloqueado
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}

// Mock Play icon just for this file if not imported from global
function Play(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
}
