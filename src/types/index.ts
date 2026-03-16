export type UserRole = 'student' | 'driver' | 'executive' | 'admin';

export interface User {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_path: string | null;
  is_active: boolean;
  created_at: string;
}

export type StudentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'info_requested';

export interface Student {
  id: string;
  user_id: string;
  course: string;
  period: string;
  student_id_number: string;
  institution: string;
  city: string;
  status: StudentStatus;
  curso_id?: string;
  periodo_id?: string;
  instituicao_id?: string;
  cidade_id?: string;
  foto_3x4_path?: string;
  comprovante_matricula_path?: string;
  documento_identidade_path?: string;
}

export type CardStatus = 'pending' | 'active' | 'cancelled';

export interface StudentCard {
  id: string;
  student_id: string;
  issue_number: string;
  status: CardStatus;
  issued_at: string;
  expires_at: string;
  qr_code: string;
}

export type TicketType = 'card_creation' | 'question';
export type TicketStatus = 'open' | 'in_review' | 'info_requested' | 'approved' | 'rejected';

export interface Ticket {
  id: string;
  user_id: string;
  type: TicketType;
  status: TicketStatus;
  ticket_number: number;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export type TicketHistoryAction = 'submitted' | 'approved' | 'rejected' | 'info_requested' | 'resubmitted' | 'unblocked';

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action: TicketHistoryAction;
  performed_by: string;
  justification: string | null;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
