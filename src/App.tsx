import React, { useState, useEffect } from 'react';
import {
  Video, Beaker, Shield, Settings, Users, HelpCircle, ChevronRight, ChevronLeft,
  Search, FolderPlus, UploadCloud, BarChart2, Code, MoreVertical, Bell, Trophy, Play, X, Trash2, Zap,
  Globe, Sun, DollarSign, User, Activity, LogOut, AlertTriangle, Crown
} from 'lucide-react';
import { CustomPlayer } from './components/CustomPlayer';
import { Auth } from './components/Auth';
import { UploadModal } from './components/UploadModal';
import { supabase } from './lib/supabase';
import { SubscriptionWall } from './components/SubscriptionWall';

import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Suspense, useMemo } from 'react';
import type { VideoData } from './types';
import { getPlanSettings, isSubscriptionActive } from './lib/planLimits';
import type { UserProfile as UserProfileType } from './lib/planLimits';

const VideoDetailsView = React.lazy<React.ComponentType<any>>(() => import('./views/VideoDetailsView').then((m: any) => ({ default: m.VideoDetailsView || m.default })));
const AnalyticsView = React.lazy<React.ComponentType<any>>(() => import('./views/AnalyticsView').then((m: any) => ({ default: m.AnalyticsView || m.default })));
const PartnersView = React.lazy<React.ComponentType<any>>(() => import('./views/PartnersView').then((m: any) => ({ default: m.PartnersView || m.default })));
const SettingsView = React.lazy<React.ComponentType<any>>(() => import('./views/SettingsView').then((m: any) => ({ default: m.SettingsView || m.default })));
const SecurityView = React.lazy<React.ComponentType<any>>(() => import('./views/SecurityView').then((m: any) => ({ default: m.SecurityView || m.default })));
const ABTestsView = React.lazy<React.ComponentType<any>>(() => import('./views/ABTestsView').then((m: any) => ({ default: m.ABTestsView || m.default })));
const RewardsView = React.lazy<React.ComponentType<any>>(() => import('./views/RewardsView').then((m: any) => ({ default: m.RewardsView || m.default })));
const AdminView = React.lazy<React.ComponentType<any>>(() => import('./views/AdminView').then((m: any) => ({ default: m.AdminView || m.default })));
const LeadsView = React.lazy<React.ComponentType<any>>(() => import('./views/LeadsView').then((m: any) => ({ default: m.LeadsView || m.default })));

const VideoRouteWrapper = ({ videos, showToast, fetchContent, type }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const video = videos.find((v: any) => v.id === id);

  if (!videos.length) return <div className="p-10 text-neutral-400 text-center">Carregando vídeo...</div>;
  if (!video) return <div className="p-10 text-red-500 text-center">Vídeo não encontrado.</div>;
  if (type === 'analytics') {
    return <AnalyticsView video={video} onBack={() => navigate('/video/' + id)} onSync={fetchContent} userPlan={video.userPlan || 'trial'} />;
  }

  return <VideoDetailsView video={video} onBack={() => { fetchContent(); navigate('/'); }} showToast={showToast} userPlan={videos[0]?.userPlan || 'trial'} />;
};

function App() {
  const [session, setSession] = React.useState<any>(null);
  const [activeLibTab, setActiveLibTab] = useState('biblioteca');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Global Dashboard Mega Graph State
  const [globalStats, setGlobalStats] = useState({
    totalPlays: 0,
    playsThisWeek: 0,
    dailyBars: [] as number[],
    dailyLabels: [] as string[]
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<{ id: string, title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [openVideoMenuId, setOpenVideoMenuId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);

  const planSettings = useMemo(() => getPlanSettings(userProfile?.plan || 'trial'), [userProfile?.plan]);
  const isSubscriptionValid = useMemo(() => isSubscriptionActive(userProfile), [userProfile]);
  const [searchTerm, setSearchTerm] = useState('');

  // Embed Mode State
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  const [embedVideoData, setEmbedVideoData] = useState<any>(null);
  const [embedSettings, setEmbedSettings] = useState<any>(null);
  const [isDomainBlocked, setIsDomainBlocked] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

  React.useEffect(() => {
    // Check if we are in embed mode
    const params = new URLSearchParams(window.location.search);
    const embedId = params.get('embed');
    const splitTestId = params.get('split_test');

    if (splitTestId) {
      setIsEmbedMode(true);
      handleSplitTestPlayback(splitTestId);
    } else if (embedId) {
      setIsEmbedMode(true);
      fetchEmbedData(embedId);
    }
  }, []);

  // Tracking for the current AB test view to record conversion
  const [currentTestViewId, setCurrentTestViewId] = useState<string | null>(null);

  const handleSplitTestPlayback = async (testId: string) => {
    try {
      const { data: testData } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (!testData || testData.status !== 'active') {
        // Invalid or paused test. For fallback, just play video A
        const fallbackId = testData?.video_a_id;
        if (fallbackId) fetchEmbedData(fallbackId);
        else {
          setEmbedVideoData({ id: 'error', url: '', error: true });
          setEmbedSettings({});
        }
        return;
      }

      // Roleta russa (50% de chance) para decidir Variável A ou B
      const chosenVideoId = Math.random() < 0.5 ? testData.video_a_id : testData.video_b_id;

      // Registra a View Silenciosamente e guarda o ID para caso haja conversão
      const { data: viewData } = await supabase.from('ab_test_views').insert({
        test_id: testId,
        video_shown_id: chosenVideoId
      }).select('id').single();

      if (viewData) {
        setCurrentTestViewId(viewData.id);
      }

      // Carrega os dados para o player do embed
      fetchEmbedData(chosenVideoId);

    } catch (err) {
      console.error("Error on split test", err);
      setEmbedVideoData({ id: 'error', url: '', error: true });
      setEmbedSettings({});
    }
  };

  const handleCtaConversion = async () => {
    if (currentTestViewId) {
      try {
        await supabase
          .from('ab_test_views')
          .update({ converted: true })
          .eq('id', currentTestViewId);
        console.log("AB Test Conversion recorded!");
      } catch (err) {
        console.error("Error recording AB test conversion", err);
      }
    }
  };

  const fetchEmbedData = async (videoId: string) => {
    try {
      // 1. Fetch Video and its owner's allowed domains
      const { data: videoData } = await supabase
        .from('videos')
        .select('url, thumbnail_url, user_id')
        .eq('id', videoId)
        .single();

      if (videoData) {
        setEmbedVideoData(videoData);

        // Security check: Domain Whitelisting
        // We only check if the user is in embed mode
        const { data: allowedDomains } = await supabase
          .from('allowed_domains')
          .select('domain')
          .eq('user_id', videoData.user_id);

        if (allowedDomains && allowedDomains.length > 0) {
          const referrer = document.referrer;
          if (referrer) {
            try {
              const url = new URL(referrer);
              const hostname = url.hostname.toLowerCase();
              const isAllowed = allowedDomains.some(d => {
                const allowed = d.domain.toLowerCase();
                // Check exact match or subdomain match
                return hostname === allowed || hostname.endsWith('.' + allowed);
              });

              if (!isAllowed) {
                console.warn("Domain not authorized:", hostname);
                setIsDomainBlocked(true);
              }
            } catch (e) {
              console.error("Referrer parsing error:", e);
              // If referrer is malformed but we have a whitelist, we block it for safety
              setIsDomainBlocked(true);
            }
          } else {
            // No referrer and we have a whitelist? 
            // This happens if someone tries to visit the embed URL directly.
            // Professional tools usually block direct access if a whitelist exists.
            setIsDomainBlocked(true);
          }
        }
      }

      // 2. Fetch Video Settings
      const { data: settingsData } = await supabase
        .from('video_settings')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (settingsData) {
        setEmbedSettings(settingsData);
      } else {
        // defaults
        setEmbedSettings({
          primary_color: '#e82a58',
          autoplay: false,
          show_controls: true,
          pause_off_screen: false,
          cta_time_seconds: 5,
          cta_text: 'QUERO GARANTIR MINHA VAGA AGORA',
          cta_url: '',
          auto_loop: false,
          mute_on_start: true,
          corner_radius: 12,
          smart_progress_bar: false,
          play_button_style: 'default'
        })
      }
    } catch (err) {
      console.error("Error loading embedded video", err);
      // Forçar renderização de erro ou fallback para não ficar carregando infinitamente
      setEmbedVideoData({ id: videoId, url: '', error: true });
      setEmbedSettings({});
    }
  };

  const fetchContent = async () => {
    setLoadingVideos(true);
    try {
      // Fetch folders and videos in parallel
      const [foldersResponse, videosResponse] = await Promise.all([
        supabase.from('folders').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false })
      ]);

      if (foldersResponse.error) throw foldersResponse.error;
      if (videosResponse.error) throw videosResponse.error;

      if (foldersResponse.data) setFolders(foldersResponse.data);

      if (videosResponse.data) {
        // Pre-compute fallback thumbnails so we don't run regex on every React render cycle
        const optimizedVideos = videosResponse.data.map(v => {
          let thumb = v.thumbnail_url;
          if (!thumb && v.url && v.url.includes('stream.mux.com')) {
            const match = v.url.match(/stream\.mux\.com\/(.+?)\.m3u8/);
            if (match && match[1]) thumb = `https://image.mux.com/${match[1]}/thumbnail.png?time=0`;
          }
          return { ...v, computed_thumbnail: thumb };
        });
        setVideos(optimizedVideos);

        // Fetch Global Analytics Mega Graph data
        try {
          const userVideosIds = videosResponse.data.map(v => v.id);
          if (userVideosIds.length > 0) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const { data: sessionsData } = await supabase
              .from('video_sessions')
              .select('created_at')
              .in('video_id', userVideosIds)
              .gte('created_at', sevenDaysAgo.toISOString());

            if (sessionsData) {
              const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              const dailyCounts = new Array(7).fill(0);
              const labels = new Array(7).fill('');

              for (let i = 0; i < 7; i++) {
                const d = new Date(sevenDaysAgo);
                d.setDate(d.getDate() + i);
                labels[i] = days[d.getDay()];
              }

              sessionsData.forEach((s: any) => {
                const sDate = new Date(s.created_at);
                const sDay = sDate.getDay();
                const idx = labels.indexOf(days[sDay]);
                if (idx !== -1) dailyCounts[idx]++;
              });

              const playsThisWeek = sessionsData.length;
              const totalPlays = videosResponse.data.reduce((acc: number, v: any) => acc + (v.plays || 0), 0);
              const maxVal = Math.max(...dailyCounts, 1);
              const normalizedBars = dailyCounts.map(c => (c / maxVal) * 100);

              setGlobalStats({
                totalPlays,
                playsThisWeek,
                dailyBars: normalizedBars,
                dailyLabels: labels
              });
            }
          }
        } catch (analyticsErr) {
          console.error("Non-fatal: Error fetching global analytics", analyticsErr);
        }
      }
    } catch (err: any) {
      console.error('Error fetching content:', err);
      showToast('Erro ao carregar vídeos: ' + (err.message || 'Desconhecido'));
    } finally {
      setLoadingVideos(false);
    }
  };

  const initialFetchDone = React.useRef(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, is_admin, plan, subscription_status, trial_ends_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) setUserProfile(data);
    } catch (err) {
      console.error("Error fetching user profile", err);
    }
  };

  React.useEffect(() => {
    if (isEmbedMode) return; // Skip auth for public embed

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && !initialFetchDone.current) {
        initialFetchDone.current = true;
        fetchContent();
        fetchUserProfile(session.user.id);
        fetchNotifications();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && !initialFetchDone.current) {
        initialFetchDone.current = true;
        fetchContent();
        fetchUserProfile(session.user.id);
        fetchNotifications();
      }
    });

    return () => subscription?.unsubscribe();
  }, [isEmbedMode]);

  useEffect(() => {
    if (!session?.user?.id || isEmbedMode) return;

    // Realtime subscription for videos
    const channel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          console.log('Video updated in realtime:', payload);

          // Detect if video became 'ready'
          if (payload.old.status === 'processing' && payload.new.status === 'ready') {
            showToast(`Vídeo "${payload.new.title}" está pronto! 🚀`);
          }

          setVideos(currentVideos =>
            currentVideos.map(v => {
              if (v.id === payload.new.id) {
                const updatedVideo = { ...v, ...payload.new };
                // Keep the dynamic thumbnail logic intact for real-time updates
                updatedVideo.computed_thumbnail = updatedVideo.thumbnail_url || v.computed_thumbnail;
                return updatedVideo;
              }
              return v;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isEmbedMode]);

  useEffect(() => {
    if (!session?.user?.id || isEmbedMode) return;

    // Realtime subscription for notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isEmbedMode]);



  if (isEmbedMode) {
    if (!embedVideoData || !embedSettings) {
      return (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-sans">
          <div className="w-8 h-8 border-2 border-white/30 border-t-brand-primary rounded-full animate-spin mb-4"></div>
          <p className="text-neutral-500 text-sm">Carregando Player Seguro...</p>
        </div>
      );
    }

    if (embedVideoData.error || isDomainBlocked) {
      return (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white font-sans p-6">
          {isDomainBlocked ? (
            <div className="text-center animate-[fadeIn_0.5s_ease-out]">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-xl font-black mb-3 text-white uppercase tracking-tighter">Domínio Não Autorizado</h1>
              <p className="text-neutral-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                Este vídeo está protegido e não tem permissão para ser exibido neste site.
              </p>
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Protegido por Hostfy Security</p>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm p-4 text-center">
              Este vídeo está indisponível ou sendo processado.<br />Por favor, aguarde alguns minutos e atualize a página.
            </p>
          )}
        </div>
      );
    }

    const finalThumbnailUrl = embedVideoData.thumbnail_url || (() => {
      if (embedVideoData.url?.includes('stream.mux.com')) {
        const match = embedVideoData.url.match(/stream\.mux\.com\/(.+?)\.m3u8/);
        if (match && match[1]) return `https://image.mux.com/${match[1]}/thumbnail.png?time=0`;
      }
      return undefined;
    })();

    // We remove the default margin/max-width limits for embed so it fills the iframe
    return (
      <div className="w-full h-full bg-transparent overflow-hidden m-0 p-0 flex items-center justify-center">
        <CustomPlayer
          videoId={embedVideoData.id}
          src={embedVideoData.url}
          poster={finalThumbnailUrl}
          autoplay={embedSettings.autoplay}
          ctaTime={embedSettings.cta_time_seconds}
          primaryColor={embedSettings.primary_color}
          showControls={embedSettings.show_controls}
          pauseOffScreen={embedSettings.pause_off_screen}
          ctaText={embedSettings.cta_text}
          ctaUrl={embedSettings.cta_url}
          autoLoop={embedSettings.auto_loop}
          muteOnStart={embedSettings.mute_on_start}
          cornerRadius={embedSettings.corner_radius}
          smartProgressBar={embedSettings.smart_progress_bar}
          playButtonStyle={embedSettings.play_button_style}
          exitIntentPause={embedSettings.exit_intent_pause}
          leadCaptureEnabled={embedSettings.lead_capture_enabled}
          leadCaptureTime={embedSettings.lead_capture_time_seconds}
          leadCaptureTitle={embedSettings.lead_capture_title}
          leadCaptureButtonText={embedSettings.lead_capture_button_text}
          socialProofEnabled={embedSettings.social_proof_enabled}
          onCtaClick={handleCtaConversion}
        />
      </div>
    );
  }


  if (!session) {
    return <Auth onLogin={() => { }} />;
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !session?.user?.id) return;

    setIsCreatingFolder(true);
    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          user_id: session.user.id,
          name: newFolderName.trim()
        });

      if (error) throw error;

      showToast('Pasta criada com sucesso!');
      setNewFolderName('');
      setIsFolderOpen(false);
      fetchContent(); // Refresh folders
    } catch (err: any) {
      console.error('Error creating folder:', err);
      showToast(err.message || 'Erro ao criar pasta');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Tem certeza que deseja apagar esta pasta?\n\nOs vídeos dentro dela NÃO serão apagados, apenas movidos para a Biblioteca principal.')) return;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      showToast('Pasta removida com sucesso!');
      if (activeLibTab === folderId) {
        setActiveLibTab('biblioteca');
      }
      fetchContent(); // Refresh folders
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      showToast(err.message || 'Erro ao deletar pasta');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      setIsDeleting(true);

      // Try to use the Edge Function first (best for cleaning up Mux/Storage)
      const { data, error: invokeError } = await supabase.functions.invoke('delete-video', {
        body: { videoId }
      });

      // Fallback: If the Edge Function fails or is not found, delete directly from database
      if (invokeError || (data && data.error)) {
        console.warn('Edge function deletion failed, attempting direct database delete:', invokeError || data?.error);
        const { error: dbError } = await supabase
          .from('videos')
          .delete()
          .eq('id', videoId);

        if (dbError) throw dbError;
      }

      showToast('Vídeo apagado com sucesso!');
      setVideoToDelete(null);
      fetchContent(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting video:', err);
      showToast(err.message || 'Erro ao deletar vídeo');
    } finally {
      setIsDeleting(false);
    }
  };

  const navItems = [
    { id: 'videos', label: 'Meus vídeos', icon: Video },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'ab_tests', label: 'Testes A/B', icon: Beaker },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'partners', label: 'Seja um parceiro', icon: Users },
    ...(userProfile?.is_admin ? [{ id: 'admin', label: 'Master Admin', icon: Crown }] : []),
  ];


  if (session && userProfile && !isSubscriptionValid && !userProfile.is_admin) {
    return <SubscriptionWall profile={userProfile} onSignOut={() => supabase.auth.signOut()} />;
  }

  return (
    <div className="min-h-screen bg-brand-dark text-neutral-50 flex font-sans relative">
      <style>
        {`
        @keyframes fadeIn {
          from {opacity: 0; transform: translateY(10px); }
          to {opacity: 1; transform: translateY(0); }
        }
        @keyframes adminPulse {
          0% { box-shadow: 0 0 0 0 rgba(232, 42, 88, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(232, 42, 88, 0); }
          100% { box-shadow: 0 0 0 0 rgba(232, 42, 88, 0); }
        }
        @keyframes crownGlow {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.4)); }
          50% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        `}
      </style>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-brand-primary text-white px-6 py-3 rounded-lg shadow-[0_10px_40px_rgba(232,42,88,0.5)] flex items-center z-50 animate-[fadeIn_0.3s_ease-out]">
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchContent();
          }}
          showToast={showToast}
        />
      )}

      {/* Modern Delete Video Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-brand-dark-lighter border border-white/10 shadow-2xl p-6 md:p-8 rounded-2xl w-full max-w-lg relative">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <AlertTriangle className="text-red-500 w-6 h-6" />
              Apagar Vídeo
            </h2>
            <p className="text-neutral-400 mb-6 font-medium">
              Tem certeza que deseja apagar o vídeo <strong className="text-white">"{videoToDelete.title}"</strong>? <br /><br />
              Esta ação <span className="text-red-400">não pode ser desfeita</span> e vai remover definitivamente o vídeo de todos os sites.
            </p>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={() => setVideoToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-neutral-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteVideo(videoToDelete.id)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sim, apagar vídeo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFolderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-brand-dark-lighter border border-white/10 p-8 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setIsFolderOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white cursor-pointer transition-colors p-2">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Criar Nova Pasta</h2>
            <input
              type="text"
              placeholder="Nome da pasta"
              className="w-full bg-brand-dark border border-white/10 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-brand-primary transition-colors"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <button
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !newFolderName.trim()}
              className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 rounded-lg transition-colors cursor-pointer shadow-[0_0_15px_rgba(232,42,88,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isCreatingFolder ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Criar Pasta'}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20 items-center px-2' : 'w-[260px]'} transition-all duration-300 border-r border-white/5 bg-brand-dark-lighter flex flex-col hidden md:flex shrink-0 sticky top-0 h-screen z-40 overflow-x-hidden`}>
        <div className={`h-20 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'} gap-3 text-white font-bold text-xl tracking-tight shrink-0 w-full`}>
          <img src="/logo.png" alt="Hostfy Logo" className="w-8 h-8 rounded-md shadow-[0_0_10px_rgba(232,42,88,0.3)] object-cover shrink-0" />
          {!isSidebarCollapsed && <span className="whitespace-nowrap">Hostfy</span>}
        </div>

        <div className={`py-4 flex-1 flex flex-col gap-2 w-full ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
          {navItems.map(item => (
            <React.Fragment key={item.id}>
              <Link
                to={item.id === 'videos' ? '/' : `/${item.id.replace('_', '-')}`}
                onClick={() => {
                  // Restricted items are now filtered out, so we don't need the preventDefault block
                }}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'} rounded-lg font-medium transition-all w-full text-left cursor-pointer relative
                   ${item.id === 'admin'
                    ? 'bg-gradient-to-r from-brand-primary to-rose-600 text-white shadow-[0_0_20px_rgba(232,42,88,0.3)] animate-[adminPulse_2s_infinite]'
                    : location.pathname === (item.id === 'videos' ? '/' : `/${item.id.replace('_', '-')}`)
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'hover:bg-white/5 text-neutral-400 hover:text-neutral-100'}
                 `}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${item.id === 'admin' ? 'animate-[crownGlow_2s_infinite] text-amber-300' : location.pathname === (item.id === 'videos' ? '/' : `/${item.id.replace('_', '-')}`) ? 'opacity-100' : 'opacity-70'}`} />
                {!isSidebarCollapsed && (
                  <span className={`whitespace-nowrap ${item.id === 'admin' ? 'font-black tracking-tight flex items-center gap-2' : ''}`}>
                    {item.label}
                    {item.id === 'admin' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
                  </span>
                )}
              </Link>
              {item.id === 'ab_tests' && <div className="my-2 border-t border-white/5"></div>}
              {item.id === 'settings' && <div className="my-2 border-t border-white/5"></div>}
            </React.Fragment>
          ))}

          <div className="mt-auto pb-4 pt-4 flex flex-col gap-2 w-full">
            {!isSidebarCollapsed && userProfile && (
              <div className="px-4 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Consumo de Banda</span>
                    <span className="text-[10px] text-brand-primary font-bold">
                      {Math.floor(((userProfile.current_bandwidth_gb || 0) / (planSettings.maxStreamingHours || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${((userProfile.current_bandwidth_gb || 0) / (planSettings.maxStreamingHours || 1)) > 0.9 ? 'bg-red-500' : 'bg-brand-primary'}`}
                      style={{ width: `${Math.min(100, ((userProfile.current_bandwidth_gb || 0) / (planSettings.maxStreamingHours || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-neutral-500 font-medium">{(userProfile.current_bandwidth_gb || 0).toFixed(1)} GB</span>
                    <span className="text-[10px] text-neutral-500 font-medium">limite {planSettings.maxStreamingHours}GB</span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => showToast('Central de Ajuda abrindo...')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-3'} rounded-lg hover:bg-white/5 text-neutral-400 hover:text-neutral-100 font-medium transition-colors cursor-pointer group`} title={isSidebarCollapsed ? 'Ajuda' : undefined}>
              <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                <HelpCircle className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                {!isSidebarCollapsed && <span className="whitespace-nowrap">Ajuda</span>}
              </div>
              {!isSidebarCollapsed && <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />}
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-3'} rounded-lg hover:bg-white/5 text-neutral-400 hover:text-neutral-100 font-medium transition-colors cursor-pointer group`}
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                {isSidebarCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
                {!isSidebarCollapsed && <span className="whitespace-nowrap">Recolher</span>}
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-dark-lighter to-brand-dark flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="h-20 border-b border-white/5 bg-brand-dark px-8 flex items-center justify-end gap-6 shrink-0 z-40 w-full sticky top-0">
          <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 cursor-pointer" onClick={() => navigate('/rewards')}>
            <Trophy className="w-4 h-4 text-brand-primary" />
            <span className="font-medium">Premiações</span>
          </div>

          <div className="flex flex-col justify-center px-2 py-1.5 hidden sm:flex cursor-pointer transition-colors min-w-[160px]" onClick={() => navigate('/rewards')}>
            <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
              <span className="font-bold text-white tracking-wide">
                {(() => {
                  const totalPlays = videos.reduce((acc, v) => acc + (v.plays || 0), 0);
                  let limit = 100000;
                  if (totalPlays >= 1000000) limit = 5000000;
                  else if (totalPlays >= 500000) limit = 1000000;
                  else if (totalPlays >= 100000) limit = 500000;

                  let medal = '🥉';
                  if (totalPlays >= 1000000) medal = '💎';
                  else if (totalPlays >= 500000) medal = '🥇';
                  else if (totalPlays >= 100000) medal = '🥈';

                  const formatRaw = (num: number) => {
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
                    return num.toString();
                  };

                  return `${totalPlays.toLocaleString('pt-BR')}/${formatRaw(limit)} Plays ${medal}`;
                })()}
              </span>
              <span className="text-brand-primary font-black text-[10px] bg-brand-primary/10 px-1.5 py-0.5 rounded-md">
                {(() => {
                  const totalPlays = videos.reduce((acc, v) => acc + (v.plays || 0), 0);
                  let limit = 100000;
                  if (totalPlays >= 1000000) limit = 5000000;
                  else if (totalPlays >= 500000) limit = 1000000;
                  else if (totalPlays >= 100000) limit = 500000;
                  const percent = Math.min(100, Math.floor((totalPlays / limit) * 100));
                  return `${percent}%`;
                })()}
              </span>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 relative">
              <div
                className="bg-gradient-to-r from-brand-primary via-rose-500 to-amber-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(232,42,88,0.6)] relative z-10"
                style={{
                  width: (() => {
                    const totalPlays = videos.reduce((acc, v) => acc + (v.plays || 0), 0);
                    let limit = 100000;
                    if (totalPlays >= 1000000) limit = 5000000;
                    else if (totalPlays >= 500000) limit = 1000000;
                    else if (totalPlays >= 100000) limit = 500000;
                    return `${Math.min(100, (totalPlays / limit) * 100)}%`;
                  })()
                }}
              >
                {/* Shimmer effect inside the bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 pl-2 sm:pl-4 sm:border-l border-white/5 relative">
            <div className="relative">
              <button
                className={`relative transition-colors cursor-pointer ${isNotificationMenuOpen ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => {
                  setIsNotificationMenuOpen(!isNotificationMenuOpen);
                  setIsProfileMenuOpen(false); // Close other menu
                }}
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-brand-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-brand-dark animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isNotificationMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 bg-brand-dark border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-[fadeIn_0.2s_ease-out] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notificações</h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); markAllNotificationsAsRead(); }}
                        className="text-[10px] font-bold text-brand-primary hover:text-brand-primary-light uppercase tracking-widest cursor-pointer"
                      >
                        Zerar Notificações
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                          <Bell className="w-8 h-8 text-neutral-600 mx-auto mb-3 opacity-20" />
                          <p className="text-neutral-500 text-xs italic">Nenhuma notificação por aqui.</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-brand-primary/5' : ''}`}
                            onClick={async () => {
                              if (!notification.read) {
                                await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
                                fetchNotifications();
                              }
                              if (notification.link) navigate(notification.link);
                              setIsNotificationMenuOpen(false);
                            }}
                          >
                            {!notification.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>}
                            <div className="flex flex-col gap-1">
                              <span className={`text-[13px] font-bold ${!notification.read ? 'text-white' : 'text-neutral-300'}`}>{notification.title}</span>
                              <span className="text-[12px] text-neutral-500 leading-relaxed">{notification.message}</span>
                              <span className="text-[10px] text-neutral-600 font-medium uppercase mt-1">{new Date(notification.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2 bg-black/20 border-t border-white/5 text-center">
                      <span className="text-[10px] text-neutral-600 uppercase font-black tracking-widest">Protegido por Hostfy Security</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-brand-dark border-2 border-brand-primary/50 flex items-center justify-center text-white font-bold cursor-pointer hover:border-brand-primary transition-colors shadow-[0_0_15px_rgba(232,42,88,0.2)] overflow-hidden" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xs">
                    {userProfile?.full_name?.charAt(0) || <Users className="w-4 h-4" />}
                  </div>
                )}
              </div>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-brand-dark border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-[fadeIn_0.2s_ease-out]">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        userProfile?.full_name?.substring(0, 2).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white truncate">{userProfile?.full_name || 'Usuário'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-brand-primary font-black uppercase tracking-widest">{planSettings.name}</span>
                        {planSettings.name !== 'Ultra' && <button onClick={() => showToast('Abrindo checkout...')} className="text-[10px] text-white hover:underline font-bold">Upgrade</button>}
                      </div>
                      <span className="text-xs text-neutral-500 truncate">{session?.user?.email}</span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-2 border-b border-white/5">
                    <button onClick={() => showToast('Idioma definido: Português (Brasil)')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors group">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-neutral-400 group-hover:text-brand-primary transition-colors" />
                        Idioma
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </button>
                    <button onClick={() => showToast('Tema Dark ativado por padrão')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors group">
                      <div className="flex items-center gap-3">
                        <Sun className="w-4 h-4 text-neutral-400 group-hover:text-brand-primary transition-colors" />
                        Tema
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </button>
                    <button onClick={() => { setIsProfileMenuOpen(false); navigate('/settings', { state: { tab: 'financeiro' } }); }} className="w-full flex text-left items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors group">
                      <DollarSign className="w-4 h-4 text-neutral-400 group-hover:text-brand-primary transition-colors" />
                      Financeiro
                    </button>
                    <button onClick={() => { setIsProfileMenuOpen(false); navigate('/settings', { state: { tab: 'conta' } }); }} className="w-full flex text-left items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors group">
                      <User className="w-4 h-4 text-neutral-400 group-hover:text-brand-primary transition-colors" />
                      Conta
                    </button>
                  </div>

                  {/* Limits/Usage */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between group cursor-default hover:bg-white/5 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-bold text-neutral-300 hover:text-white">Uso do plano</span>
                      </div>
                      <span className="text-xs text-neutral-500 ml-6">
                        {(() => {
                          const limit = planSettings.maxVideos === Infinity ? 'Ilimitado' : `${planSettings.maxVideos} vídeos`;
                          return `${videos.length} / ${limit}`;
                        })()}
                      </span>
                    </div>
                    {/* Circular Progress */}
                    <div className="relative w-10 h-10 flex flex-col items-center justify-center rounded-full bg-brand-dark border border-white/10 shrink-0 shadow-inner">
                      {(() => {
                        const percent = planSettings.maxVideos === Infinity ? 0 : Math.min(100, Math.floor((videos.length / planSettings.maxVideos) * 100));

                        return (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              {/* Background Circle */}
                              <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/10" strokeWidth="3" />
                              {/* Progress Circle */}
                              <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-primary" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - percent} strokeLinecap="round" />
                            </svg>
                            <span className="text-[10px] font-bold text-white z-10">{percent}%</span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="py-1">
                    <button onClick={() => { setIsProfileMenuOpen(false); supabase.auth.signOut(); }} className="w-full flex text-left items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:bg-white/5 hover:text-white transition-colors group">
                      <LogOut className="w-4 h-4 text-neutral-500 group-hover:text-red-400 transition-colors" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 w-full mx-auto max-w-screen-2xl">
          <Suspense fallback={<div className="flex items-center justify-center p-20 text-brand-primary"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div></div>}>
            <Routes>
              <Route path="/" element={
                <div className="animate-[fadeIn_0.5s_ease-out]">
                  {/* Mega Graph Dashboard Header */}
                  {videos.length > 0 && !loadingVideos && (
                    <div className="mb-10 bg-gradient-to-br from-brand-dark to-black border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                      {/* Background Effects */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                      <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                        {/* Text Info */}
                        <div className="flex flex-col justify-center max-w-sm">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold mb-4 w-max">
                            <BarChart2 className="w-3.5 h-3.5" /> Panorama Geral
                          </div>
                          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Estatísticas Globais</h2>
                          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">Acompanhe o desempenho de todos os seus vídeos consolidados nos últimos 7 dias na plataforma.</p>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                              <p className="text-sm text-neutral-400 mb-1">Visualizações (7d)</p>
                              <p className="text-2xl font-bold text-white">{globalStats.playsThisWeek}</p>
                            </div>
                            <div className="bg-gradient-to-br from-brand-primary/20 to-rose-500/10 border border-brand-primary/30 rounded-2xl p-4">
                              <p className="text-sm text-brand-primary-light mb-1">Total da Conta</p>
                              <p className="text-2xl font-bold text-white">{globalStats.totalPlays.toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Chart Bar */}
                        <div className="flex-1 min-h-[220px] bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-end relative">
                          <div className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-neutral-400">
                            <Zap className="w-4 h-4 text-emerald-400" /> Tráfego Semanal
                          </div>
                          <div className="flex items-end justify-between gap-2 h-32 mt-8">
                            {globalStats.dailyBars.length > 0 ? globalStats.dailyBars.map((height, i) => (
                              <div key={i} className="flex flex-col items-center gap-3 w-full group relative h-full justify-end">
                                {/* Tooltip on hover */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-dark-lighter border border-white/10 text-white text-xs py-1 px-3 rounded-lg shadow-xl whitespace-nowrap z-20">
                                  Pico Baseado
                                </div>
                                <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden h-full flex items-end">
                                  <div
                                    className="w-full bg-gradient-to-t from-brand-primary to-rose-400 rounded-t-lg transition-all duration-1000 group-hover:from-brand-primary-light group-hover:to-white shadow-[0_0_15px_rgba(232,42,88,0.3)] min-h-[4px]"
                                    style={{ height: `${height}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500">{globalStats.dailyLabels[i]}</span>
                              </div>
                            )) : (
                              <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                                Aguardando primeiros dados de sessão...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page Header Area */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-4">
                    <div className="flex items-center gap-8">
                      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                        <Video className="w-6 h-6 text-brand-primary" />
                        Meus vídeos
                      </h1>

                      {/* Underline Tabs */}
                      <div className="hidden md:flex items-center gap-8 text-sm font-medium mt-1 overflow-x-auto pb-2 scrollbar-hide py-1">
                        {[
                          { id: 'biblioteca', label: 'Biblioteca', type: 'system' },
                          ...folders.map(f => ({ id: f.id, label: f.name, type: 'custom' })),
                          { id: 'lixeira', label: 'Lixeira', type: 'system' }
                        ].map(tab => (
                          <div key={tab.id} className="relative group flex items-center">
                            <button
                              onClick={() => setActiveLibTab(tab.id)}
                              className={`pb-2 capitalize transition-colors cursor-pointer relative whitespace-nowrap ${tab.type === 'custom' ? 'pr-5' : 'px-1'} ${activeLibTab === tab.id ? 'text-brand-primary' : 'text-neutral-400 hover:text-neutral-200'}`}
                            >
                              {tab.label}
                              {activeLibTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary shadow-[0_0_10px_rgba(232,42,88,0.5)] rounded-t-sm"></div>
                              )}
                            </button>
                            {tab.type === 'custom' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(tab.id); }}
                                className="absolute right-0 top-[2px] bg-brand-dark/80 text-neutral-500 hover:text-brand-primary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Apagar pasta"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="Pesquisar vídeos"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-brand-dark/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary/50 transition-all w-full sm:w-64 lg:w-80 cursor-text"
                        />
                      </div>
                      <button onClick={() => setIsFolderOpen(true)} className="bg-brand-dark/50 hover:bg-white/5 border border-white/10 text-neutral-300 hover:text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-300 cursor-pointer text-sm flex items-center gap-2">
                        <FolderPlus className="w-4 h-4" />
                        Nova Pasta
                      </button>
                      <button onClick={() => setShowUploadModal(true)} className="bg-brand-primary hover:bg-brand-primary-light text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(232,42,88,0.3)] hover:shadow-[0_0_25px_rgba(232,42,88,0.5)] cursor-pointer text-sm flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                  </div>

                  {/* Videos Table */}
                  {(() => {
                    const getFilteredVideos = () => {
                      let filtered = videos;
                      if (activeLibTab !== 'biblioteca' && activeLibTab !== 'lixeira') {
                        filtered = videos.filter(v => v.folder_id === activeLibTab);
                      }

                      if (searchTerm.trim()) {
                        filtered = filtered.filter(v =>
                          (v.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                        );
                      }

                      return filtered;
                    };
                    const displayedVideos = getFilteredVideos();

                    if (activeLibTab === 'lixeira') {
                      return (
                        <div className="bg-brand-dark-lighter/30 border border-white/5 rounded-xl backdrop-blur-md p-16 text-center text-neutral-400 flex flex-col items-center shadow-xl">
                          <FolderPlus className="w-16 h-16 text-white/5 mb-6" />
                          <p className="text-lg">Lixeira vazia.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-brand-dark-lighter/30 border border-white/5 rounded-xl overflow-x-auto overflow-y-hidden shadow-lg">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                          <thead className="text-neutral-400 border-b border-white/5 bg-white/[0.02]">
                            <tr>
                              <th className="w-12 px-6 py-5">
                                <input type="checkbox" className="rounded bg-brand-dark border-white/10 text-brand-primary focus:ring-brand-primary/50 w-4 h-4 accent-brand-primary cursor-pointer" />
                              </th>
                              <th className="px-6 py-5 font-medium">Nome</th>
                              <th className="w-32 px-6 py-5 font-medium">Criado em</th>
                              <th className="w-24 px-6 py-5 font-medium">Plays</th>
                              <th className="w-32 px-6 py-5 font-medium text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {loadingVideos ? (
                              Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={idx} className="border-b border-white/5 animate-pulse">
                                  <td className="px-6 py-4"><div className="w-4 h-4 bg-white/10 rounded"></div></td>
                                  <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="w-12 h-8 bg-white/10 rounded"></div>
                                    <div className="w-32 h-4 bg-white/10 rounded"></div>
                                  </td>
                                  <td className="w-32 px-6 py-4"><div className="w-20 h-4 bg-white/10 rounded"></div></td>
                                  <td className="w-24 px-6 py-4"><div className="w-10 h-4 bg-white/10 rounded"></div></td>
                                  <td className="w-32 px-6 py-4 text-right"><div className="w-8 h-4 bg-white/10 rounded ml-auto"></div></td>
                                </tr>
                              ))
                            ) : displayedVideos.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-neutral-500">
                                  Nenhum vídeo nesta seção.
                                </td>
                              </tr>
                            ) : displayedVideos.map((video) => (
                              <tr key={video.id} className="hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => { navigate(`/video/${video.id}`); showToast(`Abrindo detalhes: ${video.title}`); }}>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" className="rounded bg-brand-dark border-white/10 text-brand-primary focus:ring-brand-primary/50 opacity-50 group-hover:opacity-100 transition-opacity w-4 h-4 accent-brand-primary cursor-pointer" />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-10 bg-neutral-800 rounded-md flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-brand-primary/40 transition-colors shrink-0 shadow-lg">
                                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900"></div>

                                      {/* Play icon behind image (shows if image is transparent/has errors and gets hidden) */}
                                      <Play className="w-4 h-4 text-white/50 absolute z-0 hidden group-hover:text-brand-primary transition-colors" fill="currentColor" />

                                      {(() => {
                                        // Priority 1: User uploaded custom thumbnail
                                        // Priority 2: Pre-computed or Regex default thumbnail
                                        const finalThumbnailUrl = video.thumbnail_url || video.computed_thumbnail;

                                        if (finalThumbnailUrl) {
                                          return (
                                            <img
                                              src={finalThumbnailUrl}
                                              alt={video.title || "Video"}
                                              className="w-full h-full object-cover relative z-10 bg-neutral-900"
                                              onError={(e) => {
                                                // If it fails to load, gracefully hide it and let Play icon show
                                                e.currentTarget.style.display = 'none';
                                                const icon = e.currentTarget.parentElement?.querySelector('svg');
                                                if (icon) icon.classList.remove('hidden');
                                              }}
                                            />
                                          );
                                        }
                                        return <Play className="w-4 h-4 text-white/80 relative z-10 group-hover:text-brand-primary transition-colors" fill="currentColor" />;
                                      })()}
                                    </div>
                                    <span className="font-medium text-neutral-200 group-hover:text-white transition-colors text-base">{video.title}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-neutral-400">
                                  {new Date(video.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-neutral-300 font-medium">{video.plays}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-brand-primary transition-colors cursor-pointer" title="Analytics" onClick={(e) => { e.stopPropagation(); navigate(`/video/${video.id}/analytics`); }}>
                                      <BarChart2 className="w-4 h-4" />
                                    </button>
                                    <button className="p-2.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer" title="Embed de Código" onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/?embed=${video.id}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" style="aspect-ratio: 16/9; width: 100%; height: auto; border-radius: 12px;"></iframe>`);
                                      showToast(`Código VSL copiado!`);
                                    }}>
                                      <Code className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                      <button className={`p-2.5 rounded-lg transition-colors cursor-pointer ${openVideoMenuId === video.id ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-neutral-400 hover:text-white'}`} title="Opções" onClick={(e) => { e.stopPropagation(); setOpenVideoMenuId(openVideoMenuId === video.id ? null : video.id); }}>
                                        <MoreVertical className="w-4 h-4" />
                                      </button>

                                      {openVideoMenuId === video.id && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenVideoMenuId(null); }}></div>
                                          <div className="absolute right-0 mt-1 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                                            <button
                                              className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenVideoMenuId(null); setVideoToDelete({ id: video.id, title: video.title }); }}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Apagar Vídeo
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              } />
              <Route path="/leads" element={<LeadsView userPlan={userProfile?.plan} />} />
              <Route path="/settings" element={<SettingsView userPlan={userProfile?.plan} />} />
              <Route path="/ab-tests" element={<ABTestsView userPlan={userProfile?.plan} />} />
              <Route path="/partners" element={<PartnersView />} />
              <Route path="/security" element={<SecurityView userPlan={userProfile?.plan} />} />
              <Route path="/rewards" element={<RewardsView />} />
              <Route path="/video/:id" element={<VideoRouteWrapper videos={videos.map(v => ({ ...v, userPlan: userProfile?.plan }))} showToast={showToast} fetchContent={fetchContent} type="details" />} />
              <Route path="/video/:id/analytics" element={<VideoRouteWrapper videos={videos.map(v => ({ ...v, userPlan: userProfile?.plan }))} showToast={showToast} fetchContent={fetchContent} type="analytics" />} />
              <Route path="/admin" element={<AdminView onBack={() => navigate('/')} />} />
            </Routes>
          </Suspense>
        </div >
      </main >
    </div >
  )
}


export default App;
