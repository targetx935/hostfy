export interface VideoData {
    id: string;
    title: string;
    url: string;
    thumbnail_url: string | null;
    computed_thumbnail?: string;
    folder_id: string | null;
    status: string;
    plays: number;
    mux_asset_id?: string;
    mux_playback_id?: string;
    created_at: string;
}

export interface VideoSettingsData {
    id: string;
    video_id: string;
    primary_color: string;
    autoplay: boolean;
    show_controls: boolean;
    pause_off_screen: boolean;
    cta_enabled: boolean;
    cta_time_seconds: number;
    cta_text: string | null;
    cta_url: string | null;
    auto_loop: boolean;
    mute_on_start: boolean;
    corner_radius: number;
    smart_progress_bar: boolean;
    play_button_style: string;
    watermark_enabled: boolean;
    watermark_opacity: number;
    unmute_overlay_enabled: boolean;
    progress_bar_height: number;
    facebook_pixel_id: string | null;
}

export interface VideoSessionData {
    id: string;
    video_id: string;
    created_at: string;
    max_time_watched: number;
    cta_clicked: boolean;
    device_type: string | null;
}

export interface ABTestData {
    id: string;
    name: string;
    video_a_id: string;
    video_b_id: string;
    status: 'active' | 'paused' | 'finished';
    winner_video_id: string | null;
    created_at: string;
}
