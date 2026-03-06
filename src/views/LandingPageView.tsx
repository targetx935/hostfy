import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Shield, Zap, Check,
    Menu, X, Globe, ArrowRight, MessageSquare,
    Trophy, Star, BarChart3, AlertTriangle, Activity, Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';

const APP_URL = "/register";

const ExitIntent = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0a0a0b]/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="glass-card max-w-lg w-full p-10 text-center border-brand-primary/50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
                        <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Espera! Não perca sua <br /> chance de vender mais.</h2>
                        <p className="text-neutral-400 mb-8 leading-relaxed">
                            Você sabia que players comuns podem estar matando até 30% das suas vendas? Comece a proteger seus vídeos hoje com o Hostfy.
                        </p>
                        <div className="flex flex-col gap-4">
                            <Link to={APP_URL} className="bg-brand-primary hover:bg-brand-primary-light text-white py-5 rounded-2xl font-black transition-all hover:scale-105 shadow-2xl shadow-brand-primary/30 text-lg">
                                Criar minha conta grátis agora
                            </Link>
                            <button onClick={onClose} className="text-neutral-500 text-sm hover:text-white transition-colors">
                                Não, prefiro continuar perdendo vendas
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const ROICalculator = () => {
    const [traffic, setTraffic] = useState(10000);
    const [conversion, setConversion] = useState(1);
    const [ticket, setTicket] = useState(197);

    const currentRevenue = (traffic * (conversion / 100) * ticket);
    const potentialRevenue = currentRevenue * 1.3; // 30% increase
    const recovered = potentialRevenue - currentRevenue;

    return (
        <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="glass-card p-8 md:p-12 rounded-[40px] border-white/10 space-y-10">
                <div className="space-y-6">
                    <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-neutral-500">
                        <span>Tráfego Mensal (Cliques)</span>
                        <span className="text-white text-xl">{traffic.toLocaleString()}</span>
                    </div>
                    <input
                        type="range" min="1000" max="100000" step="1000"
                        value={traffic} onChange={(e) => setTraffic(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-brand-primary"
                    />
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-neutral-500">
                        <span>Taxa de Conversão Atual (%)</span>
                        <span className="text-white text-xl">{conversion}%</span>
                    </div>
                    <input
                        type="range" min="0.1" max="10" step="0.1"
                        value={conversion} onChange={(e) => setConversion(parseFloat(e.target.value))}
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-brand-primary"
                    />
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-neutral-500">
                        <span>Ticket Médio (R$)</span>
                        <span className="text-white text-xl">R$ {ticket}</span>
                    </div>
                    <input
                        type="range" min="10" max="2000" step="10"
                        value={ticket} onChange={(e) => setTicket(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-brand-primary"
                    />
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 bg-brand-primary/20 blur-[120px] rounded-full"></div>
                <div className="glass-card p-10 rounded-[40px] border-brand-primary/30 bg-brand-primary/5 relative z-10 text-center space-y-8">
                    <div>
                        <p className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-2">Faturamento Recuperado com Hostfy</p>
                        <motion.div
                            key={recovered}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-5xl md:text-7xl font-black text-white tracking-tighter"
                        >
                            R$ {recovered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </motion.div>
                        <p className="text-brand-primary font-black mt-4 uppercase tracking-tighter animate-pulse">
                            +30% de Retenção Garantida
                        </p>
                    </div>

                    <div className="h-px bg-white/10 w-full"></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-left p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Impacto Anual</p>
                            <p className="text-xl font-black text-emerald-400">R$ {(recovered * 12).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-left p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">ROI Estimado</p>
                            <p className="text-xl font-black text-emerald-400">12.5x</p>
                        </div>
                    </div>

                    <Link to={APP_URL} className="block w-full bg-brand-primary hover:bg-brand-primary-light text-white py-6 rounded-2xl text-xl font-black shadow-2xl transition-all hover:scale-105 active:scale-95">
                        Recuperar meu Lucro Agora
                    </Link>
                </div>
            </div>
        </div>
    );
};

const HeroDashboard = () => {
    return (
        <div className="relative group">
            {/* Decorative Glow */}
            <div className="absolute -inset-4 bg-brand-primary/20 blur-[60px] rounded-[40px] opacity-20 group-hover:opacity-30 transition-opacity"></div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="relative glass-card aspect-video rounded-[32px] border-white/10 overflow-hidden shadow-2xl shadow-brand-primary/10"
            >
                {/* ESPAÇO PARA O HTML DA HOSTFY */}
                <div className="absolute inset-0 bg-black flex items-center justify-center group/play cursor-pointer">
                    {/* Placeholder Content: This will be replaced by pasting the Hostfy Embed HTML */}
                    <div className="text-center">
                        <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mb-4 group-hover/play:scale-110 transition-transform relative">
                            <div className="absolute inset-0 bg-brand-primary rounded-full animate-ping opacity-20"></div>
                            <Play className="w-8 h-8 text-brand-primary fill-brand-primary" />
                        </div>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Clique para Assistir a VSL</p>
                    </div>

                    {/* Overlay: Optional dark gradient for a more "video" feel */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40"></div>
                </div>

                {/* Progress Bar Mockup */}
                <div className="absolute bottom-6 left-6 right-6 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[15%] h-full bg-brand-primary rounded-full shadow-[0_0_10px_rgba(232,42,88,0.8)]"></div>
                </div>

                {/* Edge Light */}
                <div className="absolute inset-0 rounded-[32px] border border-white/5 pointer-events-none"></div>
            </motion.div>

            {/* Floating Labels and Badges */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 glass-card p-4 rounded-2xl border-emerald-500/30 bg-emerald-500/5 hidden md:block"
            >
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Carregamento Instantâneo</span>
                </div>
                <div className="text-white font-bold text-sm">0.8s LCP</div>
            </motion.div>

            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-10 -left-6 glass-card p-4 rounded-2xl border-brand-primary/30 bg-brand-primary/5 hidden md:block"
            >
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3 h-3 text-brand-primary" />
                    <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest">Proteção Anti-Clone</span>
                </div>
                <div className="text-white font-bold text-sm">HLS Encryption v2</div>
            </motion.div>
        </div>
    );
};

const MobileShowcase = () => {
    return (
        <section className="py-32 relative overflow-hidden pink-grid border-y border-brand-primary/5">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b] via-transparent to-[#0a0a0b]"></div>
            <div className="flex flex-col lg:flex-row items-center gap-20">
                <div className="flex-1 order-2 lg:order-1">
                    <HeroDashboard />
                </div>

                <div className="flex-1 order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-6">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-black tracking-widest text-blue-400 uppercase">Mobile-First Experience</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                        Sua VSL perfeita em <br />
                        <span className="text-blue-500">qualquer celular.</span>
                    </h2>
                    <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
                        Sabemos que <span className="text-white font-bold">94% do tráfego direto</span> vem do mobile. O Hostfy foi otimizado para carregar instantaneamente mesmo em conexões 4G instáveis, garantindo que seu lead não abandone a página.
                    </p>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-white font-black mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-blue-500" /> Auto-Play Inteligente
                            </h4>
                            <p className="text-neutral-500 text-sm">Contorna as restrições de navegadores mobile para dar play com som ou mute automático.</p>
                        </div>
                        <div>
                            <h4 className="text-white font-black mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" /> Baixo Consumo
                            </h4>
                            <p className="text-neutral-500 text-sm">Menos processamento de CPU, o que evita que o celular do lead esquente ou trave o navegador.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


export const LandingPageView = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showExit, setShowExit] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    useEffect(() => {
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && !sessionStorage.getItem('hostfy_exit_shown')) {
                setShowExit(true);
                sessionStorage.setItem('hostfy_exit_shown', 'true');
            }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const pricing = [
        {
            name: "Starter",
            price: "49",
            features: ["5 Vídeos", "50h Streaming", "2.000 Plays/mês", "Lead Capture", "Analytics Básico"],
            button: "Começar Agora",
            checkoutUrl: "/register",
            popular: false
        },
        {
            name: "PRO",
            price: "97",
            features: ["15 Vídeos", "200h Streaming", "6.000 Plays/mês", "Lead Capture Premium", "Social Proof", "Watermark", "Advanced Analytics"],
            button: "Escalar Agora",
            checkoutUrl: "https://pay.kiwify.com.br/placeholder-pro",
            popular: true
        },
        {
            name: "Elite",
            price: "247",
            features: ["50+ Vídeos", "800h Streaming", "25.000 Plays/mês", "Tudo do PRO", "Whitelist Ilimitada", "Suporte Prioritário"],
            button: "Falar com Consultor",
            checkoutUrl: "https://wa.me/message/placeholder",
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-brand-primary selection:text-white">
            <ExitIntent isOpen={showExit} onClose={() => setShowExit(false)} />
            <style>
                {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-glow { animation: glow 4s ease-in-out infinite; }
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .text-gradient {
            background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .mesh-gradient {
            background-color: #0a0a0b;
            background-image: 
              radial-gradient(at 0% 0%, hsla(347,81%,53%,0.2) 0, transparent 50%), 
              radial-gradient(at 50% 0%, hsla(220,100%,50%,0.15) 0, transparent 50%),
              radial-gradient(at 100% 0%, hsla(347,81%,53%,0.2) 0, transparent 50%),
              radial-gradient(at 50% 50%, hsla(347,81%,53%,0.1) 0, transparent 60%);
          }
          .bento-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-auto-rows: 240px;
            gap: 1.5rem;
          }
          .pink-grid {
            background-image: 
              linear-gradient(rgba(232, 42, 88, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(232, 42, 88, 0.05) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .bg-pink-premium {
            background: linear-gradient(135deg, rgba(232, 42, 88, 0.9) 0%, rgba(180, 20, 60, 1) 100%);
          }
          @media (max-width: 1024px) {
            .bento-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 640px) {
            .bento-grid {
              grid-template-columns: 1fr;
              grid-auto-rows: auto;
            }
          }
        `}
            </style>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 bg-brand-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(232,42,88,0.4)] group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">Hostfy<span className="text-brand-primary">.</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Preços</a>
                        <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Entrar</Link>
                        <Link to="/register" className="bg-brand-primary hover:bg-brand-primary-light text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/20">
                            Começar Agora
                        </Link>
                    </div>

                    <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[90] bg-[#0a0a0b] p-6 flex flex-col pt-24 gap-6 animate-[fadeIn_0.3s_ease-out]">
                    <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Funcionalidades</a>
                    <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Preços</a>
                    <Link to="/login" className="text-2xl font-bold">Entrar</Link>
                    <Link to="/register" className="bg-brand-primary text-white py-4 rounded-2xl text-center font-bold text-xl">
                        Começar Grátis
                    </Link>
                </div>
            )}

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] animate-glow"></div>
                    <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8"
                        >
                            <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold tracking-widest text-neutral-300">A Hospedagem de Vídeo nº 1 para Infoprodutores</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-6xl md:text-[10rem] font-black mb-8 tracking-tighter leading-[0.8] text-white"
                        >
                            Venda Mais com <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-rose-500 to-brand-primary bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">Vídeos Seguros</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-neutral-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed"
                        >
                            O único player do mundo criado exclusivamente para vender.
                            Carregamento ultra-rápido, proteção total e métricas que geram lucro.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
                        >
                            <Link
                                to={APP_URL}
                                className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary-light text-white px-12 py-6 rounded-2xl text-xl font-black transition-all hover:scale-105 shadow-2xl shadow-brand-primary/40 flex items-center justify-center gap-3"
                            >
                                Quero Vender Mais
                                <ArrowRight className="w-6 h-6" />
                            </Link>
                        </motion.div>

                        {/* Dashboard Mockup */}
                        <div className="mt-20 relative w-full max-w-5xl group">
                            <div className="absolute inset-0 bg-brand-primary/20 blur-[100px] rounded-full group-hover:bg-brand-primary/30 transition-all duration-500"></div>
                            <div className="glass-card rounded-3xl p-2 md:p-4 rotate-x-2 animate-float">
                                <div className="rounded-2xl overflow-hidden shadow-2xl bg-brand-dark border border-white/10">
                                    <img
                                        src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=2000"
                                        alt="Dashboard Preview"
                                        className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 bg-brand-primary/90 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section: O Ralo de Dinheiro */}
            <section className="py-32 relative overflow-hidden bg-white/[0.02] border-y border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-brand-primary/5 blur-[120px] rounded-full opacity-30"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full mb-6">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-xs font-black tracking-widest text-red-400 uppercase">Onde seu lucro morre</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                                O Ralo de Dinheiro <br />
                                <span className="text-neutral-500 text-3xl md:text-5xl">no seu Funil de Vendas</span>
                            </h2>
                            <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
                                Você gasta milhares de reais em anúncios, mas <span className="text-white font-bold">30% do seu tráfego</span> abandona a página antes mesmo do vídeo carregar. Players lentos e pesados são o principal motivo de um ROI baixo.
                            </p>

                            <div className="space-y-6">
                                {[
                                    { label: "Carregamento Lento", pain: "-15% Conversão", icon: Zap },
                                    { label: "Player Travando", pain: "-22% Retenção", icon: Activity },
                                    { label: "Falta de Proteção", pain: "Cópia do Funil", icon: Shield }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl group hover:border-red-500/30 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold">{item.label}</div>
                                            <div className="text-red-400 text-sm font-black">{item.pain}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-primary/20 blur-[120px] rounded-full"></div>
                            <div className="glass-card p-8 rounded-[40px] border-white/10 relative z-10">
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end">
                                        <div className="text-neutral-500 text-xs font-black uppercase tracking-widest">Perda de Tráfego Estimada</div>
                                        <div className="text-red-500 font-black text-2xl">R$ 1.450,0,00/dia</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: "70%" }}
                                                className="h-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                                            <span>Tráfego Pago</span>
                                            <span>Tráfego que Vê o Vídeo</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                        <p className="text-xs text-red-400 font-bold mb-2 uppercase tracking-tighter">Diagnosticado:</p>
                                        <p className="text-white text-lg font-black italic">"Seu player atual está jogando seu lucro no lixo."</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-20 bg-brand-primary/5">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: "Vídeos Hospedados", value: "125k+" },
                        { label: "Uptime do Player", value: "99.9%" },
                        { label: "Carga do Player", value: "< 0.2s" },
                        { label: "Segurança Ativa", value: "SSL/WAF" }
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl md:text-5xl font-black text-white mb-2">{stat.value}</div>
                            <div className="text-xs font-bold tracking-widest text-brand-primary">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Anti-Spy Section */}
            <section className="py-32 bg-black relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="glass-card p-12 md:p-20 rounded-[60px] border-brand-primary/20 bg-brand-primary/[0.02] relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-primary/10 blur-[100px] rounded-full"></div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                            <div className="order-2 lg:order-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <Shield className="w-10 h-10 text-brand-primary mb-4" />
                                        <h4 className="text-white font-bold mb-2">Anti-Download</h4>
                                        <p className="text-neutral-500 text-xs leading-relaxed">Bloqueio total contra extensões e gravadores de tela comuns.</p>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <Crown className="w-10 h-10 text-amber-500 mb-4" />
                                        <h4 className="text-white font-bold mb-2">Blindagem de Código</h4>
                                        <p className="text-neutral-500 text-xs leading-relaxed">Código ofuscado que impede a descoberta da sua URL de vendas através do player.</p>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <Zap className="w-10 h-10 text-emerald-500 mb-4" />
                                        <h4 className="text-white font-bold mb-2">Edge Delivery</h4>
                                        <p className="text-neutral-500 text-xs leading-relaxed">Sua VSL carregando em milissegundos em qualquer lugar do mundo.</p>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <Globe className="w-10 h-10 text-blue-500 mb-4" />
                                        <h4 className="text-white font-bold mb-2">Whitelist de Domínio</h4>
                                        <p className="text-neutral-500 text-xs leading-relaxed">Seu vídeo só dá play nos sites que você autorizar. Ponto final.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="order-1 lg:order-2">
                                <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                                    Chega de ter seu <br />
                                    <span className="text-brand-primary">Funil Espionado.</span>
                                </h2>
                                <p className="text-neutral-400 text-lg mb-8">
                                    Protegemos sua VSL contra AdHeart, SpyHorus e ferramentas de download. Quando você escala, a concorrência tenta te copiar. No Hostfy, eles batem de frente com um muro.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-neutral-300 font-bold">
                                        <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-brand-primary" />
                                        </div>
                                        Proteção contra inspetor de elementos
                                    </li>
                                    <li className="flex items-center gap-3 text-neutral-300 font-bold">
                                        <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-brand-primary" />
                                        </div>
                                        Criptografia HLS dinâmica
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold text-brand-primary tracking-[0.2em] mb-4">A Lógica é Simples</h2>
                        <h3 className="text-3xl md:text-5xl font-black text-white">Hostfy vs Outros Players</h3>
                        <p className="mt-4 text-neutral-400">Players genéricos matam sua retenção e suas vendas.</p>
                    </div>

                    <div className="glass-card overflow-hidden border-brand-primary/10 rounded-[40px] shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.03]">
                                    <th className="p-8 text-sm font-black text-neutral-400 uppercase tracking-widest">Funcionalidade</th>
                                    <th className="p-8 text-sm font-black text-brand-primary text-center uppercase tracking-widest bg-brand-primary/5">Hostfy Security</th>
                                    <th className="p-8 text-sm font-black text-neutral-600 text-center uppercase tracking-widest">Vimeo / YouTube</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[
                                    { label: "Carregamento Ultrarápido", hostfy: true, others: false },
                                    { label: "Proteção contra Download", hostfy: true, others: false },
                                    { label: "Captura de Leads no Player", hostfy: true, others: false },
                                    { label: "Anúncios e Recomendações", hostfy: false, others: true },
                                    { label: "Atalhos de Teclado Bloqueados", hostfy: true, others: false },
                                    { label: "Watermark Dinâmica", hostfy: true, others: false },
                                ].map((item, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                                        <td className="p-8 text-base font-bold text-white group-hover:text-brand-primary transition-colors">{item.label}</td>
                                        <td className="p-8 text-center bg-brand-primary/[0.02]">
                                            {item.hostfy ? (
                                                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                                    <Check className="w-5 h-5 text-emerald-400" />
                                                </div>
                                            ) : (
                                                <X className="w-6 h-6 text-neutral-700 mx-auto" />
                                            )}
                                        </td>
                                        <td className="p-8 text-center">
                                            {item.others ? (
                                                <div className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-4 py-1.5 rounded-full border border-rose-500/20 inline-block uppercase tracking-widest">Prejudicial</div>
                                            ) : (
                                                <X className="w-6 h-6 text-rose-500/20 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 relative overflow-hidden bg-brand-primary/[0.02]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-black mb-6">Apenas o que importa <br /> para quem escala</h2>
                        <p className="text-neutral-400 max-w-2xl mx-auto">
                            Não somos apenas um player de vídeo. Somos a ferramenta que protege sua
                            propriedade intelectual e garante que seu lead assista até o fim.
                        </p>
                    </div>

                    <div className="bento-grid">
                        {/* Featured: Security */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass-card p-10 rounded-[40px] col-span-2 row-span-2 flex flex-col justify-between group overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 blur-[80px] group-hover:bg-brand-primary/20 transition-all"></div>
                            <div>
                                <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-primary/20 group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
                                    <Shield className="w-8 h-8 text-brand-primary group-hover:text-white" />
                                </div>
                                <h3 className="text-4xl font-black mb-6 tracking-tighter leading-tight">Segurança que <br /> Impede a Pirataria</h3>
                                <p className="text-neutral-400 text-lg leading-relaxed max-w-sm">
                                    Nossa proteção de domínio e criptografia HLS garantem que seu conteúdo pertença apenas a quem pagou por ele.
                                </p>
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                                <span className="text-xs font-black uppercase tracking-widest text-brand-primary">Saber mais</span>
                                <ArrowRight className="w-4 h-4 text-brand-primary group-hover:translate-x-2 transition-transform" />
                            </div>
                        </motion.div>

                        {/* Speed */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass-card p-8 rounded-[40px] col-span-2 row-span-1 flex flex-col justify-center group relative overflow-hidden"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 transition-all">
                                    <Zap className="w-7 h-7 text-blue-500 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Zero Delay</h3>
                                    <p className="text-neutral-400 text-sm">Carregamento instantâneo em qualquer conexão.</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Analytics */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass-card p-8 rounded-[40px] col-span-1 row-span-1 flex flex-col items-center text-center justify-center group"
                        >
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:bg-emerald-500 transition-all">
                                <BarChart3 className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight">Métricas</h3>
                            <p className="text-neutral-500 text-xs mt-2">Dados que vendem.</p>
                        </motion.div>

                        {/* Global */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass-card p-8 rounded-[40px] col-span-1 row-span-1 flex flex-col items-center text-center justify-center group"
                        >
                            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 border border-amber-500/20 group-hover:bg-amber-500 transition-all">
                                <Globe className="w-6 h-6 text-amber-500 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight">Global</h3>
                            <p className="text-neutral-500 text-xs mt-2">CDN Worldwide.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Authority Section: Big Numbers */}
            <section className="py-24 border-y border-white/5 bg-black relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-black text-white mb-2 italic">Performance de Elite</h2>
                            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">A escolha dos infoprodutores que buscam escala real</p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 flex-1 lg:ml-20">
                            {[
                                { value: "R$ 45M+", label: "Venda Processada", sub: "Via Checkouts Integrados" },
                                { value: "1.2ms", label: "Latência Global", sub: "Tempo de Resposta CDN" },
                                { value: "24/7", label: "Suporte VIP", sub: "WhatsApp e Slack" },
                                { value: "100%", label: "Uptime do Player", sub: "Garantido em contrato" }
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="text-2xl md:text-3xl font-black text-brand-primary tracking-tighter">{item.value}</div>
                                    <div className="text-xs font-black text-white uppercase tracking-widest">{item.label}</div>
                                    <div className="text-[10px] text-neutral-600 font-medium">{item.sub}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <MobileShowcase />

            {/* Social Proof */}
            <section className="py-32 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 text-brand-primary font-bold uppercase tracking-widest text-xs mb-4">
                                <Trophy className="w-4 h-4" />
                                Líder em Satisfação
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                                O Player preferido dos <br />
                                <span className="text-brand-primary">7 dígitos</span>
                            </h2>
                            <p className="text-neutral-400 mb-10 text-lg">
                                "Depois que migrei para a Hostfy, meu CTR de vendas aumentou em 14% só pela
                                velocidade de carregamento do VSL no mobile. É bizarro."
                            </p>
                            <div className="flex items-center gap-4">
                                <img src="https://i.pravatar.cc/150?u=1" className="w-16 h-16 rounded-full border-2 border-brand-primary" alt="User" />
                                <div>
                                    <div className="font-bold text-xl">Lucas Alencar</div>
                                    <div className="text-neutral-500 text-sm">Infoprodutor de Alta Escala</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="glass-card p-6 rounded-2xl">
                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
                                    </div>
                                    <p className="text-sm text-neutral-300 italic">"Melhor suporte que já tive em uma plataforma de vídeo."</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Savings Comparison Section */}
            <section className="py-32 relative overflow-hidden bg-pink-premium">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full mb-6">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            <span className="text-xs font-black tracking-widest text-white uppercase">Economia Inteligente</span>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-6">
                            Por que pagar mais pelo <br />
                            <span className="text-white/80">mesmo resultado?</span>
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-lg font-medium">
                            Compare o custo anual para manter sua estrutura de vídeos.
                            O dinheiro que você economiza aqui vira lucro no seu bolso.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8 items-center">
                        <div className="lg:col-span-3 space-y-6">
                            {[
                                { name: "Panda Video", price: 87.90, color: "bg-neutral-700", logo: "🐼" },
                                { name: "VTurb", price: 97.00, color: "bg-neutral-600", logo: "⚡" },
                                { name: "Hostfy", price: 49.00, color: "bg-brand-primary", logo: "🚀", highlight: true }
                            ].map((comp, i) => (
                                <div key={i} className={`glass-card p-6 md:p-8 rounded-[32px] border-white/5 relative group transition-all duration-500 ${comp.highlight ? 'ring-2 ring-brand-primary/50 bg-brand-primary/5' : ''}`}>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{comp.logo}</div>
                                            <div>
                                                <h4 className="font-black text-xl text-white tracking-tight">{comp.name}</h4>
                                                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Plano de Entrada</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 max-w-md hidden md:block px-8">
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${(comp.price / 97) * 100}%` }}
                                                    transition={{ duration: 1, delay: i * 0.2 }}
                                                    className={`h-full ${comp.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm font-bold text-neutral-500">R$ {comp.price.toFixed(2)}/mês</div>
                                            <div className={`text-2xl font-black ${comp.highlight ? 'text-brand-primary' : 'text-white'}`}>
                                                R$ {(comp.price * 12).toFixed(2)} <span className="text-xs text-neutral-500 font-bold">/ano</span>
                                            </div>
                                        </div>
                                    </div>

                                    {comp.highlight && (
                                        <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-widest animate-bounce">
                                            Economia de 50%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-2">
                            <div className="glass-card p-10 rounded-[40px] border-brand-primary/30 bg-brand-primary/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 blur-[60px] group-hover:bg-brand-primary/40 transition-all"></div>
                                <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Veredito do Lucro</h3>
                                <p className="text-neutral-400 leading-relaxed mb-8">
                                    Ao escolher o Hostfy em vez do VTurb, você economiza <span className="text-white font-bold">R$ 576,00 por ano</span> logo no plano inicial.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-emerald-400 font-bold">
                                        <Check className="w-5 h-5" />
                                        Mesma tecnologia Mux de ponta
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-emerald-400 font-bold">
                                        <Check className="w-5 h-5" />
                                        Segurança anti-pirataria total
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-emerald-400 font-bold">
                                        <Check className="w-5 h-5" />
                                        Suporte humano em português
                                    </div>
                                </div>
                                <div className="mt-10 p-6 bg-brand-primary rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Custo por Play no Hostfy</p>
                                    <p className="text-3xl font-black text-white">R$ 0,00</p>
                                    <p className="text-[10px] text-white/50 font-medium">Plays ilimitados nos planos iniciais</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ROI Calculator Section */}
            <section className="py-32 relative overflow-hidden bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 px-4 py-2 rounded-full mb-6">
                            <BarChart3 className="w-4 h-4 text-brand-primary" />
                            <span className="text-xs font-black tracking-widest text-brand-primary uppercase">Calculadora de Lucro Recuperado</span>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-6">
                            Quanto dinheiro você está <br />
                            <span className="text-brand-primary">deixando na mesa?</span>
                        </h2>
                        <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
                            Descubra quanto você pode faturar a mais apenas melhorando a <br />
                            velocidade e a retenção do seu vídeo de vendas.
                        </p>
                    </div>

                    <ROICalculator />
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-6xl font-black mb-8 tracking-tighter">Investimento Transparente</h2>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-12">
                            <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-neutral-500'}`}>Mensal</span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annually' : 'monthly')}
                                className="w-16 h-8 bg-white/5 border border-white/10 rounded-full relative p-1 transition-all hover:border-brand-primary/50"
                            >
                                <motion.div
                                    animate={{ x: billingCycle === 'monthly' ? 0 : 32 }}
                                    className="w-6 h-6 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(232,42,88,0.5)]"
                                />
                            </button>
                            <span className={`text-sm font-bold transition-colors ${billingCycle === 'annually' ? 'text-white' : 'text-neutral-500'}`}>
                                Anual <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-1 border border-emerald-500/20">-20%</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {pricing.map((p, i) => {
                            const price = billingCycle === 'monthly' ? p.price : Math.floor(parseInt(p.price) * 0.8 * 12 / 12);

                            return (
                                <div key={i} className={`relative glass-card p-10 rounded-[40px] flex flex-col transition-all duration-500 hover:translate-y-[-10px] ${p.popular ? 'border-brand-primary/30 bg-brand-primary/[0.03] shadow-[0_20px_80px_rgba(232,42,88,0.15)] z-10' : 'hover:border-white/20'}`}>
                                    {p.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-black tracking-widest py-2 px-6 rounded-full shadow-xl shadow-brand-primary/20 uppercase">
                                            Recomendado
                                        </div>
                                    )}
                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-neutral-400 mb-4 uppercase tracking-widest">{p.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xs font-bold text-neutral-500 mr-1">R$</span>
                                            <span className="text-6xl font-black tracking-tighter">{price}</span>
                                            <span className="text-neutral-600 font-bold ml-1">/mês</span>
                                        </div>
                                        {billingCycle === 'annually' && (
                                            <p className="text-[10px] text-emerald-500 font-bold mt-2 uppercase tracking-widest animate-pulse">Economize R${Math.floor(parseInt(p.price) * 0.2 * 12)} /ano</p>
                                        )}
                                    </div>

                                    <div className="h-px bg-white/5 w-full mb-8"></div>

                                    <ul className="space-y-4 mb-10 flex-1">
                                        {p.features.map((f, j) => (
                                            <li key={j} className="flex items-center gap-3 text-neutral-400 text-sm group/item">
                                                <div className="w-5 h-5 bg-brand-primary/10 rounded-full flex items-center justify-center shrink-0 group-hover/item:bg-brand-primary/20 transition-colors">
                                                    <Check className="w-3 h-3 text-brand-primary" />
                                                </div>
                                                <span className="group-hover/item:text-neutral-200 transition-colors">{f}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {p.checkoutUrl.startsWith('http') ? (
                                        <a href={p.checkoutUrl} target="_blank" rel="noopener noreferrer" className={`w-full py-5 rounded-2xl text-center font-black transition-all text-lg ${p.popular ? 'bg-brand-primary text-white shadow-[0_10px_30px_rgba(232,42,88,0.3)] hover:bg-brand-primary-light active:scale-95' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-95'}`}>
                                            {p.button}
                                        </a>
                                    ) : (
                                        <Link to={p.checkoutUrl} className={`w-full py-5 rounded-2xl text-center font-black transition-all text-lg ${p.popular ? 'bg-brand-primary text-white shadow-[0_10px_30px_rgba(232,42,88,0.3)] hover:bg-brand-primary-light active:scale-95' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-95'}`}>
                                            {p.button}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-32 bg-white/[0.01] relative overflow-hidden border-y border-white/5">
                <div className="absolute top-0 left-0 w-full h-full pink-grid opacity-[0.03]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none opacity-20"></div>

                <div className="max-w-3xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-black text-brand-primary uppercase tracking-[0.3em] mb-4">Dúvidas</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Perguntas Frequentes</h3>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: "Como a Hostfy protege meus vídeos?", a: "Usamos criptografia HLS avançada com restrição de referer e proteção por Edge Runtime. Isso cria uma barreira quase intrasponível para ferramentas de download comuns, garantindo que seu conteúdo só seja visto por quem você autorizou." },
                            { q: "Posso migrar meus vídeos de outras plataformas?", a: "Sim! Você pode fazer o upload dos arquivos originais diretamente no Hostfy. Nosso sistema de processamento via Mux cuidará de tudo para entregar a melhor qualidade com o menor tempo de carregamento possível." },
                            { q: "Existe limite de banda ou visualizações?", a: "Nossos planos são desenhados para escalar. Cada plano possui uma cota generosa de horas de streaming e plays. Caso você faça um lançamento meteorológico e precise de mais, nosso sistema avisa e permite o upgrade instantâneo sem quedas." },
                            { q: "O player é compatível com todos os dispositivos?", a: "100%. O Hostfy foi construído focado em mobile-first. Ele se adapta perfeitamente a qualquer tamanho de tela, garantindo que sua VSL rode com perfeição tanto no iPhone mais novo quanto em computadores antigos." }
                        ].map((item, i) => {
                            const isOpen = openFaqIndex === i;
                            return (
                                <div key={i} className={`glass-card rounded-3xl overflow-hidden transition-all duration-300 border-white/5 ${isOpen ? 'bg-white/[0.05] border-white/10 ring-1 ring-brand-primary/20' : 'hover:bg-white/[0.02]'}`}>
                                    <button
                                        onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                                        className="w-full p-6 text-left flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-brand-primary text-white' : 'bg-white/5 text-neutral-500'}`}>
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <span className={`font-bold transition-colors ${isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{item.q}</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: isOpen ? 180 : 0 }}
                                            className={`transition-colors ${isOpen ? 'text-brand-primary' : 'text-neutral-500'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </motion.div>
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-6 pb-6 pt-2 text-neutral-400 text-sm leading-relaxed ml-12">
                                                    {item.a}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 md:py-40 relative overflow-hidden bg-pink-premium">
                <div className="absolute inset-0 pink-grid opacity-20"></div>
                <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                    <div className="p-12 md:p-24 rounded-[40px] relative overflow-hidden">
                        <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter">
                            Pare de perder <br />
                            <span className="text-white/80 text-glow">vendas</span> hoje
                        </h2>
                        <p className="text-white/70 text-lg md:text-xl max-w-xl mx-auto mb-12 font-bold">
                            Junte-se a mais de 2.000 infoprodutores que escalam seus negócios com a Hostfy.
                        </p>
                        <Link to="/register" className="inline-flex items-center gap-3 bg-white text-brand-primary px-12 py-6 rounded-2xl text-xl font-black shadow-2xl transition-all hover:scale-110 active:scale-95 group">
                            Quero escalar com a Hostfy
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 relative overflow-hidden bg-black">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2 text-center md:text-left">
                            <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
                                    <Play className="w-5 h-5 text-white fill-white" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter">Hostfy<span className="text-brand-primary">.</span></span>
                            </div>
                            <p className="text-neutral-500 text-sm max-w-sm mx-auto md:mx-0 leading-relaxed italic">
                                Protegendo e entregando os vídeos dos maiores infoprodutores do Brasil com tecnologia de ponta e foco total em conversão.
                            </p>
                        </div>

                        <div className="text-center md:text-left">
                            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Produto</h4>
                            <ul className="space-y-4">
                                <li><a href="#features" className="text-neutral-500 hover:text-brand-primary transition-colors text-sm font-medium">Recursos</a></li>
                                <li><a href="#pricing" className="text-neutral-500 hover:text-brand-primary transition-colors text-sm font-medium">Preços</a></li>
                                <li><a href="/login" className="text-neutral-500 hover:text-brand-primary transition-colors text-sm font-medium">Entrar</a></li>
                            </ul>
                        </div>

                        <div className="text-center md:text-left">
                            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Social</h4>
                            <div className="flex gap-4 justify-center md:justify-start">
                                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-brand-primary hover:text-white transition-all transform hover:scale-110"><Globe className="w-5 h-5" /></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-brand-primary hover:text-white transition-all transform hover:scale-110"><Shield className="w-5 h-5" /></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-brand-primary hover:text-white transition-all transform hover:scale-110"><Zap className="w-5 h-5" /></a>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 Hostfy Security. Crafted with heart in Brazil.</p>
                        <div className="flex gap-8">
                            <a href="#" className="text-neutral-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Termos de Uso</a>
                            <a href="#" className="text-neutral-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Privacidade</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
