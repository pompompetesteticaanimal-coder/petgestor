
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function verifyExtended() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { return; }

    const supabase = createClient(url, key);

    // Fetch everything from Dec 19 to Dec 22
    const { data: allApps, error } = await supabase
        .from('appointments')
        .select('*, client:clients(name), pet:pets(name)')
        .gte('date', '2025-12-19T00:00:00Z')
        .lte('date', '2025-12-22T00:00:00Z');

    if (error) { console.error(error); return; }

    const days = ['2025-12-19', '2025-12-20', '2025-12-21'];

    days.forEach(day => {
        const dayApps = allApps.filter(a => a.date && a.date.startsWith(day));
        console.log(`Day ${day}: ${dayApps.length} apps`);
        if (day === '2025-12-21') {
            // Show early morning ones
            dayApps.forEach(a => {
                console.log(`  - Tomorrow App: [${a.date}] ${a.pet?.name}`);
            });
        }
    });

    // Total count check
    console.log(`Total apps in window: ${allApps.length}`);
}

verifyExtended();
