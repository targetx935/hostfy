import { useState, useEffect } from 'react';
import { Beaker, X, Copy, BarChart2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPlanSettings } from '../lib/planLimits';
import type { VideoData } from '../types';

export const ABTestsView = ({ userPlan = 'trial' }: { userPlan?: string }) => {
    const planSettings = getPlanSettings(userPlan);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [testName, setTestName] = useState('');
    const [videoAId, setVideoAId] = useState('');
    const [videoBId, setVideoBId] = useState('');

    const [videos, setVideos] = useState<VideoData[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Analytics Modal State
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [testStats, setTestStats] = useState<{
        viewsA: number, conversionsA: number,
        viewsB: number, conversionsB: number
    } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch User Videos
            const { data: vData } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
            if (vData) setVideos(vData);

            // Fetch User Tests
            const { data: tData } = await supabase.from('ab_tests').select('*, video_a:videos!ab_tests_video_a_id_fkey(title), video_b:videos!ab_tests_video_b_id_fkey(title)').order('created_at', { ascending: false });
            if (tData) setTests(tData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateTest = async () => {
        if (!testName || !videoAId || !videoBId) {
            alert("Preencha todos os campos do teste!");
            return;
        }

        try {
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await supabase.from('ab_tests').insert({
                user_id: userData.user?.id,
                name: testName,
                video_a_id: videoAId,
                video_b_id: videoBId
            });

            if (error) throw error;

            setIsModalOpen(false);
            setTestName('');
            setVideoAId('');
            setVideoBId('');
            fetchData();
        } catch (error: any) {
            alert('Erro ao criar teste: ' + error.message);
        }
    };

    const copyEmbedCode = (testId: string) => {
        const embedCode = `<iframe src="${window.location.origin}/?split_test=${testId}" frameborder="0" allowfullscreen allow="autoplay; fullscreen" style="aspect-ratio: 16/9; width: 100%; height: auto; border-radius: 12px;"></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert('Código de incorporação do Teste copiado para área de transferência!');
    };

    const openAnalytics = async (test: any) => {
        setSelectedTest(test);
        setTestStats(null); // loading state
        try {
            const { data, error } = await supabase
                .from('ab_test_views')
                .select('video_shown_id, converted')
                .eq('test_id', test.id);

            if (error) throw error;

            let viewsA = 0, conversionsA = 0;
            let viewsB = 0, conversionsB = 0;

            if (data) {
                data.forEach(view => {
                    if (view.video_shown_id === test.video_a_id) {
                        viewsA++;
                        if (view.converted) conversionsA++;
                    } else if (view.video_shown_id === test.video_b_id) {
                        viewsB++;
                        if (view.converted) conversionsB++;
                    }
                });
            }

            setTestStats({ viewsA, conversionsA, viewsB, conversionsB });
        } catch (err) {
            console.error("Erro ao carregar analytics do teste", err);
            alert("Erro ao carregar dados do teste.");
        }
    };

    if (!planSettings.features.advancedAnalytics) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 border border-brand-primary/20">
                    <Beaker className="w-10 h-10 text-brand-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Testes A/B (PRO)</h2>
                <p className="text-neutral-400 max-w-md mb-8">
                    Crie batalhas entre suas VSLs para descobrir qualpitch ou edição gera mais conversão. Recurso exclusivo para planos PRO e Ultra.
                </p>
                <button className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 hover:scale-105">
                    Fazer Upgrade Agora
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out] w-full relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Testes A/B (VSLs)</h2>
                    <p className="text-neutral-400">Descubra qual pitch ou edição gera mais conversão.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-primary text-white hover:bg-brand-primary-light font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer shadow-lg text-sm flex items-center gap-2"
                >
                    <Beaker className="w-4 h-4" /> Criar Novo Teste
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-brand-dark border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Beaker className="w-5 h-5 text-brand-primary" />
                                Batalha de VSLs
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Nome da Campanha</label>
                                <input
                                    type="text"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="Ex: Pitch Emocional vs Racional"
                                    className="w-full bg-brand-dark-lighter border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-3 text-white placeholder-neutral-500 outline-none transition-all duration-300"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                                        Vídeo A
                                    </label>
                                    <select
                                        value={videoAId}
                                        onChange={e => setVideoAId(e.target.value)}
                                        className="w-full bg-brand-dark-lighter border border-white/10 focus:border-brand-primary rounded-lg px-4 py-3 text-white text-sm outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Vídeo B
                                    </label>
                                    <select
                                        value={videoBId}
                                        onChange={e => setVideoBId(e.target.value)}
                                        className="w-full bg-brand-dark-lighter border border-white/10 focus:border-blue-500 rounded-lg px-4 py-3 text-white text-sm outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateTest}
                                className="px-6 py-2.5 text-sm font-medium bg-brand-primary hover:bg-brand-primary-light text-white rounded-lg transition-all shadow-lg cursor-pointer"
                            >
                                Iniciar Split Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Analytics Modal */}
            {selectedTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-brand-dark border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-brand-primary" />
                                Resultados: {selectedTest.name}
                            </h3>
                            <button onClick={() => setSelectedTest(null)} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            {!testStats ? (
                                <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Video A Stats */}
                                    <div className={`bg-brand-dark-lighter border rounded-2xl p-6 relative overflow-hidden transition-all ${((testStats.conversionsA / (testStats.viewsA || 1)) > (testStats.conversionsB / (testStats.viewsB || 1))) ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-white/5 opacity-80'}`}>
                                        {((testStats.conversionsA / (testStats.viewsA || 1)) > (testStats.conversionsB / (testStats.viewsB || 1))) && (
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg z-10 flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3" /> Campeão
                                            </div>
                                        )}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/5 rounded-full blur-[30px]"></div>
                                        <h4 className="text-lg font-bold text-white mb-1"><span className="text-brand-primary">A:</span> {selectedTest.video_a?.title}</h4>
                                        <div className="space-y-4 mt-6">
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-medium tracking-wider">Visualizações Totais</p>
                                                <p className="text-2xl font-bold text-white">{testStats.viewsA}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-medium tracking-wider">Cliques no CTA (Conversões)</p>
                                                <p className="text-2xl font-bold text-white">{testStats.conversionsA}</p>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-xs text-brand-primary uppercase font-medium tracking-wider">Taxa de Conversão Real</p>
                                                <p className="text-3xl font-black text-white mt-1">
                                                    {testStats.viewsA > 0 ? ((testStats.conversionsA / testStats.viewsA) * 100).toFixed(1) : '0.0'}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video B Stats */}
                                    <div className={`bg-brand-dark-lighter border rounded-2xl p-6 relative overflow-hidden transition-all ${((testStats.conversionsB / (testStats.viewsB || 1)) > (testStats.conversionsA / (testStats.viewsA || 1))) ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-white/5 opacity-80'}`}>
                                        {((testStats.conversionsB / (testStats.viewsB || 1)) > (testStats.conversionsA / (testStats.viewsA || 1))) && (
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg z-10 flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3" /> Campeão
                                            </div>
                                        )}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-[30px]"></div>
                                        <h4 className="text-lg font-bold text-white mb-1"><span className="text-blue-500">B:</span> {selectedTest.video_b?.title}</h4>
                                        <div className="space-y-4 mt-6">
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-medium tracking-wider">Visualizações Totais</p>
                                                <p className="text-2xl font-bold text-white">{testStats.viewsB}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-medium tracking-wider">Cliques no CTA (Conversões)</p>
                                                <p className="text-2xl font-bold text-white">{testStats.conversionsB}</p>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-xs text-blue-400 uppercase font-medium tracking-wider">Taxa de Conversão Real</p>
                                                <p className="text-3xl font-black text-white mt-1">
                                                    {testStats.viewsB > 0 ? ((testStats.conversionsB / testStats.viewsB) * 100).toFixed(1) : '0.0'}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                            <button onClick={() => setSelectedTest(null)} className="px-6 py-2.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer">
                                Fechar Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabela de testes */}
            {loading ? (
                <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>
            ) : tests.length === 0 ? (
                <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center mt-10">
                    <div className="bg-brand-primary/10 p-6 rounded-full block mb-5">
                        <Beaker className="w-12 h-12 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum Teste Rodando</h3>
                    <p className="text-neutral-400 max-w-sm mb-6">Pausar a mediocridade é o primeiro passo para o 6 em 7. Submeta dois VSLs à uma rinha de conversão agora.</p>
                    <button onClick={() => setIsModalOpen(true)} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform">Forçar Nova Disputa</button>
                </div>
            ) : (
                <div className="bg-brand-dark-lighter/30 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden shadow-xl overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                        <thead className="text-neutral-400 border-b border-white/5 bg-white/[0.02]">
                            <tr>
                                <th className="px-6 py-5 font-medium">Nome da Campanha</th>
                                <th className="px-6 py-5 font-medium">Competidores</th>
                                <th className="px-6 py-5 font-medium">Acesso</th>
                                <th className="px-6 py-5 font-medium">Status / Vencedor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tests.map(test => (
                                <tr key={test.id} className="hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-4 font-bold text-white">{test.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span className="text-neutral-300"><span className="text-brand-primary font-bold">A:</span> {test.video_a?.title}</span>
                                            <span className="text-neutral-300"><span className="text-blue-500 font-bold">B:</span> {test.video_b?.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copyEmbedCode(test.id)}
                                                className="flex items-center gap-1.5 text-brand-primary hover:text-white bg-brand-primary/10 hover:bg-brand-primary/30 transition-colors px-3 py-1.5 rounded text-xs font-bold cursor-pointer"
                                            >
                                                <Copy className="w-3 h-3" /> Link Embed
                                            </button>
                                            <button
                                                onClick={() => openAnalytics(test)}
                                                className="flex items-center gap-1.5 text-emerald-400 hover:text-white bg-emerald-400/10 hover:bg-emerald-400/30 transition-colors px-3 py-1.5 rounded text-xs font-bold cursor-pointer"
                                            >
                                                <BarChart2 className="w-3 h-3" /> Ver Analytics
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {test.status === 'active' ? (
                                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-400/10 px-2 py-1 rounded flex w-fit items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                                Rodando
                                            </span>
                                        ) : test.status === 'finished' ? (
                                            <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded border border-white/10 w-fit flex">
                                                Finalizado
                                            </span>
                                        ) : (
                                            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-400/10 px-2 py-1 rounded w-fit flex">
                                                Pausado
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
