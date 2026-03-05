import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const STORAGE_KEY = 'cookie-consent';

interface CookiePreferences {
    required: true;
    analytics: boolean;
    advertising: boolean;
}

function getSavedPreferences(): CookiePreferences | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const [advertising, setAdvertising] = useState(false);

    useEffect(() => {
        const saved = getSavedPreferences();
        if (!saved) {
            setVisible(true);
        }
    }, []);

    function save(prefs: CookiePreferences) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        setVisible(false);
        setSettingsOpen(false);
    }

    function handleAcceptAll() {
        save({ required: true, analytics: true, advertising: true });
    }

    function handleDeclineAll() {
        save({ required: true, analytics: false, advertising: false });
    }

    function handleConfirmSelected() {
        save({ required: true, analytics, advertising });
    }

    if (!visible) return null;

    return (
        <>
            {/* Banner principal */}
            {!settingsOpen && (
                <div className="cookie-banner">
                    <div className="cookie-banner-content">
                        <div className="cookie-banner-text">
                            <p>
                                Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{' '}
                                <Link to="/privacy">Política de Privacidade</Link> e{' '}
                                <Link to="/terms">Termos de Uso</Link>.
                            </p>
                        </div>
                        <div className="cookie-banner-actions">
                            <button className="btn btn-sm cookie-btn-settings" onClick={() => setSettingsOpen(true)}>
                                Configurações
                            </button>
                            <button className="btn btn-sm cookie-btn-decline" onClick={handleDeclineAll}>
                                Rejeitar
                            </button>
                            <button className="btn btn-sm cookie-btn-accept" onClick={handleAcceptAll}>
                                Aceitar todos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de configurações */}
            {settingsOpen && (
                <div className="cookie-settings-overlay" onClick={() => setSettingsOpen(false)}>
                    <div className="cookie-settings" onClick={(e) => e.stopPropagation()}>
                        <div className="cookie-settings-header">
                            <h3 className="cookie-settings-title">Configurações de cookies</h3>
                            <button
                                className="cookie-settings-close"
                                onClick={() => setSettingsOpen(false)}
                                aria-label="Fechar"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <p className="cookie-settings-desc">
                            Mude suas preferências para cada categoria de cookies. Para mais informações, leia nossa{' '}
                            <Link to="/cookies" target="_blank">Política de Cookies</Link>.
                        </p>

                        <div className="cookie-categories">
                            {/* Obrigatórios */}
                            <div className="cookie-category">
                                <div className="cookie-category-header">
                                    <div className="cookie-category-info">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        <h4 className="cookie-category-title">Cookies obrigatórios</h4>
                                    </div>
                                    <span className="cookie-always-active">Sempre ativos</span>
                                </div>
                                <p className="cookie-category-desc">
                                    Esses cookies são necessários para que nosso site funcione e seja seguro. Não podem ser desativados.
                                </p>
                            </div>

                            {/* Análise */}
                            <div className="cookie-category">
                                <div className="cookie-category-header">
                                    <div className="cookie-category-info">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                                            <path d="M22 12A10 10 0 0 0 12 2v10z" />
                                        </svg>
                                        <h4 className="cookie-category-title">Cookies de análise</h4>
                                    </div>
                                    <label className="cookie-switch">
                                        <input
                                            type="checkbox"
                                            checked={analytics}
                                            onChange={(e) => setAnalytics(e.target.checked)}
                                        />
                                        <span className="cookie-switch-slider" />
                                    </label>
                                </div>
                                <p className="cookie-category-desc">
                                    Nos ajudam a entender como os visitantes interagem com o site, permitindo melhorar a experiência.
                                </p>
                            </div>

                            {/* Anúncios */}
                            <div className="cookie-category">
                                <div className="cookie-category-header">
                                    <div className="cookie-category-info">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                        </svg>
                                        <h4 className="cookie-category-title">Cookies de publicidade</h4>
                                    </div>
                                    <label className="cookie-switch">
                                        <input
                                            type="checkbox"
                                            checked={advertising}
                                            onChange={(e) => setAdvertising(e.target.checked)}
                                        />
                                        <span className="cookie-switch-slider" />
                                    </label>
                                </div>
                                <p className="cookie-category-desc">
                                    Utilizados para exibir anúncios relevantes com base nos seus interesses.
                                </p>
                            </div>
                        </div>

                        <div className="cookie-settings-actions">
                            <button className="btn btn-sm cookie-btn-confirm" onClick={handleConfirmSelected}>
                                Confirmar seleção
                            </button>
                            <button className="btn btn-sm cookie-btn-accept-all" onClick={handleAcceptAll}>
                                Aceitar todos
                            </button>
                            <button className="btn btn-sm cookie-btn-decline-all" onClick={handleDeclineAll}>
                                Rejeitar todos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
