-- Classroom Pulse update: daily attendance records and saved text-size preference.
-- Run after the original Classroom Pulse schema in Supabase.

alter table public.teacher_settings
  add column if not exists text_size text not null default 'medium';

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status text not null default 'Present' check (status in ('Present', 'Absent', 'Excused')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create index if not exists attendance_records_user_date_idx
  on public.attendance_records(user_id, attendance_date desc);

alter table public.attendance_records enable row level security;

drop policy if exists "Teachers can manage their attendance records" on public.attendance_records;
create policy "Teachers can manage their attendance records" on public.attendance_records
for all using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
