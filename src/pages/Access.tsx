import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../app/supabase';
import usePageTitle from '../hooks/usePageTitle';
import '../components/Navbar.css';
import './Auth.css';

function formatCPF(value: string) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
}

function isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    for (let t = 9; t < 11; t++) {
        let sum = 0;
        for (let i = 0; i < t; i++) sum += Number(digits[i]) * (t + 1 - i);
        const remainder = (sum * 10) % 11;
        if ((remainder === 10 ? 0 : remainder) !== Number(digits[t])) return false;
    }
    return true;
}

type Tab = 'login' | 'register';

export default function Access() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    usePageTitle(activeTab === 'register' ? 'Cadastro' : 'Login');

    // ── Login state ──
    const [loginCpf, setLoginCpf] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [loginStep, setLoginStep] = useState<'cpf' | 'password'>('cpf');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMsg, setForgotMsg] = useState('');
    const passwordRef = useRef<HTMLInputElement>(null);

    // ── Register state ──
    const [regCpf, setRegCpf] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
    const [cpfTaken, setCpfTaken] = useState(false);
    const [checkingCpf, setCheckingCpf] = useState(false);
    const [emailTaken, setEmailTaken] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [regErrors, setRegErrors] = useState<{ cpf?: string; email?: string; password?: string; confirmPassword?: string; terms?: string }>({});
    const [_regTouched, setRegTouched] = useState<{ cpf?: boolean; email?: boolean; password?: boolean; confirmPassword?: boolean }>({});
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [regServerError, setRegServerError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const cpfDebounce = useRef<ReturnType<typeof setTimeout>>(null);
    const emailDebounce = useRef<ReturnType<typeof setTimeout>>(null);
    const pollRef = useRef<ReturnType<typeof setInterval>>(null);

    // Polling: verifica se o e-mail foi confirmado após cadastro
    useEffect(() => {
        if (!regSuccess || emailVerified) return;

        const checkVerification = async () => {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: regEmail,
                    password: regPassword,
                });
                if (!error && data.session) {
                    // E-mail verificado — deslogar e redirecionar para login
                    await supabase.auth.signOut();
                    setEmailVerified(true);
                    if (pollRef.current) clearInterval(pollRef.current);
                    setTimeout(() => switchTab('login'), 1500);
                }
            } catch { /* continua polling */ }
        };

        pollRef.current = setInterval(checkVerification, 4000);
        // Checa imediatamente na primeira vez
        checkVerification();

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [regSuccess, emailVerified]);

    // Auto-focus senha ao expandir login
    useEffect(() => {
        if (loginStep === 'password' && passwordRef.current) {
            passwordRef.current.focus();
        }
    }, [loginStep]);

    // CPF duplicado check (register)
    useEffect(() => {
        const rawCPF = regCpf.replace(/\D/g, '');
        setCpfTaken(false);
        setRegErrors((prev) => ({ ...prev, cpf: undefined }));

        if (rawCPF.length !== 11 || !isValidCPF(regCpf)) return;

        if (cpfDebounce.current) clearTimeout(cpfDebounce.current);

        cpfDebounce.current = setTimeout(async () => {
            setCheckingCpf(true);
            try {
                const { data: existingEmail } = await supabase.rpc(
                    'get_email_by_cpf',
                    { p_cpf: rawCPF }
                );
                if (existingEmail) {
                    setCpfTaken(true);
                    setRegErrors((prev) => ({ ...prev, cpf: 'CPF informado já cadastrado' }));
                }
            } finally {
                setCheckingCpf(false);
            }
        }, 500);

        return () => {
            if (cpfDebounce.current) clearTimeout(cpfDebounce.current);
        };
    }, [regCpf]);

    // Email duplicado check (register)
    useEffect(() => {
        setEmailTaken(false);
        setRegErrors((prev) => ({ ...prev, email: undefined }));

        if (!emailHasAt) return;

        if (emailDebounce.current) clearTimeout(emailDebounce.current);

        emailDebounce.current = setTimeout(async () => {
            setCheckingEmail(true);
            try {
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', regEmail.trim().toLowerCase())
                    .maybeSingle();
                if (existing) {
                    setEmailTaken(true);
                    setRegErrors((prev) => ({ ...prev, email: 'E-mail já cadastrado' }));
                }
            } finally {
                setCheckingEmail(false);
            }
        }, 500);

        return () => {
            if (emailDebounce.current) clearTimeout(emailDebounce.current);
        };
    }, [regEmail]);

    // Regras de senha (register)
    const hasMinLength = regPassword.length >= 8;
    const hasNumber = /\d/.test(regPassword);
    const hasUppercase = /[A-Z]/.test(regPassword);
    const passedRules = [hasMinLength, hasNumber, hasUppercase].filter(Boolean).length;
    const strengthLabel = passedRules === 0 ? '' : passedRules === 1 ? 'Fraca' : passedRules === 2 ? 'Média' : 'Protegida';
    const strengthClass = passedRules === 1 ? 'weak' : passedRules === 2 ? 'medium' : passedRules === 3 ? 'strong' : '';

    const emailHasAt = regEmail.includes('@') && regEmail.includes('.');

    const switchTab = (tab: Tab) => {
        setActiveTab(tab);
        // Reset login
        setLoginCpf('');
        setLoginPassword('');
        setShowLoginPassword(false);
        setRemember(false);
        setLoginError('');
        setLoginLoading(false);
        setLoginSuccess(false);
        setLoginStep('cpf');
        // Reset register
        setRegCpf('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setShowRegPassword(false);
        setShowRegConfirmPassword(false);
        setCpfTaken(false);
        setCheckingCpf(false);
        setEmailTaken(false);
        setCheckingEmail(false);
        setRegErrors({});
        setRegTouched({});
        setRegServerError('');
        setRegLoading(false);
        setRegSuccess(false);
        setEmailVerified(false);
        setAcceptedTerms(false);
        if (pollRef.current) clearInterval(pollRef.current);
        // Update URL
        if (tab === 'register') {
            setSearchParams({ tab: 'register' });
        } else {
            setSearchParams({});
        }
    };

    // ── Login handlers ──
    const handleLoginCpfSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginCpf.replace(/\D/g, '').length !== 11) {
            setLoginError('Informe um CPF válido.');
            return;
        }
        setLoginError('');
        setLoginStep('password');
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginPassword) {
            setLoginError('Informe sua senha.');
            return;
        }
        setLoginLoading(true);
        setLoginError('');
        try {
            await authService.loginWithCPF(loginCpf.replace(/\D/g, ''), loginPassword);
            setLoginSuccess(true);
        } catch (err: unknown) {
            setLoginError(err instanceof Error ? err.message : 'CPF ou senha inválidos.');
        } finally {
            setLoginLoading(false);
        }
    };

    // ── Register handlers ──
    const validateRegister = (): boolean => {
        const e: typeof regErrors = {};
        if (!isValidCPF(regCpf)) e.cpf = 'Informe um CPF válido';
        if (cpfTaken) e.cpf = 'CPF informado já cadastrado';
        if (emailTaken) e.email = 'E-mail já cadastrado';
        else if (!emailHasAt && regEmail.length > 0) e.email = 'Informe um email válido';
        if (!regEmail) e.email = 'Informe um email';
        if (!hasMinLength || !hasNumber || !hasUppercase) e.password = 'A senha não atende os requisitos';
        if (regPassword !== regConfirmPassword) e.confirmPassword = 'As senhas não coincidem';
        if (!regConfirmPassword) e.confirmPassword = 'Confirme sua senha';
        if (!acceptedTerms) e.terms = 'Você deve aceitar os termos para continuar';
        setRegErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateRegister()) return;
        setRegLoading(true);
        setRegServerError('');
        try {
            await authService.register({ cpf: regCpf, email: regEmail, password: regPassword });
            setRegSuccess(true);
        } catch (err: unknown) {
            setRegServerError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
        } finally {
            setRegLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (loginCpf.replace(/\D/g, '').length !== 11) {
            setForgotMsg('Informe seu CPF acima para recuperar a senha.');
            return;
        }
        setForgotLoading(true);
        setForgotMsg('');
        setLoginError('');
        try {
            const rawCPF = loginCpf.replace(/\D/g, '');
            const { data: email } = await supabase.rpc('get_email_by_cpf', { p_cpf: rawCPF });
            if (!email) {
                setForgotMsg('Se houver uma conta com este CPF, um e-mail de redefinição será enviado.');
                return;
            }
            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
            if (resetErr) throw resetErr;
            const masked = (email as string).replace(/^(.{2})(.*)(@)/, (_m: string, a: string, b: string, c: string) => a + '*'.repeat(b.length) + c);
            setForgotMsg(`E-mail de redefinição enviado para ${masked}`);
        } catch {
            setForgotMsg('Se houver uma conta com este CPF, um e-mail de redefinição será enviado.');
        } finally {
            setForgotLoading(false);
        }
    };

    const isRegSubmitDisabled = regLoading || !regCpf || cpfTaken || checkingCpf || !regEmail || emailTaken || checkingEmail || !regPassword || !acceptedTerms;

    // ── SVGs ──
    const EyeOpen = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
    const EyeClosed = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );

    return (
        <div className="auth-layout">
            {/* Top bar */}
            <div className="top-bar">
                <span className="top-bar-text">
                    Este produto se encontra em fase de desenvolvimento &lt;/&gt;
                </span>
            </div>

            {/* Conteúdo split */}
            <div className="auth-page">
            {/* Lado esquerdo: imagem de fundo */}
            <div className="auth-side" />

            {/* Lado direito: formulário */}
            <div className="auth-form-side">
                <div className="auth-card">
                    <Link to="/home" className="auth-back-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        Voltar ao início
                    </Link>

                    {/* ── Login ── */}
                    {activeTab === 'login' && (
                        <>
                            <h1 className="auth-title">Acesse sua conta</h1>
                            <p className="auth-desc">Entre com seu CPF e senha</p>

                            {loginSuccess ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
                                    Login realizado! Redirecionando...
                                </p>
                            ) : (
                                <form
                                    onSubmit={loginStep === 'cpf' ? handleLoginCpfSubmit : handleLoginSubmit}
                                    className="auth-form"
                                    noValidate
                                >
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="login-cpf">CPF</label>
                                        <input
                                            id="login-cpf"
                                            type="text"
                                            inputMode="numeric"
                                            className={`input-field${loginError && loginStep === 'cpf' ? ' error' : ''}`}
                                            placeholder="000.000.000-00"
                                            value={loginCpf}
                                            maxLength={14}
                                            onChange={(e) => {
                                                setLoginCpf(formatCPF(e.target.value));
                                                setLoginError('');
                                            }}
                                            autoComplete="off"
                                            disabled={loginStep === 'password' || loginLoading}
                                        />
                                    </div>

                                    {/* Expand: senha + opções */}
                                    <div className={`auth-login-expand${loginStep === 'password' ? ' expanded' : ''}`}>
                                        <div className="auth-login-expand-inner">
                                            <div className="input-group">
                                                <label className="input-label" htmlFor="login-password">Senha</label>
                                                <div className="input-password-wrap">
                                                    <input
                                                        ref={passwordRef}
                                                        id="login-password"
                                                        type={showLoginPassword ? 'text' : 'password'}
                                                        className={`input-field${loginError && loginStep === 'password' ? ' error' : ''}`}
                                                        placeholder="••••••••"
                                                        value={loginPassword}
                                                        onChange={(e) => {
                                                            setLoginPassword(e.target.value);
                                                            setLoginError('');
                                                        }}
                                                        autoComplete="current-password"
                                                        disabled={loginLoading}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="input-eye-btn"
                                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                        tabIndex={-1}
                                                        aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                                    >
                                                        {showLoginPassword ? EyeClosed : EyeOpen}
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="auth-forgot-link"
                                                    onClick={handleForgotPassword}
                                                    disabled={forgotLoading}
                                                >
                                                    {forgotLoading ? 'Enviando...' : 'Esqueci minha senha'}
                                                </button>
                                                {forgotMsg && <span className="auth-forgot-msg">{forgotMsg}</span>}
                                            </div>

                                            <label className="auth-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={remember}
                                                    onChange={(e) => setRemember(e.target.checked)}
                                                />
                                                <span className="auth-checkbox-mark" />
                                                <span className="auth-checkbox-text">Lembrar minha senha</span>
                                            </label>
                                        </div>
                                    </div>

                                    {loginError && <p className="auth-error">{loginError}</p>}

                                    {loginStep === 'cpf' ? (
                                        <button type="submit" className="btn btn-primary auth-btn">
                                            Acessar
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="btn btn-primary auth-btn"
                                            disabled={loginLoading}
                                        >
                                            {loginLoading ? 'Entrando...' : 'Entrar'}
                                        </button>
                                    )}

                                    {loginStep === 'password' && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary auth-btn"
                                            onClick={() => {
                                                setLoginStep('cpf');
                                                setLoginPassword('');
                                                setLoginError('');
                                            }}
                                        >
                                            Voltar
                                        </button>
                                    )}
                                </form>
                            )}

                            <div className="auth-divider" />
                            <button
                                type="button"
                                className="auth-switch-card"
                                onClick={() => switchTab('register')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <line x1="19" y1="8" x2="19" y2="14" />
                                    <line x1="22" y1="11" x2="16" y2="11" />
                                </svg>
                                <div className="auth-switch-text">
                                    <span>Não tem uma conta?</span>
                                    <span className="auth-switch-action">Crie sua conta</span>
                                </div>
                                <svg className="auth-switch-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </>
                    )}

                    {/* ── Cadastro ── */}
                    {activeTab === 'register' && (
                        <>
                            <h1 className="auth-title">Criar Conta</h1>
                            <p className="auth-desc">Cadastre-se para acessar o sistema</p>

                            {regSuccess ? (
                                <div className="auth-verify-email">
                                    {emailVerified ? (
                                        <>
                                            <div className="auth-verify-icon auth-verify-done">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <p className="auth-verify-title">E-mail verificado!</p>
                                            <p className="auth-verify-desc">Redirecionando para o login...</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="auth-verify-icon">
                                                <svg className="auth-verify-spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                </svg>
                                            </div>
                                            <p className="auth-verify-title">Verifique sua conta</p>
                                            <p className="auth-verify-desc">
                                                Enviamos um e-mail de verificação para <strong>{regEmail}</strong>. Acesse sua caixa de entrada e clique no link para confirmar sua conta.
                                            </p>
                                            <p className="auth-verify-hint">Aguardando confirmação...</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
                                    {/* CPF */}
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="reg-cpf">CPF</label>
                                        <input
                                            id="reg-cpf"
                                            type="text"
                                            inputMode="numeric"
                                            className={`input-field${regErrors.cpf || cpfTaken ? ' error' : ''}`}
                                            placeholder="000.000.000-00"
                                            value={regCpf}
                                            maxLength={14}
                                            onChange={(e) => {
                                                setRegCpf(formatCPF(e.target.value));
                                                setCpfTaken(false);
                                                setRegErrors((prev) => ({ ...prev, cpf: undefined }));
                                            }}
                                            onBlur={() => {
                                                setRegTouched((prev) => ({ ...prev, cpf: true }));
                                                if (!regCpf) setRegErrors((prev) => ({ ...prev, cpf: 'Campo obrigatório' }));
                                            }}
                                            autoComplete="off"
                                        />
                                        {checkingCpf && <span className="input-hint">Verificando CPF...</span>}
                                        {regErrors.cpf && <span className="input-error">{regErrors.cpf}</span>}
                                    </div>

                                    {/* Email */}
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="reg-email">Email</label>
                                        <input
                                            id="reg-email"
                                            type="email"
                                            className={`input-field${regErrors.email || emailTaken || (regEmail.length > 0 && !emailHasAt) ? ' error' : ''}`}
                                            placeholder="seu@email.com"
                                            value={regEmail}
                                            onChange={(e) => {
                                                setRegEmail(e.target.value);
                                                setEmailTaken(false);
                                                setRegErrors((prev) => ({ ...prev, email: undefined }));
                                            }}
                                            onBlur={() => {
                                                setRegTouched((prev) => ({ ...prev, email: true }));
                                                if (!regEmail) setRegErrors((prev) => ({ ...prev, email: 'Campo obrigatório' }));
                                            }}
                                            autoComplete="email"
                                        />
                                        {checkingEmail && <span className="input-hint">Verificando e-mail...</span>}
                                        {regEmail.length > 0 && !regErrors.email && !emailTaken && !emailHasAt && (
                                            <span className="input-error">E-mail inválido</span>
                                        )}
                                        {regErrors.email && <span className="input-error">{regErrors.email}</span>}
                                    </div>

                                    {/* Senha */}
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="reg-password">Senha</label>
                                        <div className="input-password-wrap">
                                            <input
                                                id="reg-password"
                                                type={showRegPassword ? 'text' : 'password'}
                                                className={`input-field${regErrors.password || (regPassword.length > 0 && passedRules < 3) ? ' error' : ''}`}
                                                placeholder="Crie uma senha forte"
                                                value={regPassword}
                                                onChange={(e) => {
                                                    setRegPassword(e.target.value);
                                                    setRegErrors((prev) => ({ ...prev, password: undefined }));
                                                }}
                                                onBlur={() => {
                                                    setRegTouched((prev) => ({ ...prev, password: true }));
                                                    if (!regPassword) setRegErrors((prev) => ({ ...prev, password: 'Campo obrigatório' }));
                                                }}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="input-eye-btn"
                                                onClick={() => setShowRegPassword(!showRegPassword)}
                                                tabIndex={-1}
                                                aria-label={showRegPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            >
                                                {showRegPassword ? EyeClosed : EyeOpen}
                                            </button>
                                        </div>
                                        {regPassword.length > 0 && (
                                            <>
                                                <div className="password-strength-bar">
                                                    <div className={`password-strength-fill ${strengthClass}`} style={{ width: `${(passedRules / 3) * 100}%` }} />
                                                </div>
                                                <div className="password-strength-row">
                                                    <div className="input-rules">
                                                        <span className={`input-rule ${hasMinLength ? 'valid' : 'invalid'}`}>
                                                            <span className="input-rule-icon">{hasMinLength ? '\u2713' : '\u2717'}</span>
                                                            Mínimo 8 caracteres
                                                        </span>
                                                        <span className={`input-rule ${hasNumber ? 'valid' : 'invalid'}`}>
                                                            <span className="input-rule-icon">{hasNumber ? '\u2713' : '\u2717'}</span>
                                                            Ao menos 1 número
                                                        </span>
                                                        <span className={`input-rule ${hasUppercase ? 'valid' : 'invalid'}`}>
                                                            <span className="input-rule-icon">{hasUppercase ? '\u2713' : '\u2717'}</span>
                                                            Ao menos 1 letra maiúscula
                                                        </span>
                                                    </div>
                                                    {strengthLabel && (
                                                        <span className={`password-strength-label ${strengthClass}`}>
                                                            {strengthLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {regErrors.password && <span className="input-error">{regErrors.password}</span>}
                                    </div>

                                    {/* Confirmar Senha */}
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="reg-confirm-password">Confirmar Senha</label>
                                        <div className="input-password-wrap">
                                            <input
                                                id="reg-confirm-password"
                                                type={showRegConfirmPassword ? 'text' : 'password'}
                                                className={`input-field${regErrors.confirmPassword || (regConfirmPassword.length > 0 && regPassword !== regConfirmPassword) ? ' error' : ''}`}
                                                placeholder="Repita a senha"
                                                value={regConfirmPassword}
                                                onChange={(e) => {
                                                    setRegConfirmPassword(e.target.value);
                                                    setRegErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                                }}
                                                onBlur={() => {
                                                    setRegTouched((prev) => ({ ...prev, confirmPassword: true }));
                                                    if (!regConfirmPassword) setRegErrors((prev) => ({ ...prev, confirmPassword: 'Campo obrigatório' }));
                                                }}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="input-eye-btn"
                                                onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                                                tabIndex={-1}
                                                aria-label={showRegConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            >
                                                {showRegConfirmPassword ? EyeClosed : EyeOpen}
                                            </button>
                                        </div>
                                        {regConfirmPassword.length > 0 && !regErrors.confirmPassword && regPassword !== regConfirmPassword && (
                                            <span className="input-error">As senhas não coincidem</span>
                                        )}
                                        {regErrors.confirmPassword && <span className="input-error">{regErrors.confirmPassword}</span>}
                                    </div>

                                    {regServerError && <p className="auth-error">{regServerError}</p>}

                                    <label className="auth-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => {
                                                setAcceptedTerms(e.target.checked);
                                                setRegErrors((prev) => ({ ...prev, terms: undefined }));
                                            }}
                                        />
                                        <span className="auth-checkbox-mark" />
                                        <span className="auth-checkbox-text">
                                            Li e aceito os <Link to="/terms" target="_blank">Termos de Uso</Link> e o <Link to="/privacy" target="_blank">Aviso de Privacidade</Link>
                                        </span>
                                    </label>
                                    {regErrors.terms && <span className="input-error">{regErrors.terms}</span>}

                                    <button
                                        type="submit"
                                        className="btn btn-primary auth-btn"
                                        disabled={isRegSubmitDisabled}
                                    >
                                        {regLoading ? 'Criando conta...' : 'Criar Conta'}
                                    </button>
                                </form>
                            )}

                            <div className="auth-divider" />
                            <button
                                type="button"
                                className="auth-switch-card"
                                onClick={() => switchTab('login')}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                <div className="auth-switch-text">
                                    <span>Já tem uma conta?</span>
                                    <span className="auth-switch-action">Entrar</span>
                                </div>
                                <svg className="auth-switch-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
