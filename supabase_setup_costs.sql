-- 1. Create the Costs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.costs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL, -- Storing as YYYY-MM-DD string as per app logic
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'Pago', -- 'Pago' or 'Pendente'
    month TEXT, -- Optional helper column
    week TEXT, -- Optional helper column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (Security best practice)
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

-- 3. Create a Policy to allow the application to Read/Write
-- This policy allows ANYONE with the API Key (anon/authenticated) to do everything.
-- Since we handle Auth/PIN in the app, this is compatible with your current setup.
DROP POLICY IF EXISTS "Enable full access for all users" ON public.costs;

CREATE POLICY "Enable full access for all users" ON public.costs
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Enable Realtime updates for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.costs;
