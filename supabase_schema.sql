create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  dept text,
  hall text,
  batch text,
  bio text,
  favorites integer[] default array[]::integer[],
  watchlist integer[] default array[]::integer[],
  created_at timestamptz default now()
);

create table if not exists public.logs (
  id text primary key,
  movie_id integer not null,
  movie_title text not null,
  movie_year text not null,
  poster_path text,
  user_id text,
  user_name text not null,
  user_dept text,
  user_hall text,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5.0),
  liked boolean default false,
  rewatch boolean default false,
  watched_date date default current_date,
  review text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.logs enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Logs are viewable by everyone"
  on public.logs for select using (true);

create policy "Anyone can insert logs"
  on public.logs for insert with check (true);
