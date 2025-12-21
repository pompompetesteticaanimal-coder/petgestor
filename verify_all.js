
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function verify() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { console.error("Could not read .env.local"); return; }

    const supabase = createClient(url, key);

    // We search for anything starting with 2025-12-20
    const { data: allApps, error } = await supabase
        .from('appointments')
        .select('*, client:clients(name), pet:pets(name)');

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    const todayStr = '2025-12-20';
    const todayApps = allApps.filter(a => a.date && a.date.startsWith(todayStr));

    console.log(`Total appointments in DB for ${todayStr}: ${todayApps.length}`);

    // Check for duplicates or missing data
    const ids = new Set();
    const duplicates = [];
    todayApps.forEach(a => {
        if (ids.has(a.id)) duplicates.push(a.id);
        ids.add(a.id);
    });

    if (duplicates.length > 0) {
        console.log(`WARNING: Found ${duplicates.length} duplicate IDs!`);
    }

    todayApps.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    todayApps.forEach((a, i) => {
        console.log(`${i + 1}. [${a.date}] Pet: ${a.pet?.name || 'UNKNOWN'} | Client: ${a.client?.name || 'UNKNOWN'} | Status: ${a.status}`);
    });
}

verify();
