import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import './Dashboard.css';

export default function Unauthorized() {
    usePageTitle('Acesso Negado');
    return (
        <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--navbar-height) - 100px)', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ width: 56, height: 56, marginBottom: 16 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            </div>
            <h1 className="dashboard-title" style={{ marginBottom: 8 }}>Acesso Negado</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: 'var(--text-sm)' }}>
                Você não tem permissão para acessar esta área.
            </p>
            <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
        </div>
    );
}
