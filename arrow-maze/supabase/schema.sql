-- ============================================================================
-- ARROW TRAIL — Supabase schema
-- Run this once in Supabase Studio → SQL Editor (or via `supabase db push`)
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ============================================================================
-- PROFILES — one row per authenticated user, public-safe fields only
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_color text default '#7c5cff',
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  best_level int not null default 0,
  status text not null default 'offline' check (status in ('online','offline','in_game')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- LEVELS — deterministic maze definitions (seed-based, generated client-side)
-- ============================================================================
create table if not exists public.levels (
  id serial primary key,
  index int unique not null,          -- 1, 2, 3 ... progression order
  seed text not null,
  cols int not null,
  rows int not null,
  difficulty text not null check (difficulty in ('easy','medium','hard','expert')),
  par_seconds int not null default 60
);

alter table public.levels enable row level security;
create policy "levels are viewable by everyone" on public.levels for select using (true);

-- ============================================================================
-- SCORES — single-player level completions (best run kept via unique constraint)
-- ============================================================================
create table if not exists public.scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id int not null references public.levels(id) on delete cascade,
  time_ms int not null,
  mistakes int not null default 0,
  stars int not null default 1 check (stars between 1 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, level_id)
);

alter table public.scores enable row level security;
create policy "scores are viewable by everyone" on public.scores for select using (true);
create policy "users can insert their own scores" on public.scores
  for insert with check (auth.uid() = user_id);
create policy "users can update their own scores" on public.scores
  for update using (auth.uid() = user_id);

-- ============================================================================
-- CHALLENGES — one user inviting another to a live race
-- ============================================================================
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  match_id uuid,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
create policy "involved users can view challenges"
  on public.challenges for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy "users can create challenges as themselves"
  on public.challenges for insert with check (auth.uid() = from_user);
create policy "involved users can update challenges"
  on public.challenges for update using (auth.uid() = from_user or auth.uid() = to_user);

-- ============================================================================
-- MATCHES — a live or finished 1v1 race
-- ============================================================================
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  player_one uuid not null references public.profiles(id) on delete cascade,
  player_two uuid not null references public.profiles(id) on delete cascade,
  seed text not null,
  cols int not null default 9,
  rows int not null default 13,
  status text not null default 'active' check (status in ('active','finished','abandoned')),
  winner uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.matches enable row level security;
create policy "involved players can view a match"
  on public.matches for select using (auth.uid() = player_one or auth.uid() = player_two);
create policy "involved players can update a match"
  on public.matches for update using (auth.uid() = player_one or auth.uid() = player_two);
create policy "authenticated users can create matches"
  on public.matches for insert with check (auth.uid() = player_one or auth.uid() = player_two);

-- ============================================================================
-- MATCH_PROGRESS — live cell-by-cell progress of each player in a race
-- (also drives the opponent's live progress bar via realtime)
-- ============================================================================
create table if not exists public.match_progress (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step int not null default 0, -- tiles cleared so far
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_progress enable row level security;
create policy "involved players can view progress"
  on public.match_progress for select using (
    exists (select 1 from public.matches m where m.id = match_id and (m.player_one = auth.uid() or m.player_two = auth.uid()))
  );
create policy "users can upsert their own progress"
  on public.match_progress for insert with check (auth.uid() = user_id);
create policy "users can update their own progress"
  on public.match_progress for update using (auth.uid() = user_id);

-- ============================================================================
-- MESSAGES — direct messages + in-match chat (match_id null => plain DM)
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references public.matches(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
create policy "involved users can view messages"
  on public.messages for select using (
    auth.uid() = from_user or auth.uid() = to_user
    or exists (select 1 from public.matches m where m.id = match_id and (m.player_one = auth.uid() or m.player_two = auth.uid()))
  );
create policy "users can send messages as themselves"
  on public.messages for insert with check (auth.uid() = from_user);

-- ============================================================================
-- Realtime: broadcast changes on these tables to subscribed clients
-- ============================================================================
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_progress;
alter publication supabase_realtime add table public.messages;

-- ============================================================================
-- Seed levels 1-30, difficulty ramps with level index
-- ============================================================================
insert into public.levels (index, seed, cols, rows, difficulty, par_seconds)
select
  i,
  'level-' || i,
  case when i <= 8 then 7 when i <= 18 then 9 else 11 end,
  case when i <= 8 then 9 when i <= 18 then 13 else 17 end,
  case when i <= 8 then 'easy' when i <= 18 then 'medium' when i <= 26 then 'hard' else 'expert' end,
  30 + i * 4
from generate_series(1, 30) as i
on conflict (index) do nothing;
