CREATE TABLE IF NOT EXISTS saved_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, created_by)
);

CREATE INDEX IF NOT EXISTS idx_saved_views_created_by ON saved_views(created_by);
