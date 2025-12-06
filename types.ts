
export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  gender: string; // 'Macho' | 'Fêmea'
  size: string;   // 'Pequeno' | 'Médio' | 'Grande'
  coat: string;   // 'Curto' | 'Longo'
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  complement?: string;
  pets: Pet[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  petId: string;
  serviceId: string;
  date: string; // ISO String
  status: 'agendado' | 'concluido' | 'cancelado';
  notes?: string;
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export type ViewState = 'dashboard' | 'clients' | 'schedule' | 'services';
