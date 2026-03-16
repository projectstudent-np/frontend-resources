import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../app/supabase';
import usePageTitle from '../hooks/usePageTitle';
import './Dashboard.css';

interface MasterItem {
    id: string;
    nome: string;
}

export default function RequestCard() {
    usePageTitle('Solicitar Carteirinha');
    const { user, session } = useAuth();
    const userId = user?.id ?? session?.user?.id;
    const navigate = useNavigate();
    const [form, setForm] = useState({
        curso_id: '',
        periodo_id: '',
        student_id_number: '',
        instituicao_id: '',
        cidade_id: '',
    });
    const [periodos, setPeriodos] = useState<MasterItem[]>([]);
    const [instituicoes, setInstituicoes] = useState<MasterItem[]>([]);
    const [cidades, setCidades] = useState<MasterItem[]>([]);
    const [cursos, setCursos] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMasterData();
    }, []);

    async function loadMasterData() {
        setLoadingData(true);
        try {
            const [periodosData, instituicoesData, cidadesData, cursosData] = await Promise.all([
                supabase.from('periodos').select('*').order('nome', { ascending: true }),
                supabase.from('instituicoes').select('*').order('nome', { ascending: true }),
                supabase.from('cidades').select('*').order('nome', { ascending: true }),
                supabase.from('cursos').select('*').order('nome', { ascending: true }),
            ]);

            setPeriodos(periodosData.data ?? []);
            setInstituicoes(instituicoesData.data ?? []);
            setCidades(cidadesData.data ?? []);
            setCursos(cursosData.data ?? []);
        } catch (err) {
            console.error('[RequestCard] error loading master data:', err);
            setError('Erro ao carregar dados. Tente novamente.');
        } finally {
            setLoadingData(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.curso_id || !form.periodo_id || !form.instituicao_id || !form.cidade_id || !form.student_id_number) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }
        if (!userId) { setError('Não autenticado.'); return; }
        setLoading(true);
        try {
            const { error: studentError } = await supabase
                .from('students')
                .insert({
                    user_id: userId,
                    curso_id: form.curso_id,
                    periodo_id: form.periodo_id,
                    instituicao_id: form.instituicao_id,
                    cidade_id: form.cidade_id,
                    student_id_number: form.student_id_number,
                    status: 'pending'
                })
                .select()
                .single();

            if (studentError) throw studentError;

            const { error: ticketError } = await supabase.from('tickets').insert({
                user_id: userId,
                type: 'card_creation',
                status: 'open',
            });

            if (ticketError) console.warn('[RequestCard] ticket insert error:', ticketError.message);

            navigate('/student');
        } catch (err: unknown) {
            console.error('[RequestCard] error:', err);
            setError(err instanceof Error ? err.message : 'Erro ao enviar solicitação.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <div>
                        <span className="skeleton-block" style={{ width: 220, height: 24, display: 'block' }} />
                        <span className="skeleton-block" style={{ width: 260, height: 14, display: 'block', marginTop: 8 }} />
                    </div>
                </div>
                <div className="form-card card" style={{ padding: 'var(--space-5)' }}>
                    <div className="auth-form-grid">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="input-group">
                                <span className="skeleton-block" style={{ width: 100, height: 12, display: 'block' }} />
                                <span className="skeleton-block" style={{ width: '100%', height: 40, display: 'block', borderRadius: 8, marginTop: 6 }} />
                            </div>
                        ))}
                    </div>
                    <span className="skeleton-block" style={{ width: '100%', height: 44, display: 'block', borderRadius: 8, marginTop: 'var(--space-4)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Solicitar Carteirinha</h1>
                    <p className="dashboard-sub">Preencha suas informações acadêmicas</p>
                </div>
            </div>

            <div className="form-card card">
                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <div className="auth-form-grid">
                        <div className="input-group">
                            <label className="input-label" htmlFor="periodo_id">Período / Semestre *</label>
                            <select
                                id="periodo_id"
                                name="periodo_id"
                                className="input-field"
                                value={form.periodo_id}
                                onChange={handleChange}
                            >
                                <option value="">Selecione um período</option>
                                {periodos.map((periodo) => (
                                    <option key={periodo.id} value={periodo.id}>{periodo.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="curso_id">Curso *</label>
                            <select
                                id="curso_id"
                                name="curso_id"
                                className="input-field"
                                value={form.curso_id}
                                onChange={handleChange}
                            >
                                <option value="">Selecione um curso</option>
                                {cursos.map((curso) => (
                                    <option key={curso.id} value={curso.id}>{curso.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="instituicao_id">Instituição *</label>
                            <select
                                id="instituicao_id"
                                name="instituicao_id"
                                className="input-field"
                                value={form.instituicao_id}
                                onChange={handleChange}
                            >
                                <option value="">Selecione uma instituição</option>
                                {instituicoes.map((instituicao) => (
                                    <option key={instituicao.id} value={instituicao.id}>{instituicao.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="cidade_id">Cidade *</label>
                            <select
                                id="cidade_id"
                                name="cidade_id"
                                className="input-field"
                                value={form.cidade_id}
                                onChange={handleChange}
                            >
                                <option value="">Selecione uma cidade</option>
                                {cidades.map((cidade) => (
                                    <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="student_id_number">Matrícula / RA *</label>
                            <input
                                id="student_id_number"
                                name="student_id_number"
                                type="text"
                                className="input-field"
                                value={form.student_id_number}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                </form>
            </div>
        </div>
    );
}
