
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
  status: 'agendado' | 'concluido' | 'cancelado' | 'nao_veio';
  notes?: string;
  durationTotal?: number;

  paidAmount?: number; // Valor Pago
  paymentMethod?: 'Credito' | 'Debito' | 'Pix' | 'Dinheiro' | ''; // Forma de Pagamento
  rating?: number; // 1-5
  ratingTags?: string[]; // Tags de avaliação
  googleEventId?: string; // Sync ID
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



export interface AppSettings {
  appName: string;
  logoUrl: string;
  theme: string;
  darkMode?: boolean;
  sidebarOrder: string[];
}

export interface ActivityLog {
  id: string;
  date: string; // ISO String
  user: string; // User Name
  action: string;
  details: string;
  device?: string; // User Agent or Device ID
}

export type ViewState = 'home' | 'revenue' | 'costs' | 'payments' | 'clients' | 'schedule' | 'services' | 'menu' | 'inactive_clients' | 'packages' | 'activity_log';

export const BRAZIL_DOG_BREEDS = [
  'SRD (Vira-lata)',
  'Shih Tzu',
  'Yorkshire Terrier',
  'Poodle',
  'Lhasa Apso',
  'Buldogue Francês',
  'Golden Retriever',
  'Labrador',
  'Maltês',
  'Pug',
  'Spitz Alemão',
  'Pinscher',
  'Schnauzer',
  'Beagle',
  'Border Collie',
  'Daschund (Salsicha)',
  'Rottweiler',
  'Pit Bull',
  'Chow Chow',
  'Cocker Spaniel',
  'Pastor Alemão',
  'Outra'
];
