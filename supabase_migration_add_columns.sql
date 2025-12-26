-- Add new columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS pet_name TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT; -- 'pending', 'paid', 'partially_paid'

-- Optional: Update existing records to populate names from joins (advanced, can be skipped if not needed immediately)
-- UPDATE appointments a
-- SET 
--     owner_name = c.name,
--     pet_name = p.name
-- FROM clients c, pets p
-- WHERE a.client_id = c.id AND a.pet_id = p.id;
