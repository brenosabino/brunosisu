-- Create the universities table with proper constraints
create table if not exists universities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_name text not null,
  state text not null,
  city text not null,
  course_id text not null,
  min_score numeric not null,
  weight_linguagens numeric not null,
  weight_humanas numeric not null,
  weight_natureza numeric not null,
  weight_matematica numeric not null,
  weight_redacao numeric not null,
  last_update timestamptz not null,
  created_at timestamptz default now() not null,
  constraint universities_unique_course unique (name, course_id)
);

-- Create table to store institutions with medicine courses
create table if not exists medicine_institutions (
  id uuid default gen_random_uuid() primary key,
  co_ies text not null unique,
  name text not null,
  short_name text not null,
  state text not null,
  city text not null,
  last_update timestamptz not null,
  created_at timestamptz default now() not null
);

-- Set timezone to UTC
alter database postgres set timezone to 'UTC';

-- Create indexes for faster queries
create index if not exists universities_state_idx on universities(state);
create index if not exists medicine_institutions_co_ies_idx on medicine_institutions(co_ies);

-- Enable Row Level Security (RLS)
alter table universities enable row level security;
alter table medicine_institutions enable row level security;

-- Create policies that allow:
-- 1. Anonymous users to read data
-- 2. Service role to insert/update data
create policy "Allow anonymous read access"
  on universities for select
  to anon, authenticated
  using (true);

create policy "Allow service role write access"
  on universities for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Allow anonymous read access"
  on medicine_institutions for select
  to anon, authenticated
  using (true);

create policy "Allow service role write access"
  on medicine_institutions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
