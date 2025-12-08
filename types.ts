
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
  createdAt?: string; // Data do cadastro (Timestamp)
  pets: Pet[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description: string;
  category: 'principal' | 'adicional';
  targetSize?: string; // 'Pequeno' | 'Médio' | 'Grande' | 'Todos'
  targetCoat?: string; // 'Curto' | 'Longo' | 'Todos'
}

export interface Appointment {
  id: string;
  clientId: string;
  petId: string;
  serviceId: string; // Serviço Principal
  additionalServiceIds?: string[]; // Serviços Adicionais (até 3)
  date: string; // ISO String
  status: 'agendado' | 'concluido' | 'cancelado';
  notes?: string;
  durationTotal?: number;
  googleEventId?: string; // ID para exclusão no Google Calendar
  paidAmount?: number; // Valor Pago
  paymentMethod?: 'Credito' | 'Debito' | 'Pix' | 'Dinheiro' | ''; // Forma de Pagamento
}

export interface CostItem {
  id: string;
  month: string;      // Col A
  week: string;       // Col B
  date: string;       // Col C (Data Custo)
  category: string;   // Col D (Tipo)
  amount: number;     // Col E (Custo)
  status: string;     // Col F (Status - Pago ou Vazio)
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export type ViewState = 'revenue' | 'costs' | 'payments' | 'clients' | 'schedule' | 'services';
