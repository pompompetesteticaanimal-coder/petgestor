import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url, key;
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
    key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
} catch (e) {
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const { data: apps } = await supabase
        .from('appointments')
        .select('*, pets(name)')
        .order('date', { ascending: false })
        .limit(100);

    const bento = apps.find(a => a.pets?.name?.toLowerCase().includes('bento'));

    if (bento) {
        console.log('BENTO_DETAILS:', JSON.stringify({
            id: bento.id,
            pet: bento.pets.name,
            payment_method: bento.payment_method,
            paid_amount: bento.paid_amount,
            status: bento.status,
            payment_status: bento.payment_status
        }, null, 2));
    } else {
        console.log('Bento not found');
    }
}
main();
