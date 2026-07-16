-- Run this in Supabase SQL Editor before starting the app

-- tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  is_recurring boolean not null default false,
  last_reset_date date default current_date,
  created_at timestamptz default now()
);

-- notes table
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  note_date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

-- task_logs table (Task & Date tab)
create table task_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null,
  note text,
  log_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  created_at timestamptz default now()
);

-- Row Level Security
alter table tasks enable row level security;
alter table notes enable row level security;
alter table task_logs enable row level security;

create policy "Users manage own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own task_logs" on task_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
