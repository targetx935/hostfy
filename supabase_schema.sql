-- Tabela de Perfis (Extensão da tabela auth.users)
create table
  public.profiles (
    id uuid references auth.users not null primary key,
    full_name text,
    avatar_url text,
    company text,
    plan text default 'free',
    is_admin boolean default false,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de segurança
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- ==============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ==============================================

-- Função que insere o perfil na tabela public.profiles logo após o cadastro
create or replace function public.handle_new_user()
returns trigger as $$
declare
  existing_trial_count int;
begin
  -- Check for fingerprint abuse
  select count(*) into existing_trial_count 
  from public.profiles 
  where browser_fingerprint = new.raw_user_meta_data->>'browser_fingerprint';

  insert into public.profiles (id, email, full_name, avatar_url, browser_fingerprint, subscription_status, trial_ends_at)
  values (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'browser_fingerprint',
    'trialing',
    case when existing_trial_count > 0 then now() else (now() + interval '1 month') end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Gatilho (Trigger) disparado toda vez que um usuário é criado no Supabase Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Corrige (inserindo) os perfis de usuários que já se cadastraram antes do trigger existir
insert into public.profiles (id)
select id from auth.users
where not exists (
  select 1 from public.profiles where profiles.id = auth.users.id
);

-- Tabela de Pastas
create table
  public.folders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    name text not null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

alter table public.folders enable row level security;
create policy "Users can view their own folders." on folders for select using (auth.uid() = user_id);
create policy "Users can insert their own folders." on folders for insert with check (auth.uid() = user_id);
create policy "Users can update their own folders." on folders for update using (auth.uid() = user_id);
create policy "Users can delete their own folders." on folders for delete using (auth.uid() = user_id);

-- Tabela de Vídeos
create table
  public.videos (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    folder_id uuid references public.folders(id),
    title text not null,
    description text,
    url text not null,
    thumbnail_url text,
    duration integer default 0,
    plays integer default 0,
    status text default 'processing', -- processing, ready, error
    mux_asset_id text,
    mux_playback_id text,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

alter table public.videos enable row level security;
create policy "Users can view videos." on videos for select using (auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true);
create policy "Users can insert their own videos." on videos for insert with check (auth.uid() = user_id);
create policy "Users can update their own videos." on videos for update using (auth.uid() = user_id);
create policy "Users can delete their own videos." on videos for delete using (auth.uid() = user_id);

-- Tabela de Configurações do Player por Vídeo
create table
  public.video_settings (
    id uuid default gen_random_uuid() primary key,
    video_id uuid references public.videos(id) on delete cascade not null unique,
    primary_color text default '#e82a58',
    autoplay boolean default true,
    show_controls boolean default false,
    pause_off_screen boolean default false,
    cta_enabled boolean default false,
    cta_time_seconds integer default 0,
    cta_text text,
    cta_url text,
    auto_loop boolean default false,
    mute_on_start boolean default true,
    corner_radius integer default 12,
    smart_progress_bar boolean default true,
    play_button_style text default 'modern',
    watermark_enabled boolean default false,
    watermark_opacity integer default 30,
    unmute_overlay_enabled boolean default true,
    progress_bar_height integer default 15,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

alter table public.video_settings enable row level security;
-- Se o usuário pode ver o vídeo, pode ver as configurações
create policy "Users can view settings of viewable videos." on video_settings for select using (
  exists (select 1 from public.videos where id = video_settings.video_id and user_id = auth.uid())
);
create policy "Users can update settings of their videos." on video_settings for update using (
  exists (select 1 from public.videos where id = video_settings.video_id and user_id = auth.uid())
);
create policy "Users can insert settings for their videos." on video_settings for insert with check (
  exists (select 1 from public.videos where id = video_settings.video_id and user_id = auth.uid())
);

-- ==============================================
-- BUCKET DE STORAGE PARA OS VÍDEOS
-- ==============================================

-- Criando o bucket "videos" (caso não exista)
insert into storage.buckets (id, name, public) 
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Regras de Segurança (RLS) para o Bucket
-- 1. Qualquer pessoa na internet pode ler os vídeos (pois eles serão incorporados em sites)
create policy "Video files are publicly accessible" 
on storage.objects for select 
using ( bucket_id = 'videos' );

-- 2. Apenas usuários autenticados podem fazer upload de vídeos
create policy "Authenticated users can upload videos" 
on storage.objects for insert 
with check ( bucket_id = 'videos' and auth.role() = 'authenticated' );

-- 3. Usuários podem deletar apenas seus próprios vídeos
create policy "Users can delete their own videos" 
on storage.objects for delete 
using ( bucket_id = 'videos' and auth.uid() = owner );

-- ------------------------------------------------------------------------------------------------
-- BUCKET DE STORAGE PARA AVATARES
-- ------------------------------------------------------------------------------------------------

-- Criando o bucket "avatars" (caso não exista)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 1. Qualquer pessoa na internet pode ler os avatares
create policy "Avatar files are publicly accessible" 
on storage.objects for select 
using ( bucket_id = 'avatars' );

-- 2. Apenas usuários autenticados podem fazer upload de avatares
create policy "Authenticated users can upload avatars" 
on storage.objects for insert 
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 3. Usuários podem deletar seus próprios avatares
create policy "Users can delete their own avatars" 
on storage.objects for delete 
using ( bucket_id = 'avatars' and auth.uid() = owner );

-- ------------------------------------------------------------------------------------------------
-- 4. ANALYTICS (video_sessions)
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    max_time_watched real DEFAULT 0,
    cta_clicked boolean DEFAULT false,
    device_type text
);

ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert to video_sessions" ON public.video_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to video_sessions" ON public.video_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow read video_sessions" ON public.video_sessions FOR SELECT USING (
    (select is_admin from public.profiles where id = auth.uid()) = true OR 
    EXISTS (SELECT 1 FROM public.videos WHERE id = video_id AND user_id = auth.uid())
);

-- Trigger para sincronizar o contador de plays na tabela videos
create or replace function public.increment_video_plays()
returns trigger as $$
begin
  update public.videos
  set plays = plays + 1
  where id = new.video_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_video_session_created on public.video_sessions;
create trigger on_video_session_created
  after insert on public.video_sessions
  for each row execute procedure public.increment_video_plays();

-- 5. HEATMAP DE RETENÇÃO (video_retention_points)
-- Registra pings individuais durante a sessão de qual segundo exato estava sendo assistido
CREATE TABLE IF NOT EXISTS public.video_retention_points (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.video_sessions(id) ON DELETE CASCADE,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    second_watched int NOT NULL, -- O marcador de tempo daquele ping
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.video_retention_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert retention points" ON public.video_retention_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view retention points of their videos" ON public.video_retention_points FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.videos WHERE id = video_id AND user_id = auth.uid()));


-- ------------------------------------------------------------------------------------------------
-- 6. TESTES A/B (ab_tests)
-- Permite que o produtor crie uma URL de campanha que sorteia dois vídeos contra si para medir conversão
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ab_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    name text NOT NULL,
    video_a_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    video_b_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'active', -- active, paused, finished
    winner_video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their AB tests" ON ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their AB tests" ON ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their AB tests" ON ab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their AB tests" ON ab_tests FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------------------------
-- 7. VISUALIZAÇÕES DOS TESTES A/B (ab_test_views)
-- Registra qual vídeo o sistema sorteou na hora que o Viewport abriu, pra calcular a métrica de A e B depois
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ab_test_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid REFERENCES public.ab_tests(id) ON DELETE CASCADE,
    video_shown_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    converted boolean DEFAULT false, -- Se clicou no CTA
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ab_test_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert test views (public embed)" ON ab_test_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view views of their tests" ON ab_test_views FOR SELECT
USING (EXISTS (SELECT 1 FROM public.ab_tests WHERE id = test_id AND user_id = auth.uid()));
CREATE POLICY "Users can update views (conversion) of their tests" ON ab_test_views FOR UPDATE
USING (true); -- Public Embed can update the DB from false to true on click

-- ------------------------------------------------------------------------------------------------
-- 8. DOMAIN WHITELISTING
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allowed_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, domain)
);

ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own allowed domains"
    ON public.allowed_domains FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allowed domains"
    ON public.allowed_domains FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own allowed domains"
    ON public.allowed_domains FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------------------------
-- 9. LEADS CAPTURE
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.video_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view leads from their videos" ON public.video_leads FOR SELECT 
USING (auth.uid() = user_id OR (select is_admin from public.profiles where id = auth.uid()) = true);
CREATE POLICY "Anyone can insert leads" ON public.video_leads FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, error
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Service role or system functions will use this

-- ------------------------------------------------------------------------------------------------
-- 10. MIGRATIONS & COLUMN UPDATES
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS exit_intent_pause BOOLEAN DEFAULT false;
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS lead_capture_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS lead_capture_time_seconds INTEGER DEFAULT 10;
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS lead_capture_title TEXT DEFAULT 'Identifique-se para continuar';
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS lead_capture_button_text TEXT DEFAULT 'Continuar Assistindo';
ALTER TABLE public.video_settings ADD COLUMN IF NOT EXISTS social_proof_enabled BOOLEAN DEFAULT false;

-- ------------------------------------------------------------------------------------------------
-- 12. INVOICES (payment history)
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    kiwify_order_id TEXT UNIQUE,
    amount_total INTEGER, -- cents
    plan_name TEXT,
    status TEXT, -- 'paid', 'approved', 'refunded', etc.
    payment_method TEXT,
    customer_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
