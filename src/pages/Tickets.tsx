import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../app/supabase';
import type { Ticket, Message } from '../types';
import usePageTitle from '../hooks/usePageTitle';
import './Tickets.css';
import './Dashboard.css';

interface TicketWithMessages extends Ticket {
    messages?: Message[];
}

export default function Tickets() {
    usePageTitle('Chamados');
    const { user, session } = useAuth();
    const userId = user?.id ?? session?.user?.id;
    const [tickets, setTickets] = useState<TicketWithMessages[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }
        loadTickets();
    }, [userId]);

    useEffect(() => {
        if (selected) loadMessages(selected);
    }, [selected]);

    async function loadTickets() {
        setLoading(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', userId!)
            .order('created_at', { ascending: false });
        if (error) console.warn('[Tickets] query error:', error.message);
        setTickets(data ?? []);
        setLoading(false);
    }

    async function loadMessages(ticketId: string) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        if (error) console.warn('[Tickets] messages error:', error.message);
        setMessages(data ?? []);
    }

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !selected || !userId) return;
        setSending(true);
        const { error } = await supabase.from('messages').insert({
            ticket_id: selected,
            user_id: userId,
            content: newMessage.trim(),
        });
        if (error) console.warn('[Tickets] send error:', error.message);
        setNewMessage('');
        await loadMessages(selected);
        setSending(false);
    }

    const statusBadge: Record<string, string> = {
        open: 'badge-info',
        in_review: 'badge-warning',
        answered: 'badge-neutral',
        approved: 'badge-success',
        rejected: 'badge-error',
    };

    const statusLabel: Record<string, string> = {
        open: 'Aberto',
        in_review: 'Em análise',
        answered: 'Respondido',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
    };

    const selectedTicket = tickets.find((t) => t.id === selected);

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Meus Tickets</h1>
                    <p className="dashboard-sub">Solicitações e perguntas</p>
                </div>
            </div>

            <div className="tickets-layout">
                <div className="tickets-sidebar">
                    {loading ? (
                        <div className="dashboard-loading" />
                    ) : tickets.length === 0 ? (
                        <p className="empty-note">Nenhum ticket ainda.</p>
                    ) : (
                        tickets.map((t) => (
                            <button
                                key={t.id}
                                className={`ticket-sidebar-item ${selected === t.id ? 'active' : ''}`}
                                onClick={() => setSelected(t.id)}
                            >
                                <span className="ticket-type">
                                    {t.type === 'card_creation' ? 'Solicitação de Carteirinha' : 'Pergunta'}
                                </span>
                                <div className="ticket-sidebar-meta">
                                    <span className={`badge ${statusBadge[t.status] ?? 'badge-neutral'}`}>
                                        {statusLabel[t.status] ?? t.status}
                                    </span>
                                    <span className="ticket-date">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="tickets-chat card">
                    {!selected ? (
                        <div className="tickets-empty">
                            <p>💬</p>
                            <p>Selecione um ticket para ver as mensagens</p>
                        </div>
                    ) : (
                        <>
                            <div className="tickets-chat-header">
                                <p className="ticket-type">
                                    {selectedTicket?.type === 'card_creation' ? 'Solicitação de Carteirinha' : 'Pergunta'}
                                </p>
                                <span className={`badge ${statusBadge[selectedTicket?.status ?? 'open']}`}>
                                    {statusLabel[selectedTicket?.status ?? 'open'] ?? selectedTicket?.status}
                                </span>
                            </div>
                            <div className="tickets-messages">
                                {messages.length === 0 && <p className="empty-note">Nenhuma mensagem ainda.</p>}
                                {messages.map((m) => (
                                    <div key={m.id} className={`message-bubble ${m.user_id === userId ? 'mine' : 'theirs'}`}>
                                        <p className="message-text">{m.content}</p>
                                        <p className="message-time">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={sendMessage} className="tickets-input-row">
                                <input
                                    className="input-field"
                                    placeholder="Digite uma mensagem..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                                    Enviar
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
