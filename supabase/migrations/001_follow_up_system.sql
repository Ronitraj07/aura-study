-- ============================================================
-- Follow-up System Database Schema
-- Tracks AI modification history across all content types
-- ============================================================

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY, -- Uses the same ID as the FollowUpRequest
  content_type TEXT NOT NULL CHECK (content_type IN ('ppt', 'assignment', 'notes')),
  content_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('full', 'section', 'specific')),
  target_indices INTEGER[] DEFAULT NULL, -- For specific sections/slides/blocks
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result JSONB NOT NULL, -- The modified content that was applied
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own follow-ups" ON follow_ups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create follow-ups for their own content" ON follow_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS follow_ups_content_id_idx ON follow_ups(content_id);
CREATE INDEX IF NOT EXISTS follow_ups_user_id_idx ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS follow_ups_content_type_idx ON follow_ups(content_type);
CREATE INDEX IF NOT EXISTS follow_ups_applied_at_idx ON follow_ups(applied_at DESC);