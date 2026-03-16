import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const REPO_URL = 'https://github.com/projectstudent-np/frontend-resources';
const API_URL = 'https://api.github.com/repos/projectstudent-np/frontend-resources/commits?per_page=1';

function buildVersion(commitCount: number) {
    const major = 1;
    const minor = Math.floor(commitCount / 10);
    const patch = commitCount % 10;
    return `v${major}.${minor}.${patch}`;
}

export default function Footer() {
    const [version, setVersion] = useState('v1.0.0');

    useEffect(() => {
        let cancelled = false;

        async function fetchCommitCount() {
            try {
                const res = await fetch(API_URL);
                if (!res.ok) return;
                const link = res.headers.get('Link');
                if (link) {
                    const match = link.match(/page=(\d+)>; rel="last"/);
                    if (match) {
                        if (!cancelled) setVersion(buildVersion(Number(match[1])));
                        return;
                    }
                }
                const data = await res.json();
                if (!cancelled) setVersion(buildVersion(Array.isArray(data) ? data.length : 0));
            } catch { /* silently fallback to v1.0.0 */ }
        }

        fetchCommitCount();
        return () => { cancelled = true; };
    }, []);

    return (
        <footer className="footer">
            <div className="footer-bg" aria-hidden="true" />

            <div className="footer-inner">
                {/* Column grid — AbacatePay style */}
                <div className="footer-grid">
                    <div className="footer-col">
                        <h4 className="footer-col-title">Plataforma</h4>
                        <ul className="footer-col-list">
                            <li><Link to="/access">Entrar</Link></li>
                            <li><Link to="/access?tab=register">Criar conta</Link></li>
                            <li><Link to="/home">Início</Link></li>
                            <li><Link to="/help">Central de ajuda</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">Legal</h4>
                        <ul className="footer-col-list">
                            <li><Link to="/terms">Termos de uso</Link></li>
                            <li><Link to="/privacy">Privacidade</Link></li>
                            <li><Link to="/cookies">Cookies</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">Projeto</h4>
                        <ul className="footer-col-list">
                            <li><Link to="/key-users">Usuários chave</Link></li>
                            <li><Link to="/transparency">Transparência</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">Serviços</h4>
                        <ul className="footer-col-list">
                            <li><Link to="/access?tab=register">Solicitar carteirinha</Link></li>
                            <li><Link to="/validate/demo">Validar carteirinha</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Dashed divider */}
                <div className="footer-divider" />

                {/* Logo centered */}
                <div className="footer-logo-row">
                    <img src="/logo-prefeitura.png" alt="Prefeitura de Nova Ponte" className="footer-logo-img" />
                </div>

                {/* Bottom bar */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        &copy; {new Date().getFullYear()} Prefeitura Municipal de Nova Ponte &mdash; Sistema de Carteirinha Digital Estudantil
                    </p>
                    <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-version"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>{version}</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
