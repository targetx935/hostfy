import { ShieldAlert, CreditCard, Clock, LogOut, MessageSquare } from 'lucide-react';
import type { UserProfile } from '../lib/planLimits';

interface SubscriptionWallProps {
    profile: UserProfile | null;
    onSignOut: () => void;
}

export const SubscriptionWall = ({ profile, onSignOut }: SubscriptionWallProps) => {
    const isExpired = profile?.subscription_status === 'trialing';
    // Removed isUnpaid check as it's not currently used for specific UI variations

    return (
        <div className="fixed inset-0 bg-brand-dark z-[100] flex items-center justify-center p-6 md:p-10 font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-dark to-brand-dark pointer-events-none"></div>

            <div className="w-full max-w-2xl bg-brand-dark-lighter border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl animate-[fadeIn_0.5s_ease-out]">
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/20 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-primary/20 shadow-[0_0_30px_rgba(232,42,88,0.2)]">
                        {isExpired ? (
                            <Clock className="w-10 h-10 text-brand-primary" />
                        ) : (
                            <ShieldAlert className="w-10 h-10 text-brand-primary" />
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight uppercase italic">
                        {isExpired ? 'Seu período de teste expirou' : 'Assinatura Pendente'}
                    </h1>

                    <p className="text-neutral-400 text-lg mb-10 max-w-md leading-relaxed">
                        {isExpired
                            ? 'Esperamos que tenha gostado da Hostfy! Para continuar hospedando seus vídeos e acessando o dashboard, escolha um plano abaixo.'
                            : 'Identificamos um problema com sua assinatura. Regularize seu pagamento para recuperar o acesso completo à sua conta.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
                        <button className="flex items-center justify-center gap-3 bg-brand-primary hover:bg-brand-primary-light text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                            <CreditCard className="w-5 h-5" />
                            REATIVAR CONTA AGORA
                        </button>
                        <button className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl border border-white/10 transition-all">
                            <MessageSquare className="w-5 h-5" />
                            Falar com Suporte
                        </button>
                    </div>

                    <div className="w-full border-t border-white/5 pt-8 flex items-center justify-between gap-4">
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Status da Conta</span>
                            <span className="text-sm font-bold text-red-400 uppercase tracking-tight">Bloqueada por Inatividade</span>
                        </div>

                        <button
                            onClick={onSignOut}
                            className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair da conta
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating badges for trust */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-30 select-none hidden md:flex">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Pagamento Seguro SSL</span>
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Hospedagem Hostfy Security</span>
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">7 Dias de Garantia</span>
            </div>
        </div>
    );
};
