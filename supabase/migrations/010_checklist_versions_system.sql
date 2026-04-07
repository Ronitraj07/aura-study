-- Migration: Add checklist versions table for history tracking
-- This completes the version history system across all content types

CREATE TABLE IF NOT EXISTS checklist_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Version snapshot data
  version_name VARCHAR(100) DEFAULT 'Auto-save',
  tasks JSONB NOT NULL, -- Full task array at this version
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_checklist_versions_checklist_id ON checklist_versions(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_versions_user_id ON checklist_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_versions_created_at ON checklist_versions(created_at DESC);

-- Composite index for efficient version retrieval
CREATE INDEX IF NOT EXISTS idx_checklist_versions_user_checklist_created 
ON checklist_versions(user_id, checklist_id, created_at DESC);

-- Add timetable count to user stats (if missing)
-- This adds timetable tracking to profile display
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'timetable_count') THEN
    ALTER TABLE users ADD COLUMN timetable_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes on timetable_versions if missing
-- Ensures performance for timetable history UI
CREATE INDEX IF NOT EXISTS idx_timetable_versions_user_id ON timetable_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_versions_timetable_id ON timetable_versions(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_versions_created_at ON timetable_versions(created_at DESC);

-- Update user stats function to include all content types
-- Ensures profile page shows complete activity
CREATE OR REPLACE FUNCTION refresh_user_stats(target_user_id UUID)
RETURNS VOID AS $func$
BEGIN
  UPDATE users SET
    ppt_count = (SELECT COUNT(*) FROM ppts WHERE user_id = target_user_id),
    assignment_count = (SELECT COUNT(*) FROM assignments WHERE user_id = target_user_id),
    note_count = (SELECT COUNT(*) FROM notes WHERE user_id = target_user_id),
    checklist_count = (SELECT COUNT(DISTINCT id) FROM checklists WHERE user_id = target_user_id),
    checklist_completed = (SELECT COUNT(*) FROM checklists WHERE user_id = target_user_id AND completed = true),
    timetable_count = (SELECT COUNT(*) FROM timetables WHERE user_id = target_user_id)
  WHERE id = target_user_id;
END;
$func$ LANGUAGE plpgsql;