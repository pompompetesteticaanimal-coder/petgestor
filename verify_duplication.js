
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function verifyDuplication() {
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

    // Check for duplicates
    // Key: client_id + pet_id + date + service_id
    const seen = new Map();
    const duplicates = [];

    apps.forEach(app => {
        const key = `${app.client_id}|${app.pet_id}|${app.date}|${app.service_id}`;
        if (seen.has(key)) {
            duplicates.push({ original: seen.get(key), duplicate: app });
        } else {
            seen.set(key, app);
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates based on client|pet|date|service:`);
        duplicates.forEach(d => {
            console.log(`Original ID: ${d.original.id}, Duplicate ID: ${d.duplicate.id}`);
            console.log(`  Date: ${d.original.date}`);
            console.log(`  Client: ${d.original.client_id}`);
            console.log(`  Pet: ${d.original.pet_id}`);
        });
    } else {
        console.log('No exact content duplicates found.');
    }

    // Check for ID duplicates (impossible if primary unit test ?)
    const idSeen = new Set();
    apps.forEach(app => {
        if (idSeen.has(app.id)) {
            console.log(`FATAL: ID DUPLICATE FOUND: ${app.id}`);
        }
        idSeen.add(app.id);
    });
}

verifyDuplication();
