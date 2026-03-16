import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import './Home.css';

const ROLE_ROUTES: Record<string, string> = {
    student: '/student',
    driver: '/driver',
    executive: '/executive',
    admin: '/admin',
};

export default function Home() {
    usePageTitle();
    const { user, loading } = useAuth();
    const [hasOfflineCard, setHasOfflineCard] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('npmg_offline_card');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed.cardExpiryDate && new Date(parsed.cardExpiryDate) > new Date()) {
                setHasOfflineCard(true);
            }
        } catch { /* ignore */ }
    }, []);

    // Usuário autenticado → redireciona para o painel da role
    if (!loading && user) {
        return <Navigate to={ROLE_ROUTES[user.role] ?? '/student'} replace />;
    }

    return (
        <div className="home">
            {/* Hero */}
            <section className="hero">
                <div className="hero-bg" aria-hidden="true">
                    <img src="/imagem-fundo-hero.png" alt="" className="hero-image" />
                </div>
                <div className="container hero-content">
                    <h1 className="hero-title">
                        Carteirinha de <br />Transporte<span className="hero-title-accent"> Digital</span>
                    </h1>
                    <p className="hero-subtitle">
                        Plataforma de gerenciamento de carteirinhas de transporte
                        estudantil de Nova Ponte. Rápido, seguro e 100% digital.
                    </p>
                    <div className="hero-actions">
                        <Link to="/access" className="btn btn-lg hero-btn-primary">
                            Acessar plataforma
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/access?tab=register" className="btn btn-lg hero-btn-secondary">
                            Solicitar carteirinha
                        </Link>
                    </div>
                    {hasOfflineCard && (
                        <Link to="/offline" className="hero-offline-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Ver carteirinha offline
                        </Link>
                    )}
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-value">100%</span>
                            <span className="hero-stat-label">Digital</span>
                        </div>
                        <div className="hero-stat-sep" />
                        <div className="hero-stat">
                            <span className="hero-stat-value">QR Code</span>
                            <span className="hero-stat-label">Validação instantânea</span>
                        </div>
                        <div className="hero-stat-sep" />
                        <div className="hero-stat">
                            <span className="hero-stat-value">Gratuito</span>
                            <span className="hero-stat-label">Para estudantes</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Marquee */}
            <section className="marquee-section">
                <div className="marquee-track">
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                    <span className="marquee-text">transporte nova ponte gratuito&nbsp;</span>
                </div>
            </section>

            {/* Steps — Como funciona */}
            <section className="home-steps">
                <div className="container">
                    <div className="steps-header">
                        <span className="steps-label">Passo a passo</span>
                        <h2 className="steps-heading">Como funciona</h2>
                        <p className="steps-subheading">
                            Da solicitação ao embarque — entenda cada etapa do processo da carteirinha estudantil digital.
                        </p>
                    </div>

                    <div className="steps-timeline">
                        <div className="steps-line" aria-hidden="true" />

                        <div className="step-item">
                            <div className="step-marker">
                                <span className="step-marker-number">01</span>
                                <div className="step-marker-dot" />
                            </div>
                            <div className="step-content">
                                <div className="step-content-icon step-content-icon--blue">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <h3 className="step-content-title">Quem tem direito?</h3>
                                <p className="step-content-desc">
                                    Todo estudante de escola pública ou particular, de qualquer idade, cursando ensino básico, médio, superior ou pós-graduação no município de Nova Ponte.
                                </p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-marker">
                                <span className="step-marker-number">02</span>
                                <div className="step-marker-dot" />
                            </div>
                            <div className="step-content">
                                <div className="step-content-icon step-content-icon--green">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <h3 className="step-content-title">Cadastre-se na plataforma</h3>
                                <p className="step-content-desc">
                                    Crie sua conta, informe seus dados pessoais e acadêmicos e envie a solicitação. Um gestor irá analisar e aprovar sua carteirinha.
                                </p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-marker">
                                <span className="step-marker-number">03</span>
                                <div className="step-marker-dot" />
                            </div>
                            <div className="step-content">
                                <div className="step-content-icon step-content-icon--amber">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="2" width="20" height="20" rx="5" />
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    </svg>
                                </div>
                                <h3 className="step-content-title">Apresente o QR Code</h3>
                                <p className="step-content-desc">
                                    Mostre o QR Code da carteirinha digital ou a carteirinha física ao motorista. A validação é instantânea e a carteirinha é pessoal e intransferível.
                                </p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-marker">
                                <span className="step-marker-number">04</span>
                                <div className="step-marker-dot" />
                            </div>
                            <div className="step-content">
                                <div className="step-content-icon step-content-icon--red">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                                <h3 className="step-content-title">Perdeu? Solicite outra</h3>
                                <p className="step-content-desc">
                                    Em caso de perda, solicite uma nova carteirinha diretamente pela plataforma ou entre em contato com a prefeitura para mais informações.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Users — Quem faz acontecer */}
            <section className="home-team">
                <div className="container">
                    <div className="home-team-header">
                        <span className="home-team-label">Quem faz acontecer</span>
                        <h2 className="home-team-heading">Usuários chave</h2>
                        <p className="home-team-sub">
                            Conheça as pessoas responsáveis pelo desenvolvimento e gestão da plataforma de carteirinhas.
                        </p>
                    </div>

                    <div className="home-team-grid">
                        <div className="home-team-card">
                            <div className="home-team-photo-wrap">
                                <img src="/logo-andeilsonuser.jpeg" alt="Andeilson Luiz da Silva" className="home-team-photo" />
                            </div>
                            <div className="home-team-info">
                                <h3 className="home-team-name">Andeilson Luiz da Silva</h3>
                                <span className="home-team-role">Comunicação e Relacionamento</span>
                                <p className="home-team-bio">
                                    Responsável pela comunicação com o público, organização de agenda, articulação com as equipes envolvidas e relacionamento institucional do projeto.
                                </p>
                            </div>
                        </div>

                        <div className="home-team-card">
                            <div className="home-team-photo-wrap">
                                <img src="/logo-pedrouser.png" alt="Pedro Henrique Ferreira Fonseca" className="home-team-photo" />
                            </div>
                            <div className="home-team-info">
                                <h3 className="home-team-name">Pedro Henrique Ferreira Fonseca</h3>
                                <span className="home-team-role">Desenvolvimento de Software</span>
                                <p className="home-team-bio">
                                    Responsável pelo desenvolvimento da plataforma de carteirinhas, incluindo a arquitetura do sistema, implementação das funcionalidades e manutenção técnica.
                                </p>
                                <a
                                    href="https://www.linkedin.com/in/initpedro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="home-team-linkedin"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    LinkedIn
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="home-team-cta">
                        <Link to="/key-users" className="btn btn-secondary btn-md">
                            Ver mais sobre a equipe
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
