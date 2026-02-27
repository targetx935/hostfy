import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import Hls from 'hls.js';
import { Play, VolumeX, Volume2, RotateCcw } from 'lucide-react';

interface CustomPlayerProps {
    videoId?: string;
    src: string;
    poster?: string;
    autoplay?: boolean;
    ctaTime?: number; // Time in seconds to show the CTA
    primaryColor?: string;
    showControls?: boolean;
    pauseOffScreen?: boolean;
    ctaEnabled?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    autoLoop?: boolean;
    muteOnStart?: boolean;
    cornerRadius?: number;
    smartProgressBar?: boolean;
    playButtonStyle?: string;
    watermarkEnabled?: boolean;
    watermarkOpacity?: number;
    unmuteOverlayEnabled?: boolean;
    progressBarHeight?: number;
    exitIntentPause?: boolean;
    // Lead Capture
    leadCaptureEnabled?: boolean;
    leadCaptureTime?: number;
    leadCaptureTitle?: string;
    leadCaptureButtonText?: string;
    // Social Proof
    socialProofEnabled?: boolean;
    onCtaClick?: () => void;
    onPause?: (currentTime: number) => void;
    resumeOverlayColor?: string;
    exitIntentOverlayEnabled?: boolean;
    smartStartEnabled?: boolean;
    smartStartSpeed?: number;
}

export const CustomPlayer = memo(({
    videoId,
    src,
    poster,
    autoplay = false,
    ctaTime,
    primaryColor = '#e82a58',
    showControls = true,
    pauseOffScreen = false,
    ctaEnabled = false,
    ctaText = 'QUERO GARANTIR MINHA VAGA AGORA',
    ctaUrl = '',
    autoLoop = false,
    muteOnStart = true,
    cornerRadius = 12,
    smartProgressBar = false,
    playButtonStyle = 'default',
    watermarkEnabled = false,
    watermarkOpacity = 30,
    unmuteOverlayEnabled = false,
    progressBarHeight = 15,
    exitIntentPause = false,
    leadCaptureEnabled = false,
    leadCaptureTime = 10,
    leadCaptureTitle = 'Identifique-se para continuar',
    leadCaptureButtonText = 'Continuar Assistindo',
    socialProofEnabled = false,
    onCtaClick,
    onPause,
    resumeOverlayColor = '',
    exitIntentOverlayEnabled = false,
    smartStartEnabled = false,
    smartStartSpeed = 1.25
}: CustomPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(muteOnStart);
    const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(muteOnStart && autoplay);
    const [showCta, setShowCta] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [showExitIntentOverlay, setShowExitIntentOverlay] = useState(false);
    const maxTimeWatchedRef = useRef(0);
    const lastPingSecondRef = useRef(-1);
    const smartStartTriggeredRef = useRef(false);

    // Lead Capture State
    const [isLeadCaptureVisible, setIsLeadCaptureVisible] = useState(false);
    const [leadEmail, setLeadEmail] = useState('');
    const [leadName, setLeadName] = useState('');
    const [isLeadSubmitted, setIsLeadSubmitted] = useState(false);

    // Social Proof State
    const [socialProofCount, setSocialProofCount] = useState(Math.floor(Math.random() * 50) + 80);

    // Watermark State
    const [watermarkText, setWatermarkText] = useState('Hostfy Protected');
    const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });

    // Watermark Initialization & Movement Logic
    useEffect(() => {
        if (!watermarkEnabled) return;

        // Try to capture viewer identifier from URL parameters
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email');
        const cpf = params.get('cpf');
        const id = params.get('id');

        if (email) setWatermarkText(email);
        else if (cpf) setWatermarkText(cpf);
        else if (id) setWatermarkText(`ID: ${id}`);
        else setWatermarkText('Protected Content');

        // Randomize position every 4 seconds
        const moveWatermark = () => {
            const top = Math.floor(Math.random() * 80) + 10; // 10% to 90%
            const left = Math.floor(Math.random() * 80) + 10;
            setWatermarkPos({ top: `${top}%`, left: `${left}%` });
        };

        moveWatermark(); // Initial random position
        const interval = setInterval(moveWatermark, 4000);

        return () => clearInterval(interval);
    }, [watermarkEnabled]);

    // Resume Playback Logic (LocalStorage)
    useEffect(() => {
        if (!videoId || !videoRef.current) return;

        const savedTime = localStorage.getItem(`hostfy_resume_${videoId}`);
        if (savedTime) {
            const time = parseFloat(savedTime);
            // Only show prompt if they watched more than 5 seconds and less than 95% of the video
            // (We check duration later when metadata loads, for now just show if time > 5)
            if (time > 5) {
                setShowResumePrompt(true);
            }
        }
    }, [videoId]);

    const handleResume = (resume: boolean) => {
        setShowResumePrompt(false);
        if (resume && videoRef.current && videoId) {
            const savedTime = localStorage.getItem(`hostfy_resume_${videoId}`);
            if (savedTime) {
                videoRef.current.currentTime = parseFloat(savedTime);
                videoRef.current.play();
                setIsPlaying(true);
                setIsMuted(false);
                videoRef.current.muted = false;
            }
        } else if (!resume && videoRef.current) {
            if (videoId) localStorage.removeItem(`hostfy_resume_${videoId}`);
            videoRef.current.currentTime = 0;
            videoRef.current.play();
            setIsPlaying(true);
            setIsMuted(false);
            videoRef.current.muted = false;
        }
    };

    // Initialize tracking session ID
    useEffect(() => {
        if (!videoId) return;
        // Generate a random session ID for this playback instance
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);

        // Hide resume prompt if it's a new session and we don't have saved time
        // Actually, the useEffect at line 121 handles this.
    }, [videoId]);

    // Create initial session record in DB
    useEffect(() => {
        if (!sessionId || !videoId) return;
        import('../lib/supabase').then(({ supabase }) => {
            const createSession = async () => {
                await supabase.from('video_sessions').insert({
                    id: sessionId,
                    video_id: videoId,
                    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                });
            };
            createSession();
        });
    }, [videoId]);

    // HLS & Smart Autoplay Logic
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        let hls: Hls | null = null;

        const setupAutoplay = () => {
            if (autoplay) {
                video.muted = true; // Must be muted for autoplay to work in modern browsers
                video.play().catch(error => console.log("Autoplay was prevented:", error));
                setIsPlaying(true);
            }
        };

        if (Hls.isSupported() && src?.includes('m3u8')) {
            hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, setupAutoplay);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari Native Support
            video.src = src;
            video.addEventListener('loadedmetadata', setupAutoplay);
        } else {
            // Fallback for MP4
            video.src = src;
            setupAutoplay();
        }

        return () => {
            if (hls) hls.destroy();
            video.removeEventListener('loadedmetadata', setupAutoplay);
        };
    }, [autoplay, src]);

    // Smart Pause Off Screen Logic (Intersection Observer)
    useEffect(() => {
        if (!pauseOffScreen || !videoRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (videoRef.current && !entry.isIntersecting && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                    if (onPause) onPause(videoRef.current.currentTime);
                }
            },
            { threshold: 0.3 }
        );

        const el = videoRef.current;
        observer.observe(el);
        return () => observer.unobserve(el);
    }, [pauseOffScreen, onPause]);

    // Smart Pause Exit Intent Logic (Focus/Blur & MouseLeave)
    useEffect(() => {
        if (!exitIntentPause || !videoRef.current) return;

        const handleExitIntent = () => {
            if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
                if (exitIntentOverlayEnabled) setShowExitIntentOverlay(true);
                if (onPause) onPause(videoRef.current.currentTime);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleExitIntent();
        };

        const handleMouseLeave = (e: MouseEvent) => {
            // Only trigger if mouse moves towards the top (browser chrome)
            if (e.clientY <= 0) handleExitIntent();
        };

        window.addEventListener('blur', handleExitIntent);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('blur', handleExitIntent);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [exitIntentPause, onPause]);

    // Smart Start Logic (Initial Acceleration)
    useEffect(() => {
        if (!smartStartEnabled || !isPlaying || !videoRef.current || smartStartTriggeredRef.current) return;

        const video = videoRef.current;
        const duration = video.duration || 0;

        // Speed up if we are in the first 30 seconds OR first 10% of the video
        if (currentTime < 30 || (duration > 0 && currentTime < duration * 0.1)) {
            video.playbackRate = smartStartSpeed;
            // No feedback to UI to keep it "stealthy" and effective
        } else {
            video.playbackRate = 1.0;
            smartStartTriggeredRef.current = true; // Only do this once per load
        }
    }, [isPlaying, currentTime, smartStartEnabled, smartStartSpeed]);

    // Social Proof Fluctuation
    useEffect(() => {
        if (!socialProofEnabled || !isPlaying) return;

        const interval = setInterval(() => {
            setSocialProofCount(prev => {
                const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
                return Math.max(1, prev + change);
            });
        }, 15000); // Every 15 seconds

        return () => clearInterval(interval);
    }, [socialProofEnabled, isPlaying]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                if (onPause) onPause(videoRef.current.currentTime);
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent playing/pausing when clicking mute
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
            setShowUnmuteOverlay(false); // Hide unmute overlay if user interacts
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            setCurrentTime(time);

            // CTA Logic
            if (ctaEnabled && ctaTime && time >= ctaTime && !showCta) {
                setShowCta(true);
                // POSTMESSAGE: Sincronização de CTA Externo (Vturb Feature)
                // Dispara um evento para a página avó (onde o iframe está embedado)
                try {
                    window.parent.postMessage({
                        type: 'HOSTFY_CTA_SHOW',
                        videoId: videoId,
                        time: time
                    }, '*');
                } catch (e) { /* fallback invisível */ }
            }

            // Lead Capture Logic
            if (leadCaptureEnabled && leadCaptureTime && time >= leadCaptureTime && !isLeadSubmitted && !isLeadCaptureVisible) {
                videoRef.current?.pause();
                setIsPlaying(false);
                setIsLeadCaptureVisible(true);
            }

            const currentSecond = Math.floor(time);
            if (time > maxTimeWatchedRef.current) {
                maxTimeWatchedRef.current = time;

                if (sessionId && currentSecond > 0 && currentSecond % 5 === 0 && currentSecond !== lastPingSecondRef.current) {
                    lastPingSecondRef.current = currentSecond;
                    import('../lib/supabase').then(({ supabase }) => {
                        const updateRetention = async () => {
                            await supabase.from('video_sessions').update({
                                max_time_watched: time
                            }).eq('id', sessionId);

                            if (videoId) {
                                await supabase.from('video_retention_points').insert({
                                    session_id: sessionId,
                                    video_id: videoId,
                                    second_watched: currentSecond
                                });
                            }
                        };
                        updateRetention();
                    });
                }
            }

            // Save to localStorage for Resume Playback feature (every 2 seconds)
            if (videoId && Math.floor(time) % 2 === 0) {
                // Don't save if we are at the very end
                if (videoRef.current.duration && time > videoRef.current.duration - 2) {
                    localStorage.removeItem(`hostfy_resume_${videoId}`);
                } else {
                    localStorage.setItem(`hostfy_resume_${videoId}`, time.toString());
                }
            }
        }
    };

    const handleCtaClick = () => {
        if (sessionId) {
            import('../lib/supabase').then(({ supabase }) => {
                const trackClick = async () => {
                    await supabase.from('video_sessions').update({
                        cta_clicked: true
                    }).eq('id', sessionId);
                };
                trackClick();
            });
        }
        if (onCtaClick) onCtaClick();
        if (ctaUrl) {
            window.open(ctaUrl, '_blank');
        }
    }

    // Prevent seeking/skipping
    const handleSeeking = () => {
        // A simple way to prevent seeking is to force the time back 
        // For a true VSL player, we track max time watched, but for MVP:
        // We will just disable the native controls entirely.
    };

    const progressBarWidth = useMemo(() => {
        if (!videoRef.current || !videoRef.current.duration) return 0;
        const realProgress = currentTime / videoRef.current.duration;
        if (smartProgressBar) {
            const visualProgress = Math.pow(realProgress, 0.45);
            return visualProgress * 100;
        }
        return realProgress * 100;
    }, [currentTime, smartProgressBar]);

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadEmail || !videoId) return;

        try {
            const { supabase } = await import('../lib/supabase');

            // Get user_id of the video owner
            const { data: videoData } = await supabase.from('videos').select('user_id').eq('id', videoId).single();

            if (videoData) {
                await supabase.from('video_leads').insert({
                    video_id: videoId,
                    user_id: videoData.user_id,
                    email: leadEmail,
                    name: leadName
                });

                // Create a notification for the video owner
                await supabase.from('notifications').insert({
                    user_id: videoData.user_id,
                    title: '🔥 Novo Lead Capturado!',
                    message: `O e-mail ${leadEmail} acabou de ser capturado no vídeo "${videoId}".`,
                    type: 'success',
                    link: '/leads'
                });
            }

            setIsLeadSubmitted(true);
            setIsLeadCaptureVisible(false);
            videoRef.current?.play();
            setIsPlaying(true);
        } catch (err) {
            console.error('Error submitting lead:', err);
        }
    };

    return (
        <div
            className="relative group w-full h-full bg-black overflow-hidden flex items-center justify-center"
            style={{ borderRadius: `${cornerRadius}px` }}
        >
            <div
                className="relative w-full h-full aspect-video bg-transparent overflow-hidden cursor-pointer group shadow-2xl shadow-emerald-900/10"
                style={{ borderRadius: `${cornerRadius}px` }}
                onClick={togglePlay}
            >
                <video
                    ref={videoRef}
                    poster={poster}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onSeeking={handleSeeking}
                    loop={autoLoop}
                    muted={muteOnStart}
                    playsInline
                    disablePictureInPicture
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onContextMenu={(e) => e.preventDefault()} // Basic protection against right-click save
                    onDragStart={(e) => e.preventDefault()}
                />

                {/* DRM Anti-Piracy Watermark */}
                {watermarkEnabled && isPlaying && (
                    <div
                        className="absolute pointer-events-none select-none text-white font-mono text-xs md:text-sm font-bold tracking-widest drop-shadow-md z-20 mix-blend-overlay transition-all duration-[3000ms] ease-linear whitespace-nowrap"
                        style={{
                            top: watermarkPos.top,
                            left: watermarkPos.left,
                            opacity: watermarkOpacity / 100,
                            textShadow: '0px 0px 4px rgba(0,0,0,0.8)'
                        }}
                    >
                        {watermarkText}
                    </div>
                )}

                {/* Resume Playback Prompt Overlay (High Conversion Vturb Style) */}
                {showResumePrompt && !isPlaying && (
                    <div
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]"
                        style={{ backgroundColor: resumeOverlayColor || primaryColor }}
                    >
                        <h2 className="text-white font-black text-2xl md:text-5xl mb-12 drop-shadow-xl text-center px-6">
                            Você já começou a assistir esse vídeo
                        </h2>

                        <div className="flex flex-row items-center justify-center gap-8 md:gap-16">
                            {/* Continue Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleResume(true); }}
                                className="group flex flex-col items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 border-white flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-2xl">
                                    <Play className="w-8 h-8 md:w-12 md:h-12 text-white fill-white ml-1" />
                                </div>
                                <span className="text-white font-bold text-sm md:text-xl drop-shadow-md">Continuar assistindo?</span>
                            </button>

                            {/* Restart Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleResume(false); }}
                                className="group flex flex-col items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 border-white flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-2xl">
                                    <RotateCcw className="w-8 h-8 md:w-12 md:h-12 text-white" strokeWidth={2.5} />
                                </div>
                                <span className="text-white font-bold text-sm md:text-xl drop-shadow-md">Assistir do início?</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Exit Intent Overlay (High Conversion) */}
                {showExitIntentOverlay && !isPlaying && (
                    <div
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]"
                        style={{ backgroundColor: resumeOverlayColor || primaryColor }}
                    >
                        <h2 className="text-white font-black text-2xl md:text-5xl mb-12 drop-shadow-xl text-center px-6">
                            Não vá embora! Continue assistindo...
                        </h2>

                        <div className="flex flex-col items-center justify-center gap-8">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowExitIntentOverlay(false); videoRef.current?.play(); setIsPlaying(true); }}
                                className="group flex flex-col items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-2xl animate-pulse">
                                    <Play className="w-10 h-10 md:w-16 md:h-16 text-white fill-white ml-2" />
                                </div>
                                <span className="text-white font-black text-lg md:text-2xl drop-shadow-md uppercase tracking-tighter">Clique para Continuar</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Smart Autoplay Gigante (Botão Pulsante VSL) */}
                {isPlaying && isMuted && unmuteOverlayEnabled && showUnmuteOverlay && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 cursor-pointer" onClick={toggleMute}>
                        <div
                            className="relative overflow-hidden w-[90%] max-w-[600px] rounded-[24px] border-2 border-white/40 p-6 md:p-8 flex flex-col items-center justify-center text-center animate-pulse transform hover:scale-105 transition-transform duration-300"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 0 50px ${primaryColor}66` // 66 is alpha for ~40% opacity
                            }}
                        >
                            {/* Glossy sheen effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/10"></div>

                            <h2 className="relative z-10 text-white font-extrabold text-xl md:text-3xl mb-1 md:mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wide">
                                Seu vídeo já começou
                            </h2>

                            <div className="relative z-10 flex items-center justify-center my-2 md:my-4">
                                <VolumeX className="w-20 h-20 md:w-32 md:h-32 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]" strokeWidth={1.5} />
                            </div>

                            <p className="relative z-10 text-white font-bold text-lg md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wide">
                                Clique para ouvir
                            </p>
                        </div>
                    </div>
                )}

                {/* Big Play Button Overlay (when paused manually) */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 transition-all z-10">
                        <div className="relative group/play flex items-center justify-center cursor-pointer" onClick={togglePlay}>
                            {playButtonStyle === 'pulse' && (
                                <div className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover/play:opacity-70 transition-opacity duration-500 animate-pulse" style={{ backgroundColor: primaryColor }}></div>
                            )}

                            {/* Actual button */}
                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover/play:scale-105 
                                ${playButtonStyle === 'default' ? 'bg-black/60 border border-white/20' : ''}`}
                                style={playButtonStyle !== 'default' ? { backgroundColor: primaryColor } : {}}
                            >
                                <Play className={`w-10 h-10 ml-2 drop-shadow-lg ${playButtonStyle === 'default' ? '' : 'text-white'}`} style={playButtonStyle === 'default' ? { color: primaryColor } : {}} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Controls Bar (minimal) */}
                {showControls && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:opacity-80 transition-opacity" style={{ color: isPlaying ? 'white' : primaryColor }}>
                            {isPlaying ? <span className="font-bold text-sm tracking-wider">PAUSE</span> : <Play className="w-5 h-5" />}
                        </button>
                        <button onClick={toggleMute} className="text-white hover:opacity-80 transition-opacity">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                )}

                {/* Overlay CTA Section that appears after Delay */}
                {ctaEnabled && (
                    <div
                        className={`absolute bottom-6 left-0 right-0 w-full max-w-xl mx-auto px-4 transition-all duration-1000 transform ease-out z-40 
                       ${showCta ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}
                    >
                        <div className="group/cta relative">
                            {/* Pulsing rings effect */}
                            <div className="absolute inset-0 rounded-2xl animate-[ping_3s_infinite] opacity-20 pointer-events-none scale-110" style={{ backgroundColor: primaryColor }}></div>
                            <div className="absolute inset-0 rounded-2xl animate-[ping_4s_infinite] opacity-10 pointer-events-none scale-125 delay-1000" style={{ backgroundColor: primaryColor }}></div>

                            <div className="absolute -inset-1 rounded-2xl blur opacity-30 group-hover/cta:opacity-60 transition duration-1000 group-hover/cta:duration-200" style={{ backgroundColor: primaryColor }}></div>

                            <a
                                href={ctaUrl || '#'}
                                target={ctaUrl ? '_blank' : '_self'}
                                rel="noreferrer"
                                className="relative w-full text-white font-black text-xl md:text-2xl py-4 md:py-5 px-6 rounded-2xl text-center shadow-2xl cursor-pointer transition-all active:scale-[0.98] border border-white/20 flex flex-col items-center justify-center gap-1 block hover:brightness-110 hover:-translate-y-0.5 overflow-hidden"
                                style={{ backgroundColor: primaryColor }}
                                onClick={handleCtaClick}
                            >
                                {/* Internal shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/cta:animate-[shimmer_1.5s_infinite]"></div>

                                <span className="relative z-10 drop-shadow-md">{ctaText || 'QUERO GARANTIR MINHA VAGA AGORA'}</span>
                            </a>
                        </div>
                    </div>
                )}

                {/* Fake Progress Bar (Visual only, not click-to-seek) */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-white/20 z-50 overflow-hidden"
                    style={{ height: `${progressBarHeight}px` }}
                >
                    <div
                        className="h-full ease-linear origin-left"
                        style={{
                            transform: `scaleX(${progressBarWidth / 100})`,
                            backgroundColor: primaryColor,
                            width: '100%'
                        }}
                    />
                </div>
            </div>

            {/* Watermark */}
            {watermarkEnabled && (
                <div
                    className="absolute top-4 right-4 text-white/50 text-xs font-bold select-none pointer-events-none z-20 transition-opacity flex items-center gap-1"
                    style={{ opacity: watermarkOpacity / 100 }}
                >
                    <div className="w-1 h-1 bg-brand-primary rounded-full"></div>
                    HOSTFY SEGURANÇA
                </div>
            )}

            {/* Social Proof Toast */}
            {socialProofEnabled && isPlaying && !showUnmuteOverlay && !isLeadCaptureVisible && (
                <div className="absolute bottom-6 left-6 z-30 animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-4 group/social">
                        <div className="relative flex items-center justify-center">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                            <div className="w-3 h-3 bg-emerald-500 rounded-full relative border-2 border-white/20"></div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-white text-[11px] font-black uppercase tracking-widest leading-none mb-0.5">
                                <span className="text-emerald-400">{socialProofCount}</span> online agora
                            </p>
                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider leading-none">
                                Assistindo ao vivo
                            </p>
                        </div>
                        <div className="ml-2 bg-white/10 p-1.5 rounded-lg opacity-50 group-hover/social:opacity-100 transition-opacity">
                            <Volume2 className="w-3 h-3 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Capture Overlay */}
            {isLeadCaptureVisible && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-primary/30">
                            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{leadCaptureTitle}</h3>
                        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">Insira seus dados para liberar o restante do conteúdo.</p>

                        <form onSubmit={handleLeadSubmit} className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Seu nome (opcional)"
                                    value={leadName}
                                    onChange={(e) => setLeadName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary transition-colors"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    placeholder="Seu melhor e-mail"
                                    value={leadEmail}
                                    onChange={(e) => setLeadEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(232,42,88,0.3)] transition-all uppercase tracking-widest text-xs cursor-pointer"
                            >
                                {leadCaptureButtonText}
                            </button>
                        </form>
                        <p className="mt-8 text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Acesso Seguro • Hostfy Streaming</p>
                    </div>
                </div>
            )}
        </div>
    );
});
