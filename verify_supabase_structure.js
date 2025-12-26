import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually reading .env.local
let url, key;
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
    key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
} catch (e) {
    console.error('Error reading .env.local', e);
    process.exit(1);
}

if (!url || !key) {
    console.error('Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log('--- Checking "appointments" table structure ---');

    // Get one appointment to see keys
    const { data: sample, error: sampleError } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);

    if (sampleError) {
        console.error('Error fetching sample:', sampleError);
    } else {
        if (sample && sample.length > 0) {
            const keys = Object.keys(sample[0]);
            console.log('HAS "paid_amount":', keys.includes('paid_amount'));
            console.log('Type of "paid_amount":', typeof sample[0].paid_amount);
            console.log('Sample "paid_amount":', sample[0].paid_amount);
        } else {
            console.log('No appointments found.');
        }
    }
}

main();
