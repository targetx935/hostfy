
export interface PlanSettings {
    name: string;
    maxVideos: number;
    maxStreamingHours: number;
    features: {
        leadCapture: boolean;
        socialProof: boolean;
        advancedAnalytics: boolean;
        csvExport: boolean;
        watermark: boolean;
        domainWhitelist: boolean;
    };
}

export interface UserProfile {
    id?: string;
    full_name: string | null;
    avatar_url: string | null;
    plan?: string;
    subscription_status?: string;
    trial_ends_at?: string;
    is_admin?: boolean;
    current_bandwidth_gb?: number;
    current_storage_gb?: number;
}

export const PLAN_LIMITS: Record<string, PlanSettings> = {
    trial: {
        name: 'Teste Grátis',
        maxVideos: 1,
        maxStreamingHours: 5,
        features: {
            leadCapture: false,
            socialProof: false,
            advancedAnalytics: false,
            csvExport: false,
            watermark: false,
            domainWhitelist: false,
        },
    },
    basic: {
        name: 'Basic',
        maxVideos: 10,
        maxStreamingHours: 100,
        features: {
            leadCapture: true,
            socialProof: false,
            advancedAnalytics: true,
            csvExport: false,
            watermark: false,
            domainWhitelist: true,
        },
    },
    pro: {
        name: 'PRO',
        maxVideos: 50,
        maxStreamingHours: 500,
        features: {
            leadCapture: true,
            socialProof: true,
            advancedAnalytics: true,
            csvExport: true,
            watermark: true,
            domainWhitelist: true,
        },
    },
    ultra: {
        name: 'Ultra',
        maxVideos: Infinity,
        maxStreamingHours: 2000,
        features: {
            leadCapture: true,
            socialProof: true,
            advancedAnalytics: true,
            csvExport: true,
            watermark: true,
            domainWhitelist: true,
        },
    },
};

export const getPlanSettings = (planName: string = 'trial'): PlanSettings => {
    return PLAN_LIMITS[planName.toLowerCase()] || PLAN_LIMITS.trial;
};

export const isSubscriptionActive = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    if (profile.is_admin) return true;

    // Check trial
    if (profile.subscription_status === 'trialing') {
        if (!profile.trial_ends_at) return true; // Fallback
        const trialEnd = new Date(profile.trial_ends_at);
        return trialEnd > new Date();
    }

    // Check active subscription
    return ['active', 'past_due'].includes(profile.subscription_status || '');
};
