
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function dump() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { return; }

    const supabase = createClient(url, key);
    const { data: allApps, error } = await supabase.from('appointments').select('*');
    if (error) { console.error(error); return; }

    console.log(`Total appointments in DB: ${allApps.length}`);

    // Sort by date descending
    allApps.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Print top 50
    allApps.slice(0, 50).forEach(a => {
        console.log(`ID: ${a.id} | Date: ${a.date} | Status: ${a.status}`);
    });
}
dump();
