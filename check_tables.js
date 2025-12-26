import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url, key;
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
    key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
} catch (e) {
    console.error('Error reading .env.local', e);
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkTable(name) {
    console.log(`Checking table: "${name}"...`);
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (error) {
        console.log(`❌ Error accessing "${name}":`, error.message);
        return false;
    }
    console.log(`✅ Success accessing "${name}". Found ${data.length} rows.`);
    return true;
}

async function listTables() {
    console.log('--- Listing All Tables ---');
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // information_schema might be restricted. Try guessing common names.
        console.log('Could not list tables (permissions). Checking specific names...');
        await checkTable('costs');
        await checkTable('cost');
        await checkTable('Cost');
        await checkTable('appointments');
    } else {
        console.log('Tables found:', data.map(t => t.table_name));
    }
}

async function main() {
    await listTables();
}

main();
