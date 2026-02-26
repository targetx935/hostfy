import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Play, ChevronUp, Users, Clock, MousePointerClick, Link2 } from 'lucide-react';
import { getPlanSettings } from '../lib/planLimits';

export const AnalyticsView = ({ video, onBack, onSync, userPlan = 'trial' }: { video: any, onBack: () => void, onSync?: () => void, userPlan?: string }) => {
    const planSettings = getPlanSettings(userPlan);
    const [stats, setStats] = useState({
        plays: 0,
        unique: 0,
        retention: 0,
        cta: 0,
        conversion: 0,
        leads: 0,
        recentLeads: [] as any[],
        devices: { mobile: 0, desktop: 0, tablet: 0 },
        traffic: { embed: 0, link: 0, seo: 0 },
        heatmapBars: [] as number[],
        duration: 0
    });
    const [loading, setLoading] = useState(true);

    // Heatmap Interaction State
    const [hoverData, setHoverData] = useState<{ x: number, percent: number, time: string } | null>(null);
    const chartRef = React.useRef<HTMLDivElement>(null);

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!stats.heatmapBars.length || !chartRef.current) return;

        const rect = chartRef.current.getBoundingClientRect();
        const xPos = e.clientX - rect.left;
        const width = rect.width || 1;

        let percentX = Math.max(0, Math.min(1, xPos / width));

        // Find nearest data point index
        let index = Math.round(percentX * (stats.heatmapBars.length - 1));
        index = Math.max(0, Math.min(index, stats.heatmapBars.length - 1));

        const durationPerBar = stats.duration / Math.max(1, stats.heatmapBars.length);
        const timeSeconds = index * durationPerBar;

        setHoverData({
            x: (index / (stats.heatmapBars.length - 1)) * 100, // snap to data point
            percent: stats.heatmapBars[index] || 0,
            time: formatTime(timeSeconds)
        });
    };

    const handleMouseLeave = () => setHoverData(null);

    const generateAreaPath = () => {
        if (!stats.heatmapBars || stats.heatmapBars.length < 2) return "";
        let path = `M 0,100 `;
        stats.heatmapBars.forEach((pt, i) => {
            const x = (i / (stats.heatmapBars.length - 1)) * 100;
            const y = 100 - (pt || 0);
            path += `L ${x},${y} `;
        });
        path += `L 100,100 Z`;
        return path;
    };

    const generateLinePath = () => {
        if (!stats.heatmapBars || stats.heatmapBars.length < 2) return "";
        let path = `M 0,${100 - (stats.heatmapBars[0] || 0)} `;
        stats.heatmapBars.forEach((pt, i) => {
            if (i > 0) {
                const x = (i / (stats.heatmapBars.length - 1)) * 100;
                const y = 100 - (pt || 0);
                path += `L ${x},${y} `;
            }
        });
        return path;
    };

    React.useEffect(() => {
        let isMounted = true;
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('video_sessions')
                    .select('*')
                    .eq('video_id', video.id);

                if (error) throw error;

                if (data && data.length > 0 && isMounted) {
                    const totalSessions = data.length;
                    // Count plays where user watched at least 1 second
                    const plays = data.filter((s: any) => s.max_time_watched > 0).length;
                    const ctaClicks = data.filter((s: any) => s.cta_clicked).length;
                    const conversion = plays > 0 ? (ctaClicks / plays) * 100 : 0;

                    const sumRetention = data.reduce((acc: number, s: any) => acc + (s.max_time_watched || 0), 0);
                    const avgRetention = plays > 0 ? (sumRetention / plays) : 0;

                    const mobile = data.filter((s: any) => s.device_type === 'mobile').length;
                    const desktop = data.filter((s: any) => s.device_type === 'desktop').length;
                    const tablet = data.filter((s: any) => s.device_type === 'tablet').length;

                    const duration = video.duration || Math.max(...data.map((s: any) => s.max_time_watched || 0), 1);

                    // HEATMAP REAL: Busca dos pings precisos
                    const { data: retentionData } = await supabase
                        .from('video_retention_points')
                        .select('second_watched')
                        .eq('video_id', video.id);

                    let heatmapBars: number[] = [];

                    if (retentionData && retentionData.length > 0 && duration > 0) {
                        const numBars = 40; // Quantidade de barras visuais
                        const barDuration = duration / numBars;
                        const buckets = new Array(numBars).fill(0);

                        retentionData.forEach((pt: any) => {
                            const bucketIndex = Math.min(Math.floor(pt.second_watched / barDuration), numBars - 1);
                            if (bucketIndex >= 0) buckets[bucketIndex]++;
                        });

                        // Normaliza a altura das barras (0 a 100%) baseado no pico máximo de re-watches
                        const maxHits = Math.max(...buckets, 1);
                        heatmapBars = buckets.map(count => (count / maxHits) * 100);
                    } else if (plays > 0) {
                        // Fallback temporário em caso de vídeo sem pings (Apenas VSL simulado)
                        heatmapBars = new Array(40).fill(0).map((_, i) => Math.max(0, 100 - (i * 2.5)));
                    }

                    // Fake/Mock traffic logic since we don't track the traffic_source yet on DB (can be adjusted later)
                    // For now, if we have plays, distribute them mostly to Embed.
                    const embedRaw = Math.floor(plays * 0.85);
                    const linkRaw = Math.floor(plays * 0.12);
                    const seoRaw = plays - embedRaw - linkRaw;


                    // SYNC FIX: Update the 'videos' table if the plays count is different
                    // This fixes the '0 plays' issue on the dashboard when sessions actually exist
                    if (plays > (video.plays || 0)) {
                        await supabase
                            .from('videos')
                            .update({ plays: plays })
                            .eq('id', video.id);

                        console.log(`Synced play count for video ${video.id}: ${plays}`);
                        if (onSync) onSync();
                    }

                    // FETCH LEADS
                    const { data: leadsData } = await supabase
                        .from('video_leads')
                        .select('*')
                        .eq('video_id', video.id)
                        .order('created_at', { ascending: false });

                    setStats(prev => ({
                        ...prev,
                        plays,
                        unique: plays,
                        retention: avgRetention,
                        cta: ctaClicks,
                        conversion,
                        leads: leadsData?.length || 0,
                        recentLeads: leadsData || [],
                        devices: {
                            mobile: totalSessions > 0 ? Math.round((mobile / totalSessions) * 100) : 0,
                            desktop: totalSessions > 0 ? Math.round((desktop / totalSessions) * 100) : 0,
                            tablet: totalSessions > 0 ? Math.round((tablet / totalSessions) * 100) : 0
                        },
                        traffic: {
                            embed: plays > 0 ? Math.round((embedRaw / plays) * 100) : 0,
                            link: plays > 0 ? Math.round((linkRaw / plays) * 100) : 0,
                            seo: plays > 0 ? Math.round((seoRaw / plays) * 100) : 0
                        },
                        heatmapBars,
                        duration
                    }));
                }
            } catch (err) {
                console.error("Error fetching analytics", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAnalytics();
        return () => { isMounted = false; };
    }, [video.id]);

    const exportLeadsToCSV = () => {
        if (!planSettings.features.advancedAnalytics) {
            alert('A exportação de leads em CSV é exclusiva para o plano PRO.');
            return;
        }
        if (!stats.recentLeads || stats.recentLeads.length === 0) return;

        const headers = ["ID", "E-mail", "Nome", "Data de Captura"];
        const rows = stats.recentLeads.map(lead => [
            lead.id,
            lead.email,
            lead.name || "",
            new Date(lead.created_at).toLocaleString('pt-BR')
        ]);

        const csvContent = "\uFEFF" + [ // UTF-8 BOM for Excel
            headers.join(";"),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `leads-${video.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    if (loading) {
        return <div className="flex items-center justify-center p-20 text-brand-primary"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div></div>;
    }

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        Analytics
                        <span className="text-brand-primary text-sm font-bold uppercase tracking-widest bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">Pro</span>
                    </h2>
                    <p className="text-neutral-400 mt-1">Analisando desempenho de: <strong className="text-white">{video.title}</strong></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
                            <Play className="w-6 h-6 text-brand-primary" fill="currentColor" />
                        </div>
                        {stats.plays > 0 && <span className="text-emerald-400 text-sm font-bold flex items-center gap-1"><ChevronUp className="w-4 h-4" /> Ativo</span>}
                    </div>
                    <h4 className="text-neutral-400 text-sm font-medium mb-1">Total de Plays</h4>
                    <p className="text-3xl font-bold text-white mb-1">{stats.plays.toLocaleString('pt-BR')}</p>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden absolute bottom-0 left-0"><div className="w-[100%] h-full bg-brand-primary"></div></div>
                </div>

                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-400/10 rounded-xl border border-emerald-400/20">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <h4 className="text-neutral-400 text-sm font-medium mb-1">Espectadores Únicos</h4>
                    <p className="text-3xl font-bold text-white mb-1">{stats.unique.toLocaleString('pt-BR')}</p>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden absolute bottom-0 left-0"><div className="w-[100%] h-full bg-emerald-400"></div></div>
                </div>

                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-400/10 rounded-xl border border-blue-400/20">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <h4 className="text-neutral-400 text-sm font-medium mb-1">Média de Renteção</h4>
                    <p className="text-3xl font-bold text-white mb-1">{Math.floor(stats.retention)}s</p>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden absolute bottom-0 left-0"><div className="w-[100%] h-full bg-blue-400"></div></div>
                </div>

                <div className="bg-brand-dark-lighter border border-brand-primary/20 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-brand-primary/20 rounded-xl border border-brand-primary/30">
                            <MousePointerClick className="w-6 h-6 text-brand-primary" />
                        </div>
                    </div>
                    <h4 className="text-neutral-300 text-sm font-medium mb-1 relative z-10">Cliques no CTA</h4>
                    <p className="text-3xl font-bold text-white mb-1 relative z-10">{stats.cta}</p>
                    <p className="text-brand-primary text-xs font-bold relative z-10">{stats.conversion.toFixed(1)}% de Click-through</p>
                </div>

                <div className="bg-brand-dark-lighter border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <h4 className="text-neutral-300 text-sm font-medium mb-1 relative z-10">Leads Capturados</h4>
                    <p className="text-3xl font-bold text-white mb-1 relative z-10">{stats.leads}</p>
                    <p className="text-emerald-400 text-xs font-bold relative z-10">
                        {stats.plays > 0 ? ((stats.leads / stats.plays) * 100).toFixed(1) : 0}% de Conversão
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-brand-dark-lighter border border-white/5 p-8 rounded-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-white">Gráfico de Retenção (Engajamento)</h3>
                        <select className="bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:border-brand-primary">
                            <option>Últimos 7 dias</option>
                            <option>Últimos 30 dias</option>
                            <option>Todo o período</option>
                        </select>
                    </div>

                    <div className="relative w-full h-[300px]">
                        {/* Eixo Y */}
                        <div className="absolute left-0 top-0 bottom-8 border-r border-white/10 pr-4 flex flex-col justify-between text-xs text-neutral-500 text-right w-12">
                            <span>100%</span>
                            <span>75%</span>
                            <span>50%</span>
                            <span>25%</span>
                            <span>0%</span>
                        </div>

                        {/* Eixo X */}
                        <div className="absolute left-16 right-0 bottom-0 text-xs text-neutral-500 flex justify-between uppercase">
                            <span>0:00</span>
                            <span>{formatTime(stats.duration * 0.25)}</span>
                            <span>{formatTime(stats.duration * 0.5)}</span>
                            <span>{formatTime(stats.duration * 0.75)}</span>
                            <span>{formatTime(stats.duration)}</span>
                        </div>

                        {/* Gráfico Heatmap Barras (Real Engagement Spikes) */}
                        {/* SVG Heatmap Área e Interações */}
                        <div
                            className="absolute left-16 right-0 top-2 bottom-8 cursor-crosshair group"
                            ref={chartRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            <svg
                                width="100%"
                                height="100%"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                className="overflow-visible"
                            >
                                <defs>
                                    <linearGradient id="heatmapGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#e82a58" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#e82a58" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Area Fill */}
                                <path
                                    d={generateAreaPath()}
                                    fill="url(#heatmapGradient)"
                                    className="transition-all duration-300 ease-out"
                                />

                                {/* Top Line */}
                                <path
                                    d={generateLinePath()}
                                    fill="none"
                                    stroke="#e82a58"
                                    strokeWidth="0.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-300 ease-out drop-shadow-[0_0_8px_rgba(232,42,88,0.8)]"
                                />
                            </svg>

                            {/* Hover Tooltip Overlay */}
                            {hoverData && (
                                <>
                                    {/* Vertical Tracking Line */}
                                    <div
                                        className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-75 ease-out"
                                        style={{ left: `${hoverData.x}%`, zIndex: 10 }}
                                    >
                                        {/* Tracking Dot */}
                                        <div
                                            className="absolute w-3 h-3 bg-brand-primary rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(232,42,88,1)] transition-all duration-75 ease-out"
                                            style={{ top: `${100 - hoverData.percent}%` }}
                                        />
                                    </div>

                                    {/* Floating Tooltip Box */}
                                    <div
                                        className="absolute -top-12 -translate-x-1/2 bg-brand-dark/95 backdrop-blur-md border border-brand-primary/50 text-white px-3 py-2 rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-20 transition-all duration-75 ease-out flex flex-col items-center gap-1 min-w-[120px]"
                                        style={{ left: `${hoverData.x}%` }}
                                    >
                                        <div className="font-bold text-brand-primary text-[10px] uppercase tracking-wider">
                                            TEMPO: {hoverData.time}
                                        </div>
                                        <div className="font-bold text-sm">
                                            {Math.round(hoverData.percent)}% Retenção
                                        </div>
                                        {/* Little arrow at bottom */}
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-dark/95 border-b border-r border-brand-primary/50 rotate-45"></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl flex-1">
                        <h3 className="text-lg font-bold text-white mb-6">Dispositivos</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-300">Mobile (Celular)</span>
                                    <span className="text-white font-bold">{stats.devices.mobile}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden"><div className="bg-brand-primary h-full" style={{ width: `${stats.devices.mobile}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-300">Desktop (PC)</span>
                                    <span className="text-white font-bold">{stats.devices.desktop}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden"><div className="bg-blue-400 h-full" style={{ width: `${stats.devices.desktop}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-300">Tablet</span>
                                    <span className="text-white font-bold">{stats.devices.tablet}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden"><div className="bg-purple-400 h-full" style={{ width: `${stats.devices.tablet}%` }}></div></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl flex-1">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                            Fontes de Tráfego
                            <Link2 className="w-4 h-4 text-neutral-400" />
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex justify-between text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-neutral-300 font-medium">Embed Direto (Site)</span>
                                <span className="text-brand-primary font-bold">{stats.traffic.embed}%</span>
                            </li>
                            <li className="flex justify-between text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-neutral-300 font-medium">Link do Hostfy</span>
                                <span className="text-white font-bold">{stats.traffic.link}%</span>
                            </li>
                            <li className="flex justify-between text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-neutral-300 font-medium">Orgânico / SEO</span>
                                <span className="text-white font-bold">{stats.traffic.seo}%</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Leads Table Section */}
            {stats.leads > 0 && (
                <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl overflow-hidden mb-12">
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-brand-primary" />
                            <h3 className="text-lg font-bold text-white">Leads Capturados Recentemente</h3>
                        </div>
                        <button
                            onClick={exportLeadsToCSV}
                            className="text-xs font-black text-brand-primary uppercase tracking-widest hover:underline cursor-pointer"
                        >
                            Exportar CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Lead / E-mail</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Nome</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest">Data da Captura</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.recentLeads.map((lead: any) => (
                                    <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-white font-medium text-sm">{lead.email}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-neutral-400 text-sm font-medium">{lead.name || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-neutral-500 text-xs">
                                                {new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
