
-- TASKS TABLE SETUP

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  category TEXT, -- 'Banho & Tosa', 'Limpeza', 'Administrativo', 'Outros'
  priority TEXT, -- 'Baixa', 'Média', 'Alta'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow public access (Same as other tables for this single-user app)
CREATE POLICY "Allow public full access" ON tasks FOR ALL USING (true) WITH CHECK (true);
