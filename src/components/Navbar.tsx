import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../app/supabase';
import CommandPalette from './CommandPalette';
import ProfileSlideout from './ProfileSlideout';
import './Navbar.css';

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

const DASHBOARD_ROUTES: Record<string, string> = {
    student: '/student',
    driver: '/driver',
    executive: '/executive',
    admin: '/admin',
};

function formatCPFDisplay(cpf: string) {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

interface NavLink {
    to: string;
    label: string;
}

function getNavLinks(role: string): NavLink[] {
    const links: NavLink[] = [
        { to: DASHBOARD_ROUTES[role] ?? '/student', label: 'Painel' },
    ];

    links.push({ to: '/help', label: 'Ajuda' });

    return links;
}

export default function Navbar() {
    const { session, user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [topBarHidden, setTopBarHidden] = useState(false);
    const [sitePropsOpen, setSitePropsOpen] = useState(false);
    const [profileSlideoutOpen, setProfileSlideoutOpen] = useState(false);
    const [externalLinkModal, setExternalLinkModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sitePropsRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const isLoggedIn = !!session;
    const role = user?.role ?? 'student';
    const cpf = user?.cpf ?? '';
    const displayName = user?.full_name ?? '';

    useEffect(() => {
        async function loadAvatar() {
            if (!user) { setAvatarUrl(null); return; }

            let path = user.avatar_path;

            // Fallback: usar foto_3x4_path do estudante se não tiver avatar
            if (!path && user.role === 'student') {
                const { data: student } = await supabase
                    .from('students')
                    .select('foto_3x4_path')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (student?.foto_3x4_path) path = student.foto_3x4_path;
            }

            if (path) {
                const { data } = await supabase.storage
                    .from('student-documents')
                    .createSignedUrl(path, 600);
                if (data?.signedUrl) { setAvatarUrl(data.signedUrl); return; }
            }

            setAvatarUrl(null);
        }
        loadAvatar();
    }, [user?.avatar_path, user?.id]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (sitePropsRef.current && !sitePropsRef.current.contains(e.target as Node)) {
                setSitePropsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        function handleScroll() {
            const currentY = window.scrollY;
            if (currentY > lastScrollY.current && currentY > 50) {
                setTopBarHidden(true);
            } else {
                setTopBarHidden(false);
            }
            lastScrollY.current = currentY;
        }
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen((v) => !v);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSignOut = async () => {
        setDropdownOpen(false);
        setMenuOpen(false);
        await signOut();
        navigate('/home');
    };

    const navLinks = isLoggedIn ? getNavLinks(role) : [];

    return (
        <>
            {/* Top Bar */}
            <div className={`top-bar${topBarHidden ? ' top-bar-hidden' : ''}`}>
                <span className="top-bar-text">
                    Este produto se encontra em fase de desenvolvimento &lt;/&gt;
                </span>
            </div>

            {/* Navbar */}
            <nav className={`navbar${topBarHidden ? ' navbar-no-topbar' : ''}`}>
                <div className="navbar-inner">
                    <div className="navbar-left">
                        <button
                            className="navbar-menu-btn"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Abrir menu"
                        >
                            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
                        </button>

                        <Link to={isLoggedIn ? (DASHBOARD_ROUTES[role] ?? '/') : '/'} className="navbar-logo-link">
                            <img
                                src="/logo-prefeitura.png"
                                alt="Prefeitura de Nova Ponte"
                                className="navbar-logo"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </Link>
                    </div>

                    <div className="navbar-right">
                        {isLoggedIn ? (
                            <>
                                <span className={`badge ${ROLE_BADGES[role]} navbar-role-badge`}>
                                    {ROLE_LABELS[role]}
                                </span>

                                <div className="navbar-user-dropdown" ref={dropdownRef}>
                                    <button
                                        className="navbar-avatar-btn"
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        aria-label="Menu do usuário"
                                    >
                                        <span className="navbar-avatar">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="" className="navbar-avatar-img" />
                                            ) : (
                                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                                    <circle cx="16" cy="16" r="16" fill="#F2F4F7" />
                                                    <circle cx="16" cy="13" r="5" fill="#98A2B3" />
                                                    <path d="M7 27c0-5 4-9 9-9s9 4 9 9" stroke="#98A2B3" strokeWidth="2" fill="none" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="navbar-user-name">{displayName || formatCPFDisplay(cpf)}</span>
                                        <svg className={`navbar-chevron ${dropdownOpen ? 'open' : ''}`} width="12" height="7" viewBox="0 0 12 7" fill="none">
                                            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {dropdownOpen && (
                                        <div className="navbar-dropdown">
                                            <div className="navbar-dropdown-header">
                                                <div className="navbar-dropdown-user-info">
                                                    <span className="navbar-dropdown-name">{displayName || 'Usuário'}</span>
                                                    <span className="navbar-dropdown-cpf">{formatCPFDisplay(cpf)}</span>
                                                </div>
                                                <span className={`badge ${ROLE_BADGES[role]}`}>{ROLE_LABELS[role]}</span>
                                            </div>
                                            <div className="navbar-dropdown-divider" />
                                            <button
                                                className="navbar-dropdown-item"
                                                onClick={() => { setDropdownOpen(false); setProfileSlideoutOpen(true); }}
                                            >
                                                <svg className="navbar-dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                                Perfil
                                            </button>
                                            {role === 'student' && (
                                                <Link
                                                    to="/student"
                                                    className="navbar-dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <svg className="navbar-dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="2" y="3" width="20" height="18" rx="2" />
                                                        <path d="M2 9h20" />
                                                    </svg>
                                                    Minha Carteirinha
                                                </Link>
                                            )}
                                            <div className="navbar-dropdown-divider" />
                                            <button className="navbar-dropdown-item navbar-dropdown-signout" onClick={handleSignOut}>
                                                <svg className="navbar-dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                    <polyline points="16 17 21 12 16 7" />
                                                    <line x1="21" y1="12" x2="9" y2="12" />
                                                </svg>
                                                Sair
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <Link to="/access" className="btn btn-primary navbar-btn-signin">
                                Acessar
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Sub-navbar */}
            <div className={`subnav${topBarHidden ? ' subnav-no-topbar' : ''}`}>
                <div className="subnav-inner">
                    <ul className="subnav-links">
                        {isLoggedIn ? (
                            navLinks.map((link) => (
                                <li key={link.to}>
                                    <Link to={link.to} className={`subnav-link${location.pathname === link.to ? ' subnav-link-active' : ''}`}>{link.label}</Link>
                                </li>
                            ))
                        ) : (
                            <>
                                <li><Link to="/help" className={`subnav-link${location.pathname === '/help' ? ' subnav-link-active' : ''}`}>Canais de ajuda</Link></li>
                                <li><Link to="/transparency" className={`subnav-link${location.pathname === '/transparency' ? ' subnav-link-active' : ''}`}>Transparência do Projeto</Link></li>
                                <li><Link to="/key-users" className={`subnav-link${location.pathname === '/key-users' ? ' subnav-link-active' : ''}`}>Usuários chave</Link></li>
                                <li><button type="button" className="subnav-link" onClick={() => setExternalLinkModal(true)}>Prefeitura de Nova Ponte</button></li>
                                <li className="subnav-dropdown-wrap" ref={sitePropsRef}>
                                    <button
                                        className={`subnav-link subnav-dropdown-btn${['/cookies', '/terms', '/privacy'].includes(location.pathname) ? ' subnav-link-active' : ''}${sitePropsOpen ? ' active' : ''}`}
                                        onClick={() => setSitePropsOpen(!sitePropsOpen)}
                                    >
                                        Propriedades do site
                                        <svg className={`subnav-chevron${sitePropsOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </button>
                                    {sitePropsOpen && (
                                        <div className="subnav-dropdown">
                                            <Link to="/cookies" className="subnav-dropdown-item" onClick={() => setSitePropsOpen(false)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                </svg>
                                                Cookies
                                            </Link>
                                            <Link to="/terms" className="subnav-dropdown-item" onClick={() => setSitePropsOpen(false)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                </svg>
                                                Termos de uso
                                            </Link>
                                            <Link to="/privacy" className="subnav-dropdown-item" onClick={() => setSitePropsOpen(false)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                Aviso de privacidade
                                            </Link>
                                        </div>
                                    )}
                                </li>
                            </>
                        )}
                    </ul>

                    <button className="subnav-search-trigger" onClick={() => setPaletteOpen(true)}>
                        <svg className="subnav-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <span className="subnav-search-placeholder">Pesquisar...</span>
                        <kbd className="subnav-search-kbd">Ctrl K</kbd>
                    </button>
                </div>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenProfile={() => setProfileSlideoutOpen(true)} />
            <ProfileSlideout open={profileSlideoutOpen} onClose={() => setProfileSlideoutOpen(false)} />

            {/* Menu Mobile */}
            {menuOpen && (
                <div className="navbar-mobile-menu">
                    {isLoggedIn ? (
                        <>
                            {navLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className="navbar-mobile-link"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="navbar-mobile-divider" />
                            <div className="navbar-mobile-user">
                                <span className={`badge ${ROLE_BADGES[role]}`}>{ROLE_LABELS[role]}</span>
                                <span className="navbar-mobile-name">{displayName}</span>
                            </div>
                            <button className="btn btn-secondary navbar-mobile-signout" onClick={handleSignOut}>
                                Sair
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Início</Link>
                            <Link to="/help" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Canais de ajuda</Link>
                            <Link to="/transparency" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Transparência do Projeto</Link>
                            <Link to="/key-users" className="navbar-mobile-link" onClick={() => setMenuOpen(false)}>Usuários chave</Link>
                            <button type="button" className="navbar-mobile-link" onClick={() => { setMenuOpen(false); setExternalLinkModal(true); }}>Prefeitura de Nova Ponte</button>
                            <div className="navbar-mobile-divider" />
                            <Link to="/access" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Acessar</Link>
                        </>
                    )}
                </div>
            )}
            {/* Modal de redirecionamento externo */}
            {externalLinkModal && (
                <div className="modal-overlay" onClick={() => setExternalLinkModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>Redirecionamento externo</h3>
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '4px 0 0' }}>Você está saindo da plataforma</p>
                            </div>
                        </div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', lineHeight: 1.6, margin: '0 0 20px' }}>
                            Você será redirecionado para o site oficial da <strong>Prefeitura Municipal de Nova Ponte</strong>. Este é um site externo e não faz parte desta plataforma.
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', margin: '0 0 20px', fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                            novaponte.mg.gov.br
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setExternalLinkModal(false)}>
                                Cancelar
                            </button>
                            <a
                                href="https://novaponte.mg.gov.br"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                onClick={() => setExternalLinkModal(false)}
                            >
                                Continuar
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
