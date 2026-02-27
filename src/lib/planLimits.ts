
export interface PlanSettings {
    name: string;
    maxVideos: number;
    maxStreamingHours: number;
    maxPlays: number;
    price: number;
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
        maxStreamingHours: 1,
        maxPlays: 500,
        price: 0,
        features: {
            leadCapture: false,
            socialProof: false,
            advancedAnalytics: false,
            csvExport: false,
            watermark: false,
            domainWhitelist: true,
        },
    },
    basic: {
        name: 'Starter',
        maxVideos: 5,
        maxStreamingHours: 50,
        maxPlays: 2000,
        price: 49.00,
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
        maxVideos: 15,
        maxStreamingHours: 200,
        maxPlays: 6000,
        price: 97.00,
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
        name: 'Elite',
        maxVideos: 50,
        maxStreamingHours: 800,
        maxPlays: 25000,
        price: 247.00,
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
