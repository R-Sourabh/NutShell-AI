create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);


create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  details text,
  status text not null default 'planned' check (status in ('planned', 'ready', 'researching')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  requires_research boolean not null default false,
  due_at timestamptz,
  context_summary text,
  context_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Proactively handle orphans: if a profile exists with this email but different ID, 
  -- and that ID no longer exists in auth.users, we should ideally delete it or update it.
  -- To keep it simple and safe, we use 'on conflict (id) do update' but we also 
  -- need to be aware that email unique constraint can fail if id doesn't match.

  insert into public.profiles (id, email, first_name, last_name, full_name, avatar_url)
  values (
    new.id,
    new.email, -- Use the actual email from auth.users
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name'),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      trim(concat(
        coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name'),
        ' ',
        coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name')
      ))
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

  return new;
exception 
  when unique_violation then
    -- If email is already taken by another profile record, try to update that record with the new ID
    -- This handles cases where auth.users was cleared but public.profiles was not.
    update public.profiles 
    set 
      id = new.id,
      email = new.email,
      updated_at = timezone('utc', now())
    where email = new.email;
    return new;
  when others then
    return new;
end;
$$;



drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can read own tasks"
  on public.tasks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks
  for delete
  using (auth.uid() = user_id);
