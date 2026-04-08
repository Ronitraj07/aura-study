-- ============================================================
-- 013_smart_mode_v2.sql
-- Enhanced Smart Mode with document uploads and 6 content types
-- ============================================================

-- ── smart_mode_uploads: Uploaded documents and parsed content ─────────────
create table if not exists public.smart_mode_uploads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  
  -- File metadata
  original_filename text not null,
  file_type        text not null, -- MIME type
  file_size        bigint not null,
  storage_path     text, -- Path in Supabase Storage (nullable for now)
  
  -- Parsed content
  extracted_text   text not null default '',
  word_count       integer not null default 0,
  pages            integer, -- For PDFs
  
  -- Processing status
  status           text not null default 'uploading'
    check (status in ('uploading', 'parsing', 'ready', 'error')),
  error_message    text,
  
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.smart_mode_uploads enable row level security;

-- RLS policies for smart_mode_uploads
create policy "smart_mode_uploads: select own"
  on public.smart_mode_uploads for select
  using (auth.uid() = user_id);

create policy "smart_mode_uploads: insert own"
  on public.smart_mode_uploads for insert
  with check (auth.uid() = user_id);

create policy "smart_mode_uploads: update own"
  on public.smart_mode_uploads for update
  using (auth.uid() = user_id);

create policy "smart_mode_uploads: delete own"
  on public.smart_mode_uploads for delete
  using (auth.uid() = user_id);

-- Indexes for smart_mode_uploads
create index if not exists smart_mode_uploads_user_id_idx on public.smart_mode_uploads(user_id);
create index if not exists smart_mode_uploads_created_at_idx on public.smart_mode_uploads(created_at desc);
create index if not exists smart_mode_uploads_status_idx on public.smart_mode_uploads(status);

-- Updated trigger
create trigger smart_mode_uploads_updated_at
  before update on public.smart_mode_uploads
  for each row execute procedure public.set_updated_at();


-- ── smart_mode_generations: Generated content from uploads ───────────────
create table if not exists public.smart_mode_generations (
  id               uuid primary key default gen_random_uuid(),
  upload_id        uuid not null references public.smart_mode_uploads(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  
  -- Content type and metadata
  content_type     text not null
    check (content_type in ('notes', 'qa', 'interview_prep', 'exam_questions', 'teaching_notes', 'flashcards')),
  title            text not null,
  
  -- Generation settings
  difficulty_level text default 'medium'
    check (difficulty_level in ('easy', 'medium', 'hard')),
  focus_areas      text[], -- Array of focus areas
  output_format    text default 'standard'
    check (output_format in ('standard', 'detailed', 'concise')),
  
  -- Generated content (JSON structure varies by content_type)
  content_json     jsonb not null default '{}',
  
  -- Status and metadata
  status           text not null default 'generating'
    check (status in ('generating', 'ready', 'error')),
  error_message    text,
  generation_time  interval, -- Time taken to generate
  
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.smart_mode_generations enable row level security;

-- RLS policies for smart_mode_generations
create policy "smart_mode_generations: select own"
  on public.smart_mode_generations for select
  using (auth.uid() = user_id);

create policy "smart_mode_generations: insert own"
  on public.smart_mode_generations for insert
  with check (auth.uid() = user_id);

create policy "smart_mode_generations: update own"
  on public.smart_mode_generations for update
  using (auth.uid() = user_id);

create policy "smart_mode_generations: delete own"
  on public.smart_mode_generations for delete
  using (auth.uid() = user_id);

-- Indexes for smart_mode_generations
create index if not exists smart_mode_generations_upload_id_idx on public.smart_mode_generations(upload_id);
create index if not exists smart_mode_generations_user_id_idx on public.smart_mode_generations(user_id);
create index if not exists smart_mode_generations_content_type_idx on public.smart_mode_generations(content_type);
create index if not exists smart_mode_generations_created_at_idx on public.smart_mode_generations(created_at desc);

-- Updated trigger
create trigger smart_mode_generations_updated_at
  before update on public.smart_mode_generations
  for each row execute procedure public.set_updated_at();


-- ── Add Smart Mode storage bucket (manually via Supabase UI) ─────────────
-- MANUAL STEP: Create 'smart-mode-uploads' bucket in Supabase Storage
-- with public access for authenticated users
--
-- Bucket settings:
-- - Name: smart-mode-uploads
-- - Public: false
-- - File size limit: 10MB
-- - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown, image/jpeg, image/png, image/webp