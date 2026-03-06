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
                        Carteirinha de Transporte<span className="hero-title-accent"> Digital</span>
                    </h1>
                    <p className="hero-subtitle">
                        Sistema oficial de gerenciamento de carteirinhas de transporte
                        do município de Nova Ponte. Rápido, seguro e acessível.
                    </p>
                    <div className="hero-actions">
                        <Link to="/access" className="btn btn-lg hero-btn-primary">
                            Acessar
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/access?tab=register" className="btn btn-lg hero-btn-secondary">
                            Solicitar Carteirinha
                        </Link>
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

            {/* Steps */}
            <section className="home-features">
                <div className="container">
                    <h2 className="features-heading">Como funciona</h2>
                    <p className="features-subheading">
                        Tudo o que você precisa saber sobre a carteirinha estudantil digital.
                    </p>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-header">
                                <div className="step-icon step-icon-blue">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <span className="step-number">01</span>
                            </div>
                            <h3 className="step-title">Quem tem direito?</h3>
                            <p className="step-desc">
                                Todo estudante de escola pública ou particular, de qualquer idade, cursando ensino básico, médio, superior ou pós-graduação no município de Nova Ponte.
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-header">
                                <div className="step-icon step-icon-green">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <span className="step-number">02</span>
                            </div>
                            <h3 className="step-title">Como me cadastrar?</h3>
                            <p className="step-desc">
                                Crie sua conta na plataforma, informe seus dados pessoais e acadêmicos e envie a solicitação. Um gestor irá analisar e aprovar sua carteirinha.
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-header">
                                <div className="step-icon step-icon-amber">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="2" width="20" height="20" rx="5" />
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    </svg>
                                </div>
                                <span className="step-number">03</span>
                            </div>
                            <h3 className="step-title">Como funciona o uso?</h3>
                            <p className="step-desc">
                                Apresente o QR Code da carteirinha digital ou a carteirinha física ao motorista. A validação é feita instantaneamente pelo sistema. A carteirinha é pessoal e intransferível.
                            </p>
                        </div>

                        <div className="step-card">
                            <div className="step-header">
                                <div className="step-icon step-icon-red">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <span className="step-number">04</span>
                            </div>
                            <h3 className="step-title">Perdi minha carteirinha, e agora?</h3>
                            <p className="step-desc">
                                Em caso de perda, você pode solicitar uma nova carteirinha diretamente pela plataforma. Entre em contato com a prefeitura para mais informações.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
