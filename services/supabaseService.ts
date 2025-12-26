
import { supabase } from './supabaseClient';
import { Client, Service, Appointment, Pet, CostItem } from '../types';

// Helper to map Client from DB (snake_case) to App (camelCase)
const mapClientFromDB = (data: any): Client => ({
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    complement: data.complement,
    createdAt: data.created_at,
    pets: data.pets ? data.pets.map(mapPetFromDB) : [],
});

// --- HELPERS FOR DATA ROBUSTNESS ---
const normalizeDate = (d: any, createdAt?: string) => {
    if (!d) return createdAt ? String(createdAt).split('T')[0] : new Date().toISOString().split('T')[0];
    const str = String(d);
    if (str.includes('/')) {
        // Handle DD/MM/YYYY or DD/MM/YY
        const parts = str.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${year}-${month}-${day}`;
        }
    }
    // Assume ISO or valid string
    return str.substring(0, 10);
};

const safeAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace('R$', '').trim();
    // Handle Brazilian format 1.000,00 -> 1000.00
    if (str.includes(',') && str.includes('.')) {
        return Number(str.replace(/\./g, '').replace(',', '.'));
    }
    // Handle 100,00 -> 100.00
    if (str.includes(',')) {
        return Number(str.replace(',', '.'));
    }
    return Number(str);
};

const mapPetFromDB = (data: any): Pet => ({
    id: data.id,
    name: data.name,
    breed: data.breed,
    age: data.age,
    gender: data.gender,
    size: data.size,
    coat: data.coat,
    notes: data.notes,
});

const mapServiceFromDB = (data: any): Service => ({
    id: data.id,
    name: data.name,
    price: Number(data.price),
    durationMin: data.duration_min,
    description: data.description,
    category: data.category,
    targetSize: data.target_size,
    targetCoat: data.target_coat,
});

const mapAppointmentFromDB = (data: any): Appointment => ({
    id: data.id,
    clientId: data.client_id,
    petId: data.pet_id,
    serviceId: data.service_id,
    additionalServiceIds: data.additional_service_ids,
    date: normalizeDate(data.date, data.created_at),
    status: data.status,
    notes: data.notes,
    durationTotal: data.duration_total,
    googleEventId: data.google_event_id,
    paidAmount: (data.paid_amount !== null && data.paid_amount !== undefined) ? Number(data.paid_amount) : undefined,
    paymentMethod: data.payment_method || data.payment_status, // Fallback to status if method missing? No, user mentioned method. But maybe method is in status?
    rating: data.rating,
    ratingTags: data.rating_tags,
});

export const supabaseService = {
    // --- CLIENTS ---
    getClients: async (): Promise<Client[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('clients')
            .select('*, pets(*)'); // Join with pets

        if (error) {
            console.error('Error fetching clients:', error);
            return [];
        }
        return data.map(mapClientFromDB);
    },

    upsertClient: async (client: Client) => {
        if (!supabase) return;
        const { id, name, phone, address, complement, createdAt } = client;
        const { error } = await supabase.from('clients').upsert({
            id,
            name,
            phone,
            address,
            complement,
            created_at: createdAt,
        });
        if (error) throw error;

        // Upsert Pets
        if (client.pets && client.pets.length > 0) {
            const petsToUpsert = client.pets.map((p) => ({
                id: p.id,
                client_id: id,
                name: p.name,
                breed: p.breed,
                age: p.age,
                gender: p.gender,
                size: p.size,
                coat: p.coat,
                notes: p.notes,
            }));
            const { error: petError } = await supabase.from('pets').upsert(petsToUpsert);
            if (petError) throw petError;
        }
    },

    // --- SERVICES ---
    getServices: async (): Promise<Service[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('services').select('*');
        if (error) {
            console.error('Error fetching services:', error);
            return [];
        }
        return data.map(mapServiceFromDB);
    },

    upsertService: async (service: Service) => {
        if (!supabase) return;
        const { id, name, price, durationMin, description, category, targetSize, targetCoat } = service;
        const { error } = await supabase.from('services').upsert({
            id,
            name,
            price,
            duration_min: durationMin,
            description,
            category,
            target_size: targetSize || null,
            target_coat: targetCoat || null,
        });
        if (error) throw error;
    },

    // --- APPOINTMENTS ---
    getAppointments: async (): Promise<Appointment[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('appointments').select('*');
        if (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
        return data.map(mapAppointmentFromDB);
    },

    upsertAppointment: async (app: Appointment) => {
        if (!supabase) return;
        const {
            id,
            clientId,
            petId,
            serviceId,
            additionalServiceIds,
            date,
            status,
            notes,
            durationTotal,
            googleEventId,
            paidAmount,
            paymentMethod,
            rating,
            ratingTags,
        } = app;

        const { error } = await supabase.from('appointments').upsert({
            id,
            client_id: clientId,
            pet_id: petId,
            service_id: serviceId,
            additional_service_ids: additionalServiceIds || [],
            date,
            status,
            notes,
            duration_total: durationTotal,
            google_event_id: googleEventId,
            paid_amount: paidAmount,
            payment_method: paymentMethod,
            rating,
            rating_tags: ratingTags || [],
        });
        if (error) throw error;
    },

    deleteAppointment: async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;
    },

    // --- COSTS ---
    getCosts: async (): Promise<CostItem[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('costs').select('*');
        if (error) {
            console.error('Error fetching costs:', error);
            return [];
        }
        return data.map((d: any) => ({
            id: d.id,
            month: d.month,
            week: d.week,
            date: normalizeDate(d.date || d.data_vencimento, d.created_at),
            category: d.category || d.descricao || 'Despesa',
            amount: safeAmount(d.amount || d.valor),
            status: d.status
        }));
    },

    upsertCost: async (cost: any) => {
        if (!supabase) return;
        const { id, month, week, date, category, amount, status } = cost;
        const { error } = await supabase.from('costs').upsert({
            id,
            month,
            week,
            date,
            category,
            amount,
            status
        });
        if (error) throw error;
    },

    deleteCost: async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('costs').delete().eq('id', id);
        if (error) throw error;
    },

    // --- DELETIONS ---
    deleteClient: async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    },

    deleteService: async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
    },

    deletePet: async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('pets').delete().eq('id', id);
        if (error) throw error;
    }
};
