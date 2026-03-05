import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
    student: '/student',
    driver: '/driver',
    executive: '/executive',
    admin: '/admin',
};

/**
 * Redireciona usuarios ja autenticados das paginas publicas
 * (/access) para o dashboard correto da role.
 */
export default function PublicOnlyRoute() {
    const { session, user, loading } = useAuth();

    if (loading) return null;

    // Usuario autenticado com perfil → redireciona para dashboard
    if (session && user) {
        return <Navigate to={ROLE_ROUTES[user.role] ?? '/student'} replace />;
    }

    // Sem sessao OU sessao sem perfil (falha transitoria) → mostra pagina publica
    return <Outlet />;
}
