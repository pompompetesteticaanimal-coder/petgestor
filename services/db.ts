
import { Client, Service, Appointment } from '../types';

const KEYS = {
  CLIENTS: 'petgestor_clients',
  SERVICES: 'petgestor_services',
  APPOINTMENTS: 'petgestor_appointments',
};

// Initial Seed Data
const seedClients: Client[] = [
  {
    id: '1',
    name: 'Ana Silva',
    phone: '(11) 99999-9999',
    address: 'Rua das Flores, 123',
    complement: 'Casa 2',
    pets: [{ 
      id: 'p1', 
      name: 'Rex', 
      breed: 'Golden Retriever', 
      age: '3 anos', 
      gender: 'Macho',
      size: 'Grande',
      coat: 'Longo',
      notes: 'Alergia a perfume' 
    }]
  },
  {
    id: '2',
    name: 'Carlos Souza',
    phone: '(11) 98888-8888',
    address: 'Av. Paulista, 1000',
    complement: 'Apto 45',
    pets: [{ 
      id: 'p2', 
      name: 'Mia', 
      breed: 'Gato', 
      age: '2 anos', 
      gender: 'Fêmea',
      size: 'Pequeno',
      coat: 'Curto',
      notes: 'Arisca' 
    }]
  }
];

const seedServices: Service[] = [
  { id: 's1', name: 'Banho Simples (P)', price: 45.00, durationMin: 40, description: 'Banho completo com xampu neutro e secagem.' },
  { id: 's2', name: 'Banho + Tosa Higiênica', price: 70.00, durationMin: 60, description: 'Banho completo e tosa nas patas e áreas íntimas.' },
  { id: 's3', name: 'Tosa Completa', price: 120.00, durationMin: 90, description: 'Corte completo conforme a raça.' },
];

export const db = {
  getClients: (): Client[] => {
    const data = localStorage.getItem(KEYS.CLIENTS);
    return data ? JSON.parse(data) : seedClients;
  },
  saveClients: (clients: Client[]) => {
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
  },
  getServices: (): Service[] => {
    const data = localStorage.getItem(KEYS.SERVICES);
    return data ? JSON.parse(data) : seedServices;
  },
  saveServices: (services: Service[]) => {
    localStorage.setItem(KEYS.SERVICES, JSON.stringify(services));
  },
  getAppointments: (): Appointment[] => {
    const data = localStorage.getItem(KEYS.APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  },
  saveAppointments: (appointments: Appointment[]) => {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }
};
