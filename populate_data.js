
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser since we can't assume dotenv is installed or rely on view_file
function parseEnv(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (key && !key.startsWith('#')) env[key] = val;
            }
        });
        return env;
    } catch (e) {
        console.error('Could not read .env file:', e.message);
        return {};
    }
}

const envPath = path.resolve(__dirname, '.env.local');
const env = parseEnv(envPath);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    // process.exit(1); 
    // Don't exit, maybe try .env
    const envPath2 = path.resolve(__dirname, '.env');
    const env2 = parseEnv(envPath2);
    // ... logic to fallback ...
    // For now, just logging error
}

console.log(`Connecting to Supabase at ${SUPABASE_URL}...`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tasks = [
    { title: "Levar tesouras e lâminas para afiar", category: "Manutenção", completed: false, priority: "Média" },
    { title: "Comprar galão de 5L de shampoo neutro", category: "Estoque", completed: false, priority: "Alta" },
    { title: "Avaliar portfólio de tosador freelancer", category: "Equipe", completed: false, priority: "Média" }
];

const costs = [
    {
        category: "Fixo",
        amount: 450.00,
        date: new Date().toISOString().split('T')[0],
        status: "Pago",
        month: "Agosto", // Just a placeholder, will be calculated or ignored by logic
        week: "Semana 1"
    },
    {
        category: "Insumos",
        // Including description in category for now as per app logic
        // "Compra de 10 toalhas novas" -> Category: "Insumos" (or concat?)
        // The app uses `category` for the main text.
        // Let's use the description as the category text, but the logic in Manager normalizes it.
        // Wait, app uses `cost.category` for the display text. 
        // So I should put the "description" there.
        // But for the Chart, it normalizes.
        // So:
        amount: 200.00,
        date: new Date().toISOString().split('T')[0],
        status: "Pago",
        month: "Agosto",
        week: "Semana 1"
    }
];

// Tasks
async function populateTasks() {
    console.log('Populating Tasks...');
    for (const task of tasks) {
        const { error } = await supabase.from('tasks').insert([task]);
        if (error) console.error('Error inserting task:', task.title, error.message);
        else console.log('Inserted task:', task.title);
    }
}

// Costs
async function populateCosts() {
    console.log('Populating Costs...');
    // Item 1: Conta de luz
    const cost1 = { ...costs[0], category: "Conta de luz (uso intenso de sopradores)" };
    const { error: e1 } = await supabase.from('costs').insert([cost1]);
    if (e1) console.error('Error inserting cost 1:', e1.message);
    else console.log('Inserted cost 1');

    // Item 2: Toalhas
    const cost2 = { ...costs[1], category: "Compra de 10 toalhas novas" };
    const { error: e2 } = await supabase.from('costs').insert([cost2]);
    if (e2) console.error('Error inserting cost 2:', e2.message);
    else console.log('Inserted cost 2');
}

async function run() {
    await populateTasks();
    await populateCosts();
    console.log('Done.');
}

run();
