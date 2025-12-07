
import { Client, Service, Appointment } from '../types';

const KEYS = {
  CLIENTS: 'petgestor_clients',
  SERVICES: 'petgestor_services',
  APPOINTMENTS: 'petgestor_appointments',
};

// Initial Seed Data - Clientes Genéricos apenas para exemplo inicial
const seedClients: Client[] = [
  {
    id: '1',
    name: 'Cliente Exemplo',
    phone: '(11) 99999-9999',
    address: 'Rua Exemplo, 123',
    pets: [{ 
      id: 'p1', 
      name: 'Pet Teste', 
      breed: 'SRD', 
      age: '2 anos', 
      gender: 'Macho',
      size: 'Médio',
      coat: 'Curto',
      notes: '' 
    }]
  }
];

// Seed Services vazio - Dados agora devem vir da Planilha Google para segurança
const seedServices: Service[] = [];

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
    // Se não tiver dados no localStorage, retorna array vazio para forçar o usuário a sincronizar
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
