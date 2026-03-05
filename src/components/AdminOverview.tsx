import { useEffect, useState } from 'react';
import { supabase } from '../app/supabase';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import './AdminOverview.css';

interface StatusCounts {
    approved: number;
    pending: number;
    rejected: number;
    info_requested: number;
    draft: number;
}

interface MonthlyData {
    month: string;
    approved: number;
    pending: number;
    rejected: number;
}

const PIE_COLORS: Record<string, string> = {
    Aprovados: '#12B76A',
    Pendentes: '#F79009',
    Rejeitados: '#F04438',
    'Info Solicitada': '#3b82f6',
    Rascunho: '#98A2B3',
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function AdminOverview() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalStudents, setTotalStudents] = useState(0);
    const [statusCounts, setStatusCounts] = useState<StatusCounts>({
        approved: 0, pending: 0, rejected: 0, info_requested: 0, draft: 0,
    });
    const [noRequest, setNoRequest] = useState(0);
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                // Parallel queries
                const [usersRes, studentsRes, ticketsRes] = await Promise.all([
                    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                    supabase.from('students').select('user_id, status'),
                    (() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 6);
                        return supabase.from('tickets').select('status, created_at').gte('created_at', d.toISOString());
                    })(),
                ]);

                if (cancelled) return;

                if (usersRes.error || studentsRes.error || ticketsRes.error) {
                    setError('Erro ao carregar dados do painel.');
                    setLoading(false);
                    return;
                }

                const total = usersRes.count ?? 0;
                setTotalStudents(total);

                // Count statuses
                const counts: StatusCounts = { approved: 0, pending: 0, rejected: 0, info_requested: 0, draft: 0 };
                const uniqueUserIds = new Set<string>();
                for (const s of studentsRes.data ?? []) {
                    const st = s.status as keyof StatusCounts;
                    if (st in counts) counts[st]++;
                    uniqueUserIds.add(s.user_id);
                }
                setStatusCounts(counts);
                setNoRequest(Math.max(0, total - uniqueUserIds.size));

                // Monthly tickets (last 6 months)
                const now = new Date();
                const months: MonthlyData[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months.push({
                        month: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
                        approved: 0,
                        pending: 0,
                        rejected: 0,
                    });
                }

                for (const t of ticketsRes.data ?? []) {
                    const d = new Date(t.created_at);
                    const label = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
                    const entry = months.find(m => m.month === label);
                    if (!entry) continue;
                    if (t.status === 'approved') entry.approved++;
                    else if (t.status === 'rejected') entry.rejected++;
                    else entry.pending++;
                }
                setMonthlyData(months);
                setLoading(false);
            } catch {
                if (!cancelled) {
                    setError('Erro ao carregar dados do painel.');
                    setLoading(false);
                }
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="overview-skeleton">
                <div className="overview-skeleton-stats">
                    {[...Array(5)].map((_, i) => <div key={i} className="overview-skeleton-card" />)}
                </div>
                <div className="overview-skeleton-charts">
                    <div className="overview-skeleton-chart" />
                    <div className="overview-skeleton-chart" />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="overview-error">{error}</div>;
    }

    const pieData = [
        { name: 'Aprovados', value: statusCounts.approved },
        { name: 'Pendentes', value: statusCounts.pending },
        { name: 'Rejeitados', value: statusCounts.rejected },
        { name: 'Info Solicitada', value: statusCounts.info_requested },
        { name: 'Rascunho', value: statusCounts.draft },
    ].filter(d => d.value > 0);

    const stats = [
        { label: 'Total Cadastrados', value: totalStudents, variant: 'primary' },
        { label: 'Carteirinhas Ativas', value: statusCounts.approved, variant: 'success' },
        { label: 'Pendentes', value: statusCounts.pending, variant: 'warning' },
        { label: 'Rejeitados', value: statusCounts.rejected, variant: 'error' },
        { label: 'Sem Solicitação', value: noRequest, variant: 'neutral' },
    ];

    return (
        <div>
            {/* Stat cards */}
            <div className="overview-stats">
                {stats.map(s => (
                    <div key={s.label} className={`overview-stat-card overview-stat-card--${s.variant}`}>
                        <div className="overview-stat-label">{s.label}</div>
                        <div className="overview-stat-value">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="overview-charts">
                {/* Pie / Donut */}
                <div className="overview-chart-card">
                    <h3 className="overview-chart-title">Distribuição de Status</h3>
                    <div className="overview-chart-wrap">
                        {pieData.length === 0 ? (
                            <div className="overview-error">Nenhum dado disponível</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                    >
                                        {pieData.map(entry => (
                                            <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Bar chart */}
                <div className="overview-chart-card">
                    <h3 className="overview-chart-title">Solicitações por Mês</h3>
                    <div className="overview-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="approved" name="Aprovados" stackId="a" fill="#12B76A" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="pending" name="Pendentes" stackId="a" fill="#F79009" />
                                <Bar dataKey="rejected" name="Rejeitados" stackId="a" fill="#F04438" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
