-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
-- This table mirrors the auth.users table to store additional user data
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  has_completed_onboarding boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile automatically on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, has_completed_onboarding)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. HABITS TABLE
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  category text, -- 'Health', 'Mindfulness', 'Productivity', etc.
  frequency jsonb, -- Stores array of days e.g. ["Mon", "Wed"] or specific config
  time_of_day text, -- 'Morning', 'Afternoon', 'Evening'
  duration integer, -- in minutes
  difficulty text, -- 'Easy', 'Medium', 'Hard'
  streak_current integer default 0,
  streak_best integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;

create policy "Users can view their own habits." on public.habits
  for select using (auth.uid() = user_id);

create policy "Users can insert their own habits." on public.habits
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own habits." on public.habits
  for update using (auth.uid() = user_id);

create policy "Users can delete their own habits." on public.habits
  for delete using (auth.uid() = user_id);


-- 3. HABIT LOGS TABLE
-- Tracks every time a habit is completed or skipped
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits not null,
  user_id uuid references auth.users not null, -- Denormalized for easier RLS
  status text check (status in ('completed', 'skipped')),
  skip_reason text,
  notes text,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habit_logs enable row level security;

create policy "Users can view their own habit logs." on public.habit_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own habit logs." on public.habit_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own habit logs." on public.habit_logs
  for update using (auth.uid() = user_id);


-- 4. TASKS TABLE
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  priority text check (priority in ('High', 'Medium', 'Low')),
  status text default 'pending' check (status in ('pending', 'completed')),
  due_date timestamp with time zone,
  duration integer, -- estimated duration in minutes
  cognitive_load text, -- 'Light', 'Medium', 'Deep'
  tags jsonb, -- Array of tags
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks." on public.tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks." on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks." on public.tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks." on public.tasks
  for delete using (auth.uid() = user_id);


-- 5. DAILY METRICS TABLE (Energy, Mood, etc.)
create table public.daily_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  date date not null default CURRENT_DATE,
  energy_level integer check (energy_level >= 0 and energy_level <= 100),
  mood_score integer check (mood_score >= 0 and mood_score <= 10),
  focus_level integer check (focus_level >= 0 and focus_level <= 100),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

alter table public.daily_metrics enable row level security;

create policy "Users can view their own metrics." on public.daily_metrics
  for select using (auth.uid() = user_id);

create policy "Users can insert their own metrics." on public.daily_metrics
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own metrics." on public.daily_metrics
  for update using (auth.uid() = user_id);

-- 6. STORAGE POLICIES (Avatars)
-- Note: Buckets are usually created via UI or specific API calls, but policies are SQL.
-- Ensure 'avatars' bucket exists and is public in Dashboard.

-- Allow public read access to avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
-- (Simple policy: anyone authenticated can upload to 'avatars')
create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Allow users to update their own avatar
create policy "Users can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner )
  with check ( bucket_id = 'avatars' and auth.uid() = owner );

