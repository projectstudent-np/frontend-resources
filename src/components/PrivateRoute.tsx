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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                <div className="dashboard-loading" />
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
