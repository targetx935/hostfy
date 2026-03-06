import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Download, ExternalLink, Mail, Calendar, Video } from 'lucide-react';
import { getPlanSettings } from '../lib/planLimits';

export const LeadsView = ({ videos: _initialVideos = [], userPlan = 'trial' }: { videos?: any[], userPlan?: string }) => {
    const [leads, setLeads] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const planSettings = getPlanSettings(userPlan);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('video_leads')
                .select(`
                    id,
                    email,
                    name,
                    created_at,
                    video_id,
                    videos(title)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);

            // Also fetch videos to calculate total plays
            const { data: vData } = await supabase.from('videos').select('plays');
            setVideos(vData || []);
        } catch (err) {
            console.error("Error fetching leads:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const filteredLeads = leads.filter(lead =>
        (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lead.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lead.videos?.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const exportToCSV = () => {
        if (!planSettings.features.csvExport) return;

        const headers = ["E-mail", "Nome", "Vídeo de Origem", "Data"];
        const rows = filteredLeads.map(lead => [
            lead.email,
            lead.name || "",
            lead.videos?.title || "Desconhecido",
            new Date(lead.created_at).toLocaleString('pt-BR')
        ]);

        const csvContent = "\uFEFF" + [
            headers.join(";"),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `leads-hostfy-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-brand-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (!planSettings.features.leadCapture) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 border border-brand-primary/20">
                    <Users className="w-10 h-10 text-brand-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Captura de Leads (PRO)</h2>
                <p className="text-neutral-400 max-w-md mb-8">
                    A funcionalidade de Email Gate e o Dashboard de Leads estão disponíveis apenas nos planos PRO e Ultra.
                    Comece a capturar dados dos seus espectadores e aumente suas vendas.
                </p>
                <button className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 hover:scale-105">
                    Fazer Upgrade Agora
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        Leads Dashboard
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                            {planSettings.name}
                        </span>
                    </h2>
                    <p className="text-neutral-400 mt-1">Todos os contatos capturados através do seu player</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-brand-dark/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition-all w-64"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        disabled={!planSettings.features.csvExport}
                        className="bg-white hover:bg-neutral-100 text-black font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV {!planSettings.features.csvExport && " (PRO)"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl">
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Total de Leads</p>
                    <h3 className="text-3xl font-black text-white">{leads.length}</h3>
                </div>
                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl">
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Últimos 7 dias</p>
                    <h3 className="text-3xl font-black text-emerald-400">
                        {leads.filter(l => (new Date().getTime() - new Date(l.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length}
                    </h3>
                </div>
                <div className="bg-brand-dark-lighter border border-white/5 p-6 rounded-2xl">
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Taxa de Conversão Média</p>
                    <h3 className="text-3xl font-black text-brand-primary">
                        {leads.length > 0 ? (() => {
                            const totalPlays = videos.reduce((acc: number, v: any) => acc + (v.plays || 0), 0);
                            return totalPlays > 0 ? ((leads.length / totalPlays) * 100).toFixed(1) + '%' : '0.0%';
                        })() : "0.0%"}
                    </h3>
                </div>
            </div>

            <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contato / Lead</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vídeo de Origem</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Data da Captura</th>
                                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs ring-1 ring-brand-primary/20">
                                                {lead.name ? lead.name.charAt(0).toUpperCase() : <Mail className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{lead.name || 'Sem Nome'}</span>
                                                <span className="text-neutral-500 text-xs">{lead.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-neutral-300 font-medium text-sm flex items-center gap-2">
                                                <Video className="w-3.5 h-3.5 text-neutral-500" />
                                                {lead.videos?.title || 'Vídeo Removido'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-neutral-400 text-xs flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                                                {new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 text-neutral-600 hover:text-white transition-colors cursor-pointer" title="Ver no vídeo">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-neutral-500 italic">
                                        Nenhum lead encontrado para os critérios de busca.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
