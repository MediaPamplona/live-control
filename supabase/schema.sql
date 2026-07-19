-- ============================================================
-- Live Control — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Idempotente: seguro re-ejecutar sobre una base ya existente.
-- ============================================================

-- 1. Generador de código de show (6 chars, sin caracteres ambiguos)
create or replace function generate_show_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

create or replace function set_show_code() returns trigger
language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    loop
      new.code := generate_show_code();
      exit when not exists (select 1 from public.shows where code = new.code);
    end loop;
  end if;
  return new;
end;
$$;

-- 2. Tabla shows
create table if not exists public.shows (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null default 'Nuevo Show',
  code       text        unique not null default '',
  created_at timestamptz default now()
);

drop trigger if exists shows_set_code on public.shows;
create trigger shows_set_code
  before insert on public.shows
  for each row execute function set_show_code();

-- 3. Tabla songs
create table if not exists public.songs (
  id            uuid    primary key default gen_random_uuid(),
  show_id       uuid    not null references public.shows(id) on delete cascade,
  title         text    not null default 'Nueva canción',
  duration_secs integer not null default 180 check (duration_secs > 0),
  sort_order    integer not null default 0,
  audio_url     text,
  bpm           numeric,
  created_at    timestamptz default now()
);

alter table public.songs add column if not exists audio_url text;
alter table public.songs add column if not exists bpm numeric;

create index if not exists songs_show_id_idx on public.songs(show_id);
create index if not exists songs_order_idx   on public.songs(show_id, sort_order);

-- 4. Tabla cues (planos de cámara)
create table if not exists public.cues (
  id            uuid    primary key default gen_random_uuid(),
  song_id       uuid    not null references public.songs(id) on delete cascade,
  camera_number integer not null check (camera_number between 0 and 6),
  start_sec     numeric not null check (start_sec >= 0),
  end_sec       numeric not null check (end_sec > start_sec),
  image_url     text,
  note          text,
  created_at    timestamptz default now()
);

create index if not exists cues_song_id_idx on public.cues(song_id);

-- 5. Tabla instruments
create table if not exists public.instruments (
  id         uuid    primary key default gen_random_uuid(),
  show_id    uuid    not null references public.shows(id) on delete cascade,
  name       text    not null default 'Nuevo instrumento',
  color      text    not null default '#8B5CF6',
  sort_order integer not null default 0,
  image_url  text,
  emoji      text,
  created_at timestamptz default now()
);

alter table public.instruments add column if not exists emoji text;

create index if not exists instruments_show_id_idx on public.instruments(show_id);
create index if not exists instruments_order_idx   on public.instruments(show_id, sort_order);

-- 6. Tabla instrument_cues
create table if not exists public.instrument_cues (
  id            uuid    primary key default gen_random_uuid(),
  song_id       uuid    not null references public.songs(id) on delete cascade,
  instrument_id uuid    not null references public.instruments(id) on delete cascade,
  start_sec     numeric not null check (start_sec >= 0),
  end_sec       numeric not null check (end_sec > start_sec),
  note          text,
  created_at    timestamptz default now()
);

create index if not exists instrument_cues_song_id_idx       on public.instrument_cues(song_id);
create index if not exists instrument_cues_instrument_id_idx on public.instrument_cues(instrument_id);

-- 6b. Tabla singers (solistas y cantantes)
create table if not exists public.singers (
  id         uuid    primary key default gen_random_uuid(),
  show_id    uuid    not null references public.shows(id) on delete cascade,
  name       text    not null default 'Nuevo cantante',
  color      text    not null default '#F43F5E',
  sort_order integer not null default 0,
  image_url  text,
  emoji      text,
  created_at timestamptz default now()
);

alter table public.singers add column if not exists emoji text;

create index if not exists singers_show_id_idx on public.singers(show_id);
create index if not exists singers_order_idx   on public.singers(show_id, sort_order);

-- 6c. Tabla singer_cues
create table if not exists public.singer_cues (
  id         uuid    primary key default gen_random_uuid(),
  song_id    uuid    not null references public.songs(id) on delete cascade,
  singer_id  uuid    not null references public.singers(id) on delete cascade,
  start_sec  numeric not null check (start_sec >= 0),
  end_sec    numeric not null check (end_sec > start_sec),
  note       text,
  created_at timestamptz default now()
);

create index if not exists singer_cues_song_id_idx   on public.singer_cues(song_id);
create index if not exists singer_cues_singer_id_idx on public.singer_cues(singer_id);

-- 7. RLS (Row Level Security)
alter table public.shows           enable row level security;
alter table public.songs           enable row level security;
alter table public.cues            enable row level security;
alter table public.instruments     enable row level security;
alter table public.instrument_cues enable row level security;
alter table public.singers         enable row level security;
alter table public.singer_cues     enable row level security;

-- Acceso público de lectura (director y cámaras sin login)
drop policy if exists "public read shows"           on public.shows;
drop policy if exists "public read songs"           on public.songs;
drop policy if exists "public read cues"            on public.cues;
drop policy if exists "public read instruments"     on public.instruments;
drop policy if exists "public read instrument_cues" on public.instrument_cues;
drop policy if exists "public read singers"         on public.singers;
drop policy if exists "public read singer_cues"     on public.singer_cues;

create policy "public read shows"           on public.shows           for select using (true);
create policy "public read songs"           on public.songs           for select using (true);
create policy "public read cues"            on public.cues            for select using (true);
create policy "public read instruments"     on public.instruments     for select using (true);
create policy "public read instrument_cues" on public.instrument_cues for select using (true);
create policy "public read singers"         on public.singers         for select using (true);
create policy "public read singer_cues"     on public.singer_cues     for select using (true);

-- Escritura pública (sin auth por ahora — añadir auth más adelante si se necesita)
drop policy if exists "public write shows"           on public.shows;
drop policy if exists "public write songs"           on public.songs;
drop policy if exists "public write cues"            on public.cues;
drop policy if exists "public write instruments"     on public.instruments;
drop policy if exists "public write instrument_cues" on public.instrument_cues;
drop policy if exists "public write singers"         on public.singers;
drop policy if exists "public write singer_cues"     on public.singer_cues;

create policy "public write shows"           on public.shows           for all using (true) with check (true);
create policy "public write songs"           on public.songs           for all using (true) with check (true);
create policy "public write cues"            on public.cues            for all using (true) with check (true);
create policy "public write instruments"     on public.instruments     for all using (true) with check (true);
create policy "public write instrument_cues" on public.instrument_cues for all using (true) with check (true);
create policy "public write singers"         on public.singers         for all using (true) with check (true);
create policy "public write singer_cues"     on public.singer_cues     for all using (true) with check (true);

-- 8. Buckets de Storage
insert into storage.buckets (id, name, public)
values ('cue-images', 'cue-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('song-audio', 'song-audio', true)
on conflict (id) do nothing;

drop policy if exists "public read cue images"   on storage.objects;
drop policy if exists "public upload cue images" on storage.objects;
drop policy if exists "public update cue images" on storage.objects;
drop policy if exists "public delete cue images" on storage.objects;

create policy "public read cue images"
  on storage.objects for select
  using (bucket_id = 'cue-images');

create policy "public upload cue images"
  on storage.objects for insert
  with check (bucket_id = 'cue-images');

create policy "public update cue images"
  on storage.objects for update
  using (bucket_id = 'cue-images');

create policy "public delete cue images"
  on storage.objects for delete
  using (bucket_id = 'cue-images');

drop policy if exists "public read song audio"   on storage.objects;
drop policy if exists "public upload song audio" on storage.objects;
drop policy if exists "public update song audio" on storage.objects;
drop policy if exists "public delete song audio" on storage.objects;

create policy "public read song audio"
  on storage.objects for select
  using (bucket_id = 'song-audio');

create policy "public upload song audio"
  on storage.objects for insert
  with check (bucket_id = 'song-audio');

create policy "public update song audio"
  on storage.objects for update
  using (bucket_id = 'song-audio');

create policy "public delete song audio"
  on storage.objects for delete
  using (bucket_id = 'song-audio');
