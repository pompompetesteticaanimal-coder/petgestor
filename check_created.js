
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function checkCreatedToday() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { return; }

    const supabase = createClient(url, key);

    // Dec 20 starts at 03:00Z for user
    const { data: createdToday, error } = await supabase
        .from('appointments')
        .select('*, pet:pets(name)')
        .gte('created_at', '2025-12-20T00:00:00Z');

    if (error) { console.error(error); return; }

    console.log(`Total created starting 2025-12-20T00:00:00Z: ${createdToday.length}`);
    createdToday.forEach(a => {
        console.log(`- [${a.created_at}] Date: ${a.date} | Pet: ${a.pet?.name}`);
    });
}
checkCreatedToday();
