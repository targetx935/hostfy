import { Trophy, BarChart2, Users, Copy } from 'lucide-react';

export const PartnersView = () => (
    <div className="flex flex-col animate-[fadeIn_0.5s_ease-out]">
        <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Programa de Parceiros Hostfy</h2>
            <p className="text-neutral-400">Recomende o Hostfy e ganhe comissões recorrentes. Nossa tecnologia de ponta, agora gerando renda para você.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-brand-dark-lighter border border-brand-primary/20 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent"></div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4 border border-brand-primary/20 group-hover:scale-110 transition-transform">
                        <Trophy className="w-6 h-6 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">30% de Comissão</h3>
                    <p className="text-sm text-neutral-400">Receba 30% do valor de cada assinatura dos seus indicados, todos os meses, enquanto eles forem clientes.</p>
                </div>
            </div>

            <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <BarChart2 className="w-6 h-6 text-neutral-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Dashboard Exclusivo</h3>
                <p className="text-sm text-neutral-400">Acompanhe seus cliques, conversões e o histórico de todos os seus pagamentos em tempo real.</p>
            </div>

            <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <Users className="w-6 h-6 text-neutral-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Material de Apoio</h3>
                <p className="text-sm text-neutral-400">Acesse banners, templates de email e criativos de alta conversão para facilitar suas vendas.</p>
            </div>
        </div>

        <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Seu Link de Indicação</h3>
            <p className="text-sm text-neutral-400 mb-6">Compartilhe este link com sua audiência para começar a ser comissionado pelas vendas.</p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg p-3 flex items-center">
                    <code className="text-brand-primary font-medium w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        https://hostfy.com/p/vitor-alpha
                    </code>
                </div>
                <button className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg whitespace-nowrap">
                    <Copy className="w-4 h-4" />
                    Copiar Link
                </button>
            </div>
        </div>

        <div className="text-center mt-12 mb-8">
            <h3 className="text-lg text-white font-medium mb-2">Ainda não é um parceiro aprovado?</h3>
            <p className="text-neutral-400 mb-6">Inscreva-se agora no nosso programa de afiliados e aguarde a aprovação da nossa equipe.</p>
            <button className="bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-10 rounded-lg transition-all cursor-pointer shadow-[0_0_20px_rgba(232,42,88,0.3)] hover:shadow-[0_0_30px_rgba(232,42,88,0.5)] transform hover:-translate-y-1">
                QUERO SER PARCEIRO
            </button>
        </div>
    </div>
);
