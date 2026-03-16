import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import type { UserRole } from '../types';
import '../pages/Dashboard.css';

interface PrivateRouteProps {
    allowedRoles?: UserRole[];
}

export default function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
    const { session, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <div>
                        <span className="skeleton-block" style={{ width: 200, height: 24, display: 'block' }} />
                        <span className="skeleton-block" style={{ width: 150, height: 14, display: 'block', marginTop: 8 }} />
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                    {[1, 2, 3].map((i) => (
                        <span key={i} className="skeleton-block" style={{ width: `${70 + i * 20}%`, height: 14, display: 'block', marginBottom: 12 }} />
                    ))}
                </div>
            </div>
        );
    }

    // Sem sessão OU sessão sem perfil → login
    if (!session || !user) {
        return <Navigate to="/access" replace />;
    }

    // Role não permitida
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
