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
            console.log('Existing columns in "appointments":', Object.keys(sample[0]));
        } else {
            console.log('No appointments found to infer columns.');
        }
    }

    console.log('\n--- Checking "Bento" appointment (Top 50 recent) ---');
    const { data: apps, error: appsError } = await supabase
        .from('appointments')
        .select(`
            *,
            pets (name),
            clients (name)
        `)
        .order('date', { ascending: false })
        .limit(50);

    if (appsError) {
        console.error('Error fetching appointments with joins:', appsError);
    } else {
        const bentoApp = apps.find(a => a.pets && a.pets.name && a.pets.name.toLowerCase().includes('bento'));

        if (bentoApp) {
            console.log('Found Bento appointment:', {
                id: bentoApp.id,
                date: bentoApp.date,
                pet: bentoApp.pets?.name,
                client: bentoApp.clients?.name,
                status: bentoApp.status,
                payment_method: bentoApp.payment_method,
                paid_amount: bentoApp.paid_amount,
                // Check if new columns exist in this object
                owner_name: bentoApp.owner_name,
                pet_name: bentoApp.pet_name,
                payment_status: bentoApp.payment_status
            });
        } else {
            console.log('Bento appointment not found in the last 50 appointments.');
        }

        // Check entries for new columns presence
        const firstApp = apps[0] || {};
        console.log('Checking first app keys for new columns:',
            'owner_name' in firstApp,
            'pet_name' in firstApp,
            'payment_status' in firstApp
        );
    }
}

main();
