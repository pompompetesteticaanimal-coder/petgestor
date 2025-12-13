-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, -- We use TEXT because existing IDs might be generic strings like 'cli_demo_1' or 'sheet_...'
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  complement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 2. Pets Table
CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  gender TEXT, -- 'Macho' | 'Fêmea'
  size TEXT,   -- 'Pequeno' | 'Médio' | 'Grande'
  coat TEXT,   -- 'Curto' | 'Longo'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Services Table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_min INTEGER DEFAULT 60,
  description TEXT,
  category TEXT, -- 'principal' | 'adicional'
  target_size TEXT,
  target_coat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  pet_id TEXT REFERENCES pets(id),
  service_id TEXT REFERENCES services(id),
  additional_service_ids TEXT[], -- Array of Service IDs
  date TIMESTAMPTZ NOT NULL,
  status TEXT, -- 'agendado', 'concluido', 'cancelado', 'nao_veio'
  notes TEXT,
  duration_total INTEGER,
  google_event_id TEXT,
  paid_amount NUMERIC,
  payment_method TEXT,
  rating NUMERIC,
  rating_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Costs Table (Optional, if you want to sync costs too)
CREATE TABLE IF NOT EXISTS costs (
  id TEXT PRIMARY KEY,
  month TEXT,
  week TEXT,
  date TIMESTAMPTZ,
  category TEXT,
  amount NUMERIC,
  status TEXT
);

-- Row Level Security (RLS) - Allow public access for now
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON pets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON costs FOR ALL USING (true) WITH CHECK (true);
