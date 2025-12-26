
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function cleanupDuplicates() {
    let url, key;
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
    } catch (e) {
        console.error('Error reading .env.local', e);
        return;
    }

    if (!url || !key) {
        console.error('Supabase credentials not found in .env.local');
        return;
    }

    const supabase = createClient(url, key);

    console.log('Fetching all appointments...');
    const { data: apps, error } = await supabase
        .from('appointments')
        .select('*');

    if (error) { console.error(error); return; }

    console.log(`Total appointments: ${apps.length}`);

    // Group by unique constraint
    const groups = new Map();
    apps.forEach(app => {
        // Key: client_id + pet_id + date + service_id
        // We exclude created_at and id
        const key = `${app.client_id}|${app.pet_id}|${app.date}|${app.service_id}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(app);
    });

    const idsToDelete = [];
    let duplicateCount = 0;

    for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
            duplicateCount++;
            // Sort by created_at ascending (keep oldest)
            group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            // Keep the first one (index 0), delete the rest
            const toDelete = group.slice(1);
            toDelete.forEach(d => idsToDelete.push(d.id));

            console.log(`Duplicate Group found for key: ${key}`);
            console.log(`  Keeping ID: ${group[0].id} (Created: ${group[0].created_at})`);
            toDelete.forEach(d => console.log(`  Deleting ID: ${d.id} (Created: ${d.created_at})`));
        }
    }

    console.log(`Found ${duplicateCount} groups with duplicates.`);
    console.log(`Total records to delete: ${idsToDelete.length}`);

    if (idsToDelete.length > 0) {
        console.log('Deleting...');
        const { error: delError } = await supabase
            .from('appointments')
            .delete()
            .in('id', idsToDelete);

        if (delError) {
            console.error('Error deleting duplicates:', delError);
        } else {
            console.log('Successfully deleted duplicates.');
        }
    } else {
        console.log('No duplicates to delete.');
    }
}

cleanupDuplicates();
