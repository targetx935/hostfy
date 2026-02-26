import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { CustomPlayer } from '../components/CustomPlayer';
import { ArrowLeft, Check, Copy, Shield, Image as ImageIcon, Loader2, Users, Palette, Settings2, Rocket, Lock, ChevronRight, Star } from 'lucide-react';
import { getPlanSettings } from '../lib/planLimits';

import { useNavigate } from 'react-router-dom';

const Switch = memo(({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out shrink-0 flex items-center ${checked ? 'bg-brand-primary' : 'bg-white/10 border border-white/5'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
));

const LocalSlider = memo(({ label, value, min, max, unit, onChange, title }: any) => {
    const [localValue, setLocalValue] = useState(value);
    const throttleRef = useRef<any>(null);

    // Sync local value when external value changes
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleInput = (e: any) => {
        const val = parseInt(e.target.value);
        setLocalValue(val);

        // Throttle the parent update (and video preview) to ~16fps (60ms)
        // This prevents the "Chrome delay" by not saturating the main thread
        if (!throttleRef.current) {
            throttleRef.current = setTimeout(() => {
                onChange(val);
                throttleRef.current = null;
            }, 60);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm text-neutral-300 mt-2">{label}</label>
                <span className="text-xs text-brand-primary font-medium">{localValue || 0}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={localValue || 0}
                onInput={handleInput}
                onChange={(e: any) => onChange(parseInt(e.target.value))}
                className="w-full cursor-pointer accent-brand-primary"
                title={title}
            />
        </div>
    );
});

export const VideoDetailsView = ({ video, onBack, showToast, onVideoUpdate, userPlan = 'trial' }: any) => {
    const planSettings = getPlanSettings(userPlan);
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [pausedTime, setPausedTime] = useState(0);
    const thumbInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<any>({
        primary_color: '#e82a58',
        autoplay: true,
        show_controls: false,
        pause_off_screen: false,
        cta_enabled: false,
        cta_time_seconds: 5,
        cta_text: 'QUERO GARANTIR MINHA VAGA AGORA',
        cta_url: '',
        auto_loop: false,
        mute_on_start: true,
        corner_radius: 12,
        smart_progress_bar: true,
        play_button_style: 'default',
        watermark_enabled: false,
        watermark_opacity: 30,
        unmute_overlay_enabled: true,
        progress_bar_height: 15,
        exit_intent_pause: false,
        lead_capture_enabled: false,
        lead_capture_time_seconds: 10,
        lead_capture_title: 'Identifique-se para continuar',
        lead_capture_button_text: 'Continuar Assistindo',
        social_proof_enabled: false
    });
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<any>(null);
    const latestSettingsRef = useRef<any>(null);

    const [activeSubView, setActiveSubView] = useState<'main' | 'style' | 'behavior' | 'thumbnail' | 'marketing' | 'security' | 'embed'>('main');

    const finalThumbnailUrl = useMemo(() => video.computed_thumbnail || video.thumbnail_url, [video.computed_thumbnail, video.thumbnail_url]);

    React.useEffect(() => {
        let isMounted = true;
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('video_settings')
                    .select('*')
                    .eq('video_id', video.id)
                    .single();

                if (data && isMounted) {
                    setSettings(data);
                }
            } catch (err) {
                console.log('No settings yet, using defaults.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchSettings();
        return () => {
            isMounted = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [video.id]);

    const persistSettings = useCallback(async (settingsToSave: any) => {
        try {
            const { error } = await supabase
                .from('video_settings')
                .upsert({
                    video_id: video.id,
                    ...settingsToSave
                }, { onConflict: 'video_id' });

            if (error) throw error;
            showToast('Configuração salva!');
        } catch (err: any) {
            console.error('Error saving settings:', err);
            showToast('Erro ao salvar configuração.');
        }
    }, [video.id, showToast]);

    const updateSetting = useCallback((key: string, value: any) => {
        setSettings((prev: any) => {
            const next = { ...prev, [key]: value };
            latestSettingsRef.current = next;
            return next;
        });

        // Side effect outside of updater
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            if (latestSettingsRef.current) {
                persistSettings(latestSettingsRef.current);
            }
        }, 1000);
    }, [persistSettings]);

    const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingThumb(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Format: userId/thumbnails/videoId-timestamp.ext
            const fileExt = file.name.split('.').pop();
            const fileName = `${video.id}-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/thumbnails/${fileName}`;

            showToast('Fazendo upload da capa...');

            // Upload to 'videos' bucket because it already has RLS configured for user uploads
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            // Update videos table
            const { error: updateError } = await supabase
                .from('videos')
                .update({ thumbnail_url: publicUrl })
                .eq('id', video.id);

            if (updateError) throw updateError;

            // Trigger local update so player re-renders with new poster
            if (onVideoUpdate) {
                onVideoUpdate(video.id, { thumbnail_url: publicUrl, computed_thumbnail: publicUrl });
            }
            showToast('Capa do vídeo atualizada com sucesso!');

        } catch (err: any) {
            console.error('Error uploading thumbnail:', err);
            showToast(`Erro no upload: ${err.message || 'Desconhecido'}`);
        } finally {
            setUploadingThumb(false);
            if (thumbInputRef.current) thumbInputRef.current.value = '';
        }
    };

    const handleCaptureFrame = async () => {
        if (!video.url || !video.url.includes('stream.mux.com')) {
            showToast('A captura de frame só funciona em vídeos processados pelo servidor nativo.');
            return;
        }

        try {
            setUploadingThumb(true);
            const match = video.url.match(/stream\.mux\.com\/(.+?)\.m3u8/);
            if (!match || !match[1]) throw new Error("URL inválida do Mux");

            const muxId = match[1];
            // Get thumbnail at the exact paused time with high quality
            const frameUrl = `https://image.mux.com/${muxId}/thumbnail.png?time=${pausedTime}`;

            showToast('Salvando frame como capa...');

            // Update videos table
            const { error: updateError } = await supabase
                .from('videos')
                .update({ thumbnail_url: frameUrl })
                .eq('id', video.id);

            if (updateError) throw updateError;

            if (onVideoUpdate) {
                onVideoUpdate(video.id, { thumbnail_url: frameUrl, computed_thumbnail: frameUrl });
            }
            showToast('Frame do vídeo definido como capa com sucesso!');
        } catch (err: any) {
            console.error('Error capturing frame:', err);
            showToast(`Erro na captura: ${err.message || 'Desconhecido'}`);
        } finally {
            setUploadingThumb(false);
        }
    };

    return (
        <div className="flex flex-col animate-[fadeIn_0.5s_ease-out]">
            <button onClick={onBack} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 w-fit cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Voltar para vídeos
            </button>

            <div className="flex flex-col xl:flex-row gap-8 items-start relative">
                <div className="flex-1 w-full z-10 transition-all duration-300 xl:sticky xl:top-28">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{video.title}</h2>
                            <p className="text-neutral-400 text-sm">Criado em {new Date(video.created_at).toLocaleDateString('pt-BR')} • {video.plays} visualizações</p>
                        </div>
                    </div>

                    <div className="bg-black/60 border border-white/5 rounded-2xl p-4 md:p-8 w-full mb-8">
                        <CustomPlayer
                            videoId={video.id}
                            src={video.url}
                            poster={finalThumbnailUrl}
                            autoplay={settings.autoplay}
                            ctaTime={settings.cta_time_seconds}
                            primaryColor={settings.primary_color}
                            showControls={settings.show_controls}
                            pauseOffScreen={settings.pause_off_screen}
                            ctaEnabled={settings.cta_enabled}
                            ctaText={settings.cta_text}
                            ctaUrl={settings.cta_url}
                            autoLoop={settings.auto_loop}
                            muteOnStart={settings.mute_on_start}
                            cornerRadius={settings.corner_radius}
                            smartProgressBar={settings.smart_progress_bar}
                            playButtonStyle={settings.play_button_style}
                            watermarkEnabled={settings.watermark_enabled}
                            watermarkOpacity={settings.watermark_opacity}
                            unmuteOverlayEnabled={settings.unmute_overlay_enabled}
                            progressBarHeight={settings.progress_bar_height}
                            exitIntentPause={settings.exit_intent_pause}
                            leadCaptureEnabled={settings.lead_capture_enabled}
                            leadCaptureTime={settings.lead_capture_time_seconds}
                            leadCaptureTitle={settings.lead_capture_title}
                            leadCaptureButtonText={settings.lead_capture_button_text}
                            socialProofEnabled={settings.social_proof_enabled}
                            onPause={setPausedTime}
                        />
                    </div>
                </div>

                <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
                    <div className="bg-brand-dark-lighter border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                        {activeSubView === 'main' ? (
                            <>
                                <div className="p-6 border-b border-white/5">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-brand-primary" /> Configurações de Vídeo
                                    </h3>
                                </div>
                                <div className="p-2 space-y-1 overflow-y-auto flex-1">
                                    <button
                                        onClick={() => setActiveSubView('embed')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                                                <Copy className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Incorporar (Embed)</p>
                                                <p className="text-[10px] text-neutral-500">Código para seu site/lms</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>

                                    <button
                                        onClick={() => setActiveSubView('style')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                                <Palette className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Estilo & Aparência</p>
                                                <p className="text-[10px] text-neutral-500">Cores, botões e bordas</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>

                                    <button
                                        onClick={() => setActiveSubView('behavior')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <Settings2 className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Comportamento</p>
                                                <p className="text-[10px] text-neutral-500">Autoplay, controles e loops</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>

                                    <button
                                        onClick={() => setActiveSubView('thumbnail')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                                <ImageIcon className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Capa (Thumbnail)</p>
                                                <p className="text-[10px] text-neutral-500">Imagem de pré-carregamento</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>

                                    <button
                                        onClick={() => setActiveSubView('marketing')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 group-hover:scale-110 transition-transform">
                                                <Rocket className="w-5 h-5 text-brand-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                                    Marketing & Conversão
                                                    {(settings.cta_enabled || settings.lead_capture_enabled || settings.social_proof_enabled) && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-neutral-500">Botões, leads e social proof</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>

                                    <button
                                        onClick={() => setActiveSubView('security')}
                                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                                                <Lock className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Segurança & DRM</p>
                                                <p className="text-[10px] text-neutral-500">Proteção contra pirataria</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                                    </button>
                                </div>
                                <div className="p-4 border-t border-white/5">
                                    <button className="w-full bg-brand-primary hover:bg-brand-primary-light text-white text-sm font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(232,42,88,0.2)] active:scale-95" onClick={() => navigate(`/video/${video.id}/analytics`)}>
                                        Ver Analytics Completo
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
                                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveSubView('main')}
                                        className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                                        {activeSubView === 'style' && 'Estilo & Aparência'}
                                        {activeSubView === 'behavior' && 'Comportamento'}
                                        {activeSubView === 'thumbnail' && 'Capa (Thumbnail)'}
                                        {activeSubView === 'marketing' && 'Marketing'}
                                        {activeSubView === 'security' && 'Segurança & DRM'}
                                    </h3>
                                </div>

                                <div className="p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {activeSubView === 'style' && (
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-3">Estilo do Player</label>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="block text-sm text-neutral-300 mb-2">Cor Principal</label>
                                                                <div className="flex items-center gap-3">
                                                                    <input type="color" value={settings.primary_color} onChange={(e) => updateSetting('primary_color', e.target.value)} className="bg-transparent border-none rounded-md w-12 h-12 cursor-pointer p-0" />
                                                                    <span className="text-sm text-neutral-400 font-mono uppercase bg-white/5 px-2 py-1 rounded border border-white/10">{settings.primary_color}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm text-neutral-300 mb-2">Estilo do Botão Play</label>
                                                                <select
                                                                    value={settings.play_button_style || 'default'}
                                                                    onChange={(e) => updateSetting('play_button_style', e.target.value)}
                                                                    className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-primary outline-none transition-colors cursor-pointer"
                                                                >
                                                                    <option value="default">Clássico Translúcido</option>
                                                                    <option value="solid">Sólido Colorido</option>
                                                                    <option value="pulse">Pulso (Gatilho)</option>
                                                                </select>
                                                            </div>
                                                            <LocalSlider
                                                                label="Bordas Arredondadas"
                                                                value={settings.corner_radius}
                                                                min="0"
                                                                max="48"
                                                                unit="px"
                                                                onChange={(val: number) => updateSetting('corner_radius', val)}
                                                            />
                                                            <LocalSlider
                                                                label="Grossura da Barra"
                                                                value={settings.progress_bar_height}
                                                                min="0"
                                                                max="32"
                                                                unit="px"
                                                                onChange={(val: number) => updateSetting('progress_bar_height', val)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSubView === 'behavior' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-1">
                                                        <span className="text-sm text-neutral-300">Autoplay Inteligente</span>
                                                        <Switch checked={settings.autoplay} onChange={(val: boolean) => updateSetting('autoplay', val)} />
                                                    </div>
                                                    <div className="flex items-center justify-between p-1">
                                                        <span className="text-sm text-neutral-300">Mostrar Controles</span>
                                                        <Switch checked={settings.show_controls} onChange={(val: boolean) => updateSetting('show_controls', val)} />
                                                    </div>
                                                    <div className="flex items-center justify-between p-1">
                                                        <span className="text-sm text-neutral-300">Auto-loop</span>
                                                        <Switch checked={settings.auto_loop} onChange={(val: boolean) => updateSetting('auto_loop', val)} />
                                                    </div>
                                                    <div className="flex items-center justify-between p-1">
                                                        <span className="text-sm text-neutral-300">Mudo no Início</span>
                                                        <Switch checked={settings.mute_on_start} onChange={(val: boolean) => updateSetting('mute_on_start', val)} />
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                                        <div className="flex items-center justify-between group">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-emerald-400 font-bold">Smart Pause (Exit Intent)</span>
                                                                <span className="text-[10px] text-neutral-500">Pausa ao trocar de aba ou sair do vídeo</span>
                                                            </div>
                                                            <Switch checked={settings.exit_intent_pause || false} onChange={(val: boolean) => updateSetting('exit_intent_pause', val)} />
                                                        </div>
                                                        <div className="flex items-center justify-between group">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-indigo-400 font-bold">Overlay de Som</span>
                                                                <span className="text-[10px] text-neutral-500">Exige clique para ouvir (Retenção VSL)</span>
                                                            </div>
                                                            <Switch checked={settings.unmute_overlay_enabled || false} onChange={(val: boolean) => updateSetting('unmute_overlay_enabled', val)} />
                                                        </div>
                                                        <div className="flex items-center justify-between group">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-amber-400 font-bold">Progresso Inteligente</span>
                                                                <span className="text-[10px] text-neutral-500">Acelera no início para prender atenção</span>
                                                            </div>
                                                            <Switch checked={settings.smart_progress_bar} onChange={(val: boolean) => updateSetting('smart_progress_bar', val)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSubView === 'thumbnail' && (
                                                <div className="space-y-6">
                                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                        {finalThumbnailUrl ? (
                                                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10 relative group">
                                                                <img src={finalThumbnailUrl} alt="Atual" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <p className="text-xs text-white font-bold">Capa Atual</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center border-2 border-dashed border-white/10">
                                                                <ImageIcon className="w-8 h-8 text-neutral-700" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="file"
                                                        hidden
                                                        ref={thumbInputRef}
                                                        accept="image/png, image/jpeg, image/webp"
                                                        onChange={handleThumbnailUpload}
                                                        disabled={uploadingThumb}
                                                    />

                                                    <div className="space-y-3">
                                                        <button
                                                            onClick={() => thumbInputRef.current?.click()}
                                                            disabled={uploadingThumb}
                                                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 group"
                                                        >
                                                            {uploadingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                                            Fazer Upload de Imagem
                                                        </button>

                                                        {video.url?.includes('stream.mux.com') && (
                                                            <button
                                                                onClick={handleCaptureFrame}
                                                                disabled={uploadingThumb}
                                                                className="w-full bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary hover:text-white font-bold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                                Usar frame atual ({Math.floor(pausedTime / 60)}:{Math.floor(pausedTime % 60).toString().padStart(2, '0')})
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSubView === 'marketing' && (
                                                <div className="space-y-6">
                                                    {/* CTA Section */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-white uppercase tracking-wider">Botão de Chamada (CTA)</span>
                                                            <Switch checked={settings.cta_enabled || false} onChange={(val: boolean) => updateSetting('cta_enabled', val)} />
                                                        </div>

                                                        {settings.cta_enabled && (
                                                            <div className="space-y-4 animate-[slideDown_0.3s_ease-out]">
                                                                <div>
                                                                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5 ml-1">Aparecer em (segundos)</label>
                                                                    <input type="number" value={settings.cta_time_seconds || 0} onChange={(e) => updateSetting('cta_time_seconds', parseInt(e.target.value) || 0)} className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-primary outline-none transition-colors" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5 ml-1">Texto do Botão</label>
                                                                    <input type="text" value={settings.cta_text || ''} onBlur={(e) => updateSetting('cta_text', e.target.value)} onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })} className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-primary outline-none transition-colors" placeholder="EX: GARANTIR VAGA AGORA" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5 ml-1">Link de Destino</label>
                                                                    <input type="url" value={settings.cta_url || ''} onBlur={(e) => updateSetting('cta_url', e.target.value)} onChange={(e) => setSettings({ ...settings, cta_url: e.target.value })} className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-primary outline-none transition-colors" placeholder="https://..." />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* social proof */}
                                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                                                <Users className="w-3.5 h-3.5 text-brand-primary" /> Social Proof (Ao Vivo)
                                                                {!planSettings.features.socialProof && <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-500">Mostra "X pessoas assistindo" agora</span>
                                                        </div>
                                                        <Switch
                                                            checked={settings.social_proof_enabled || false}
                                                            onChange={(val: boolean) => {
                                                                if (!planSettings.features.socialProof) {
                                                                    showToast('Social Proof é um recurso exclusivo do plano PRO.');
                                                                    return;
                                                                }
                                                                updateSetting('social_proof_enabled', val);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* lead capture */}
                                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                                                    Lead Capture (Email Gate)
                                                                    {!planSettings.features.leadCapture && <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />}
                                                                </span>
                                                                <span className="text-[10px] text-neutral-500">Trava o vídeo e pede o e-mail</span>
                                                            </div>
                                                            <Switch
                                                                checked={settings.lead_capture_enabled || false}
                                                                onChange={(val: boolean) => {
                                                                    if (!planSettings.features.leadCapture) {
                                                                        showToast('Lead Capture é um recurso exclusivo do plano PRO.');
                                                                        return;
                                                                    }
                                                                    updateSetting('lead_capture_enabled', val);
                                                                }}
                                                            />
                                                        </div>

                                                        {settings.lead_capture_enabled && (
                                                            <div className="space-y-4 animate-[slideDown_0.3s_ease-out]">
                                                                <div>
                                                                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5 ml-1">Pausa aos (segundos)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={settings.lead_capture_time_seconds}
                                                                        onChange={(e) => updateSetting('lead_capture_time_seconds', parseInt(e.target.value) || 0)}
                                                                        className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-primary outline-none transition-colors"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5 ml-1">Título do Gancho</label>
                                                                    <input
                                                                        type="text"
                                                                        value={settings.lead_capture_title}
                                                                        onChange={(e) => updateSetting('lead_capture_title', e.target.value)}
                                                                        className="w-full bg-brand-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-primary outline-none transition-colors"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSubView === 'security' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex flex-col pr-4">
                                                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                                                    Marca d'Água Pro (Anti-Pirataria)
                                                                    {!planSettings.features.advancedAnalytics && <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />}
                                                                </span>
                                                                <span className="text-[10px] text-neutral-500 mt-1">Exibe o e-mail ou IP do espectador flutuando na tela para inibir gravações ilegais.</span>
                                                            </div>
                                                            <Switch
                                                                checked={settings.watermark_enabled || false}
                                                                onChange={(val: boolean) => {
                                                                    if (!planSettings.features.advancedAnalytics) {
                                                                        showToast('Marca d\'Água dinâmica exige plano PRO.');
                                                                        return;
                                                                    }
                                                                    updateSetting('watermark_enabled', val);
                                                                }}
                                                            />
                                                        </div>

                                                        {settings.watermark_enabled && (
                                                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                                                <LocalSlider
                                                                    label="Opacidade"
                                                                    value={settings.watermark_opacity}
                                                                    min="10"
                                                                    max="100"
                                                                    unit="%"
                                                                    onChange={(val: number) => updateSetting('watermark_opacity', val)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                                        <div className="flex gap-3">
                                                            <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Proteção Hostfy Ativa</p>
                                                                <p className="text-[10px] text-neutral-400">Este vídeo possui criptografia HLS AES-128 e bloqueio de domínio ativado por padrão.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {activeSubView === 'embed' && (
                                                <div className="space-y-6">
                                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <h4 className="text-xs font-bold text-white mb-3">Iframe (Padrão)</h4>
                                                        <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col gap-3">
                                                            <code className="text-[10px] text-brand-primary break-all leading-relaxed bg-black/50 p-2 rounded">
                                                                {`<iframe src="${window.location.origin}/?embed=${video.id}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" style="aspect-ratio: 16/9; width: 100%; height: auto; border-radius: ${settings.corner_radius || 0}px; overflow: hidden;"></iframe>`}
                                                            </code>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`<iframe src="${window.location.origin}/?embed=${video.id}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" style="aspect-ratio: 16/9; width: 100%; height: auto; border-radius: ${settings.corner_radius || 0}px; overflow: hidden;"></iframe>`);
                                                                    setCopied(true);
                                                                    showToast('Código copiado!');
                                                                    setTimeout(() => setCopied(false), 2000);
                                                                }}
                                                                className="flex items-center justify-center gap-2 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-brand-primary/20"
                                                            >
                                                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                {copied ? 'Copiado!' : 'Copiar Código'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                                                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                                                            <strong className="text-brand-primary">Dica:</strong> O código acima já inclui o arredondamento de bordas que você definiu na aba <span className="text-white cursor-pointer hover:underline" onClick={() => setActiveSubView('style')}>Estilo</span>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
