import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../app/supabase';
import type { User } from '../types';
import usePageTitle from '../hooks/usePageTitle';
import AdminOverview from '../components/AdminOverview';
import './Dashboard.css';

interface MasterItem {
    id: string;
    nome: string;
    created_at: string;
}

type MasterTable = 'periodos' | 'instituicoes' | 'cidades' | 'cursos';

const ROLE_LABELS: Record<string, string> = {
    student: 'Estudante',
    driver: 'Motorista',
    executive: 'Executivo',
    admin: 'Administrador',
};

const ROLE_BADGES: Record<string, string> = {
    student: 'badge-info',
    driver: 'badge-warning',
    executive: 'badge-neutral',
    admin: 'badge-success',
};

const CARD_STATUS_LABELS: Record<string, string> = {
    active: 'Ativa',
    cancelled: 'Cancelada',
    pending: 'Pendente',
};

const CARD_STATUS_BADGES: Record<string, string> = {
    active: 'badge-success',
    cancelled: 'badge-error',
    pending: 'badge-warning',
};

const ROLES = ['student', 'driver', 'executive', 'admin'];

interface UserCardInfo {
    cardId: string;
    status: string;
    expiresAt: string;
    issuedAt: string;
}

export default function AdminDashboard() {
    usePageTitle('Administrador');
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | MasterTable | 'configuracoes'>('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [periodos, setPeriodos] = useState<MasterItem[]>([]);
    const [instituicoes, setInstituicoes] = useState<MasterItem[]>([]);
    const [cidades, setCidades] = useState<MasterItem[]>([]);
    const [cursos, setCursos] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [cardExpiryDate, setCardExpiryDate] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    // Item modal: add or edit
    const [itemModal, setItemModal] = useState<
        | { mode: 'add'; table: MasterTable }
        | { mode: 'edit'; table: MasterTable; id: string; nome: string }
        | null
    >(null);
    const [modalName, setModalName] = useState('');
    const [modalSaving, setModalSaving] = useState(false);

    // Confirm delete modal (for master data items AND users)
    const [confirmDelete, setConfirmDelete] = useState<
        | { type: 'item'; table: MasterTable; id: string; nome: string }
        | { type: 'user'; id: string; nome: string }
        | null
    >(null);

    // User detail modal
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userCard, setUserCard] = useState<UserCardInfo | null>(null);
    const [userCardLoading, setUserCardLoading] = useState(false);
    const [userActionLoading, setUserActionLoading] = useState(false);
    const [userModalRole, setUserModalRole] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            await Promise.all([
                loadUsers(),
                loadPeriodos(),
                loadInstituicoes(),
                loadCidades(),
                loadCursos(),
                loadSettings(),
            ]);
        } catch (err) {
            console.error('[AdminDashboard] loadData error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadSettings() {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'card_expiry_date')
            .maybeSingle();
        if (data?.value) setCardExpiryDate(data.value);
    }

    async function saveCardExpiry() {
        if (!cardExpiryDate) return;
        setSavingSettings(true);
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'card_expiry_date', value: cardExpiryDate, updated_at: new Date().toISOString() });
        setSavingSettings(false);
        if (error) {
            alert(`Erro ao salvar: ${error.message}`);
        } else {
            showSuccess('Data de validade salva com sucesso!');
        }
    }

    function showSuccess(msg: string) {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    }

    async function loadUsers() {
        const { data } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        setUsers(data ?? []);
    }

    async function loadPeriodos() {
        const { data } = await supabase.from('periodos').select('*').order('nome', { ascending: true });
        setPeriodos(data ?? []);
    }

    async function loadInstituicoes() {
        const { data } = await supabase.from('instituicoes').select('*').order('nome', { ascending: true });
        setInstituicoes(data ?? []);
    }

    async function loadCidades() {
        const { data } = await supabase.from('cidades').select('*').order('nome', { ascending: true });
        setCidades(data ?? []);
    }

    async function loadCursos() {
        const { data } = await supabase.from('cursos').select('*').order('nome', { ascending: true });
        setCursos(data ?? []);
    }

    async function reloadTable(table: MasterTable) {
        if (table === 'periodos') await loadPeriodos();
        if (table === 'instituicoes') await loadInstituicoes();
        if (table === 'cidades') await loadCidades();
        if (table === 'cursos') await loadCursos();
    }

    async function exportJSON() {
        const { data } = await supabase.from('users').select('*');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Master data CRUD ────────────────────────────

    async function handleModalSave() {
        if (!itemModal || !modalName.trim()) return;
        setModalSaving(true);

        if (itemModal.mode === 'add') {
            const { error } = await supabase.from(itemModal.table).insert({ nome: modalName.trim() });
            setModalSaving(false);
            if (error) { alert(`Erro ao adicionar: ${error.message}`); return; }
            showSuccess(`${modalName.trim()} adicionado com sucesso!`);
            await reloadTable(itemModal.table);
        } else {
            const { error } = await supabase.from(itemModal.table).update({ nome: modalName.trim() }).eq('id', itemModal.id);
            setModalSaving(false);
            if (error) { alert(`Erro ao editar: ${error.message}`); return; }
            showSuccess('Item atualizado com sucesso!');
            await reloadTable(itemModal.table);
        }

        setItemModal(null);
        setModalName('');
    }

    async function handleDeleteConfirm() {
        if (!confirmDelete) return;

        if (confirmDelete.type === 'item') {
            const { table, id, nome } = confirmDelete;
            const { error } = await supabase.from(table).delete().eq('id', id);
            setConfirmDelete(null);
            setItemModal(null);
            setModalName('');
            if (error) { alert(`Erro ao deletar: ${error.message}`); return; }
            showSuccess(`${nome} excluído com sucesso!`);
            await reloadTable(table);
        } else {
            const { id, nome } = confirmDelete;
            const { error } = await supabase.from('users').delete().eq('id', id);
            setConfirmDelete(null);
            setSelectedUser(null);
            setUserCard(null);
            if (error) { alert(`Erro ao deletar usuário: ${error.message}`); return; }
            showSuccess(`${nome} removido do sistema!`);
            await loadUsers();
        }
    }

    // ── User modal actions ──────────────────────────

    async function openUserModal(user: User) {
        setSelectedUser(user);
        setUserModalRole(user.role);
        setUserCard(null);
        setUserCardLoading(true);

        // Load card info if student
        const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (studentData) {
            const { data: cardData } = await supabase
                .from('student_cards')
                .select('id, status, expires_at, issued_at')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (cardData) {
                setUserCard({
                    cardId: cardData.id,
                    status: cardData.status,
                    expiresAt: cardData.expires_at,
                    issuedAt: cardData.issued_at,
                });
            }
        }

        setUserCardLoading(false);
    }

    function closeUserModal() {
        setSelectedUser(null);
        setUserCard(null);
        setUserModalRole('');
    }

    async function handleSaveUserRole() {
        if (!selectedUser || userModalRole === selectedUser.role) return;
        setUserActionLoading(true);
        await supabase.from('users').update({ role: userModalRole }).eq('id', selectedUser.id);
        setUserActionLoading(false);
        showSuccess('Papel atualizado com sucesso!');
        await loadUsers();
        setSelectedUser({ ...selectedUser, role: userModalRole as User['role'] });
    }

    async function handleResetPassword() {
        if (!selectedUser) return;
        setUserActionLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
        setUserActionLoading(false);
        if (error) {
            alert(`Erro ao enviar email: ${error.message}`);
        } else {
            showSuccess(`Email de redefinição enviado para ${selectedUser.email}`);
        }
    }

    async function handleCardStatusChange(newStatus: string) {
        if (!userCard) return;
        setUserActionLoading(true);
        const { error } = await supabase
            .from('student_cards')
            .update({ status: newStatus })
            .eq('id', userCard.cardId);
        setUserActionLoading(false);
        if (error) {
            alert(`Erro ao atualizar carteirinha: ${error.message}`);
        } else {
            setUserCard({ ...userCard, status: newStatus });
            showSuccess('Status da carteirinha atualizado!');
        }
    }

    // ── Filtering and helpers ───────────────────────

    const filtered = users.filter(
        (u) =>
            u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    function getItems(table: MasterTable): MasterItem[] {
        if (table === 'periodos') return periodos;
        if (table === 'instituicoes') return instituicoes;
        if (table === 'cidades') return cidades;
        return cursos;
    }

    function openAddModal(table: MasterTable) {
        setModalName('');
        setItemModal({ mode: 'add', table });
    }

    function openEditModal(table: MasterTable, item: MasterItem) {
        setModalName(item.nome);
        setItemModal({ mode: 'edit', table, id: item.id, nome: item.nome });
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('pt-BR');
    }

    function renderMasterTab(table: MasterTable, title: string) {
        const items = getItems(table);
        return (
            <div className="admin-tab-content">
                <div className="admin-tab-header">
                    <h2 className="admin-tab-title">{title}</h2>
                    <button className="btn btn-primary btn-sm" onClick={() => openAddModal(table)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Adicionar opção
                    </button>
                </div>

                {successMessage && <p className="admin-success">{successMessage}</p>}

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Data de Criação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Nenhum item</td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ color: 'var(--gray-900)', fontWeight: 500 }}>{item.nome}</td>
                                        <td>{formatDate(item.created_at)}</td>
                                        <td>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => openEditModal(table, item)}
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Painel Administrativo</h1>
                    <p className="dashboard-sub">Controle completo do sistema</p>
                </div>
                {activeTab === 'users' && (
                    <button className="btn btn-secondary btn-sm" onClick={exportJSON}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar JSON
                    </button>
                )}
            </div>

            <div className="admin-tabs">
                <button className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSearch(''); }}>Visão Geral</button>
                <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setSearch(''); }}>Usuários</button>
                <button className={`admin-tab-btn ${activeTab === 'periodos' ? 'active' : ''}`} onClick={() => { setActiveTab('periodos'); setSearch(''); }}>Períodos</button>
                <button className={`admin-tab-btn ${activeTab === 'instituicoes' ? 'active' : ''}`} onClick={() => { setActiveTab('instituicoes'); setSearch(''); }}>Instituições</button>
                <button className={`admin-tab-btn ${activeTab === 'cidades' ? 'active' : ''}`} onClick={() => { setActiveTab('cidades'); setSearch(''); }}>Cidades</button>
                <button className={`admin-tab-btn ${activeTab === 'cursos' ? 'active' : ''}`} onClick={() => { setActiveTab('cursos'); setSearch(''); }}>Cursos</button>
                <button className={`admin-tab-btn ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={() => { setActiveTab('configuracoes'); setSearch(''); }}>Configurações</button>
            </div>

            {activeTab === 'overview' && <AdminOverview />}

            {loading ? (
                <div className="admin-tab-content">
                    <span className="skeleton-block" style={{ width: 200, height: 20, display: 'block' }} />
                    <div className="admin-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {[120, 180, 100, 80, 100, 80].map((w, i) => (
                                        <th key={i}><span className="skeleton-block" style={{ width: w, height: 14, display: 'block' }} /></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i}>
                                        {[120, 180, 100, 80, 100, 80].map((w, j) => (
                                            <td key={j}><span className="skeleton-block" style={{ width: w, height: 14, display: 'block' }} /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === 'users' && (
                        <div className="admin-tab-content">
                            <h2 className="admin-tab-title">Gerenciar Usuários</h2>

                            {successMessage && <p className="admin-success">{successMessage}</p>}

                            <div className="admin-toolbar">
                                <div className="input-group admin-search">
                                    <input
                                        className="input-field"
                                        type="search"
                                        placeholder="Buscar usuários..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <p className="admin-count">{filtered.length} usuário{filtered.length !== 1 ? 's' : ''}</p>
                            </div>

                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Email</th>
                                            <th>CPF</th>
                                            <th>Papel</th>
                                            <th>Registrado em</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((u) => (
                                            <tr key={u.id}>
                                                <td style={{ color: 'var(--gray-900)', fontWeight: 500 }}>{u.full_name}</td>
                                                <td>{u.email}</td>
                                                <td className="admin-cpf">{u.cpf}</td>
                                                <td>
                                                    <span className={`badge ${ROLE_BADGES[u.role]}`}>
                                                        {ROLE_LABELS[u.role] ?? u.role}
                                                    </span>
                                                </td>
                                                <td>{formatDate(u.created_at)}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => openUserModal(u)}
                                                    >
                                                        Gerenciar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'periodos' && renderMasterTab('periodos', 'Gerenciar Períodos')}
                    {activeTab === 'instituicoes' && renderMasterTab('instituicoes', 'Gerenciar Instituições')}
                    {activeTab === 'cidades' && renderMasterTab('cidades', 'Gerenciar Cidades')}
                    {activeTab === 'cursos' && renderMasterTab('cursos', 'Gerenciar Cursos')}
                    {activeTab === 'configuracoes' && (
                        <div className="admin-tab-content">
                            <h2 className="admin-tab-title">Configurações do Sistema</h2>

                            {successMessage && <p className="admin-success">{successMessage}</p>}

                            <div className="admin-settings-section">
                                <div className="input-group">
                                    <label className="input-label" htmlFor="card-expiry">Data de validade das carteirinhas</label>
                                    <p className="input-hint">Todas as carteirinhas aprovadas terão esta data como validade.</p>
                                    <input
                                        id="card-expiry"
                                        type="date"
                                        className="input-field"
                                        value={cardExpiryDate}
                                        onChange={(e) => setCardExpiryDate(e.target.value)}
                                        style={{ maxWidth: 240 }}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={saveCardExpiry}
                                    disabled={savingSettings || !cardExpiryDate}
                                    style={{ marginTop: 'var(--space-3)' }}
                                >
                                    {savingSettings ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal: Adicionar / Editar item de master data */}
            {itemModal && createPortal(
                <div className="item-modal-overlay" onClick={() => { setItemModal(null); setModalName(''); }}>
                    <div className="item-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="item-modal-title">
                            {itemModal.mode === 'add' ? 'Adicionar opção' : 'Editar opção'}
                        </h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleModalSave(); }}>
                            <div className="input-group">
                                <label className="input-label" htmlFor="item-name">Nome</label>
                                <input
                                    id="item-name"
                                    type="text"
                                    className="input-field"
                                    placeholder="Digite o nome"
                                    value={modalName}
                                    onChange={(e) => setModalName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="item-modal-footer">
                                {itemModal.mode === 'edit' && (
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setConfirmDelete({ type: 'item', table: itemModal.table, id: itemModal.id, nome: itemModal.nome })}
                                    >
                                        Excluir
                                    </button>
                                )}
                                <div className="item-modal-footer-right">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setItemModal(null); setModalName(''); }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={modalSaving || !modalName.trim()}>
                                        {modalSaving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Gerenciar usuário */}
            {selectedUser && createPortal(
                <div className="item-modal-overlay" onClick={closeUserModal}>
                    <div className="user-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="user-modal-header">
                            <h3 className="item-modal-title">{selectedUser.full_name}</h3>
                            <button className="exec-modal-close" onClick={closeUserModal}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="user-modal-body">
                            {/* Info */}
                            <div className="user-modal-info-grid">
                                <div className="user-modal-info-item">
                                    <span className="user-modal-info-label">Email</span>
                                    <span className="user-modal-info-value">{selectedUser.email}</span>
                                </div>
                                <div className="user-modal-info-item">
                                    <span className="user-modal-info-label">CPF</span>
                                    <span className="user-modal-info-value admin-cpf">{selectedUser.cpf}</span>
                                </div>
                                <div className="user-modal-info-item">
                                    <span className="user-modal-info-label">Telefone</span>
                                    <span className="user-modal-info-value">{selectedUser.phone || '—'}</span>
                                </div>
                                <div className="user-modal-info-item">
                                    <span className="user-modal-info-label">Registrado em</span>
                                    <span className="user-modal-info-value">{formatDate(selectedUser.created_at)}</span>
                                </div>
                            </div>

                            {/* Role */}
                            <div className="user-modal-section">
                                <label className="user-modal-section-title">Papel do usuário</label>
                                <div className="user-modal-role-row">
                                    <select
                                        className="admin-role-select"
                                        value={userModalRole}
                                        onChange={(e) => setUserModalRole(e.target.value)}
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                        ))}
                                    </select>
                                    {userModalRole !== selectedUser.role && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={handleSaveUserRole}
                                            disabled={userActionLoading}
                                        >
                                            Salvar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Card status */}
                            <div className="user-modal-section">
                                <label className="user-modal-section-title">Carteirinha estudantil</label>
                                {userCardLoading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <span className="skeleton-block" style={{ width: 140, height: 14, display: 'block' }} />
                                        <span className="skeleton-block" style={{ width: 100, height: 14, display: 'block' }} />
                                    </div>
                                ) : userCard ? (
                                    <div className="user-modal-card-info">
                                        <div className="user-modal-card-row">
                                            <span className="user-modal-info-label">Status</span>
                                            <select
                                                className="admin-role-select"
                                                value={userCard.status}
                                                onChange={(e) => handleCardStatusChange(e.target.value)}
                                                disabled={userActionLoading}
                                            >
                                                <option value="active">{CARD_STATUS_LABELS.active}</option>
                                                <option value="cancelled">{CARD_STATUS_LABELS.cancelled}</option>
                                                <option value="pending">{CARD_STATUS_LABELS.pending}</option>
                                            </select>
                                            <span className={`badge ${CARD_STATUS_BADGES[userCard.status]}`}>
                                                {CARD_STATUS_LABELS[userCard.status] ?? userCard.status}
                                            </span>
                                        </div>
                                        <div className="user-modal-card-dates">
                                            <span>Emitida: {formatDate(userCard.issuedAt)}</span>
                                            <span>Validade: {formatDate(userCard.expiresAt)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="user-modal-hint">Nenhuma carteirinha encontrada.</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="user-modal-section">
                                <label className="user-modal-section-title">Ações</label>
                                <div className="user-modal-actions">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={handleResetPassword}
                                        disabled={userActionLoading}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        Enviar redefinição de senha
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setConfirmDelete({ type: 'user', id: selectedUser.id, nome: selectedUser.full_name })}
                                        disabled={userActionLoading}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Excluir usuário
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Confirmar exclusão */}
            {confirmDelete && createPortal(
                <div className="confirm-modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h3 className="confirm-modal-title">Confirmar exclusão</h3>
                        <p className="confirm-modal-message">
                            Tem certeza que deseja excluir "{confirmDelete.nome}"?
                            {confirmDelete.type === 'user' && ' Todos os dados associados (carteirinha, solicitações) serão removidos.'}
                        </p>
                        <p className="confirm-modal-warning">Esta ação não pode ser revertida.</p>
                        <div className="confirm-modal-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm}>Excluir</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
