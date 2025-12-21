
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function summary() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { return; }

    const supabase = createClient(url, key);
    const start = '2025-12-20T00:00:00.000Z';
    const end = '2025-12-21T00:00:00.000Z';

    const { data: apps } = await supabase
        .from('appointments')
        .select('*, pets(name)')
        .gte('date', start)
        .lt('date', end);

    console.log(`Summary for today (${apps.length} apps):`);
    apps.forEach(a => {
        const payStr = a.payment_method ? `PAID (${a.payment_method})` : "UNPAID";
        console.log(`- ${a.pets?.name}: ${payStr} | Status: ${a.status}`);
    });
}
summary();
