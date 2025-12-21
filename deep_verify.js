
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function deepVerify() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) { return; }

    const supabase = createClient(url, key);
    const { data: allApps, error } = await supabase.from('appointments').select('*');
    if (error) { console.error(error); return; }

    const targetDay = 20;
    const targetMonth = 11; // 0-indexed? No, let's use 12 for December
    const targetYear = 2025;

    let matched = 0;
    allApps.forEach(a => {
        if (!a.date) return;
        const dStr = String(a.date);

        let isMatch = false;
        if (dStr.includes('2025-12-20')) isMatch = true;
        else if (dStr.includes('20/12/2025')) isMatch = true;
        else if (dStr.includes('20/12/25')) isMatch = true;
        else {
            // Try parsing
            const d = new Date(dStr);
            if (d.getFullYear() === targetYear && (d.getMonth() + 1) === 12 && d.getDate() === targetDay) {
                isMatch = true;
            }
        }

        if (isMatch) {
            matched++;
            console.log(`MATCH [${a.id}]: ${a.date} | Status: ${a.status}`);
        }
    });

    console.log(`Deep Verify Total for 2025-12-20: ${matched}`);
}
deepVerify();
