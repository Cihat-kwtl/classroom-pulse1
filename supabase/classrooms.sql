-- Classroom Pulse update: multiple classes and sections.
-- Run after the original Classroom Pulse schema in Supabase.

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade text not null default '',
  section text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists classrooms_user_name_idx
  on public.classrooms(user_id, name);

alter table public.classrooms enable row level security;

drop policy if exists "Teachers can manage their classrooms" on public.classrooms;
create policy "Teachers can manage their classrooms" on public.classrooms
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.students
  add column if not exists class_id uuid references public.classrooms(id) on delete set null;

create index if not exists students_class_id_idx
  on public.students(class_id);
