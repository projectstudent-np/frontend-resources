import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import './Help.css';

interface FaqItem {
    q: string;
    a: string;
    icon: React.ReactNode;
}

const STUDENT_FAQS: FaqItem[] = [
    {
        q: 'Como solicitar minha carteirinha estudantil?',
        a: 'Crie uma conta com seu CPF, faça login e acesse o painel do estudante. Preencha seus dados acadêmicos (instituição, curso, período e matrícula), envie os documentos obrigatórios (foto 3x4, comprovante de matrícula e documento de identidade) e aguarde a análise de um executivo.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <path d="M2 9h20" />
            </svg>
        ),
    },
    {
        q: 'Quais documentos preciso enviar?',
        a: 'São necessários três documentos: uma foto 3x4 recente, o comprovante de matrícula atualizado da sua instituição de ensino e uma cópia do seu documento de identidade (RG ou CNH). Todos os arquivos devem estar em formato JPG, PNG ou WebP com no máximo 5MB cada.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
    },
    {
        q: 'Quanto tempo demora para minha solicitação ser aprovada?',
        a: 'As solicitações são analisadas por um executivo responsável. O prazo pode variar, mas geralmente a análise é feita em poucos dias úteis. Após a aprovação, sua carteirinha digital fica disponível imediatamente no seu painel.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        q: 'O que fazer se minha solicitação for rejeitada?',
        a: 'Acesse o ticket da sua solicitação no painel do estudante e leia a justificativa do executivo. Corrija as informações solicitadas, atualize seus documentos se necessário e reenvie. O executivo analisará novamente.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
    },
    {
        q: 'Posso editar meus dados após enviar a solicitação?',
        a: 'Enquanto a solicitação estiver em análise ou a carteirinha estiver ativa, seus dados pessoais (nome, email, telefone e foto) ficam bloqueados para garantir a integridade das informações. Caso precise alterar algo, entre em contato através do ticket ou aguarde o executivo solicitar mais informações.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
        ),
    },
    {
        q: 'Posso exportar minha carteirinha em PDF?',
        a: 'Sim. Quando sua carteirinha estiver ativa, acesse o painel do estudante e clique no botão "Exportar PDF". O arquivo gerado contém seus dados, foto e QR Code para validação.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
        ),
    },
];

const DRIVER_FAQS: FaqItem[] = [
    {
        q: 'Como validar a carteirinha de um estudante?',
        a: 'Faça login com sua conta de motorista. No painel, cole ou digite o código do QR Code da carteirinha do estudante no campo de validação. O sistema mostrará os dados do estudante e o status da carteirinha (ativa, expirada ou cancelada).',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        ),
    },
    {
        q: 'O que significam os status da carteirinha?',
        a: 'Ativa: a carteirinha é válida e o estudante tem direito ao benefício. Expirada: a data de validade passou e a carteirinha precisa ser renovada. Cancelada: a carteirinha foi desativada por um administrador.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
    },
];

const GENERAL_FAQS: FaqItem[] = [
    {
        q: 'Como criar minha conta?',
        a: 'Acesse a página de login e clique em "Criar conta". Informe seu CPF e crie uma senha. Após o cadastro, você será redirecionado ao seu painel de acordo com o tipo de conta atribuído.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
        ),
    },
    {
        q: 'Esqueci minha senha, como recuperar?',
        a: 'Na tela de login, clique em "Esqueceu a senha?". Informe o email vinculado a sua conta e você receberá um link para redefinir sua senha. Também é possível solicitar a redefinição pelo menu de perfil.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
                <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
        ),
    },
    {
        q: 'Meus dados estão seguros?',
        a: 'Sim. O sistema utiliza autenticação segura, criptografia de dados e políticas de acesso restritas. Seus documentos são armazenados em servidores protegidos e apenas usuários autorizados podem acessá-los.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
    },
    {
        q: 'Quem são os usuários do sistema?',
        a: 'O sistema possui quatro tipos de usuário: Estudantes que solicitam e utilizam a carteirinha, Motoristas que validam carteirinhas nos ônibus, Executivos que analisam e aprovam solicitações, e Administradores que gerenciam o sistema.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        q: 'O sistema funciona em dispositivos móveis?',
        a: 'Sim. A plataforma é totalmente responsiva e funciona em qualquer navegador moderno, tanto em computadores quanto em celulares e tablets. Não é necessário instalar nenhum aplicativo.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
        ),
    },
    {
        q: 'Preciso de ajuda e não encontrei minha dúvida aqui.',
        a: 'Entre em contato com a Secretaria de Educação da Prefeitura de Nova Ponte ou procure o setor responsável pelo transporte escolar. Você também pode acessar o site oficial da prefeitura para mais informações.',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
];

interface FaqSectionProps {
    title: string;
    description: string;
    items: FaqItem[];
}

function FaqSection({ title, description, items }: FaqSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="help-section">
            <div className="help-section-header">
                <h2 className="help-section-title">{title}</h2>
                <p className="help-section-desc">{description}</p>
            </div>
            <div className="help-faq-list">
                {items.map((item, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <button
                            key={i}
                            className={`help-faq-card${isOpen ? ' help-faq-card-open' : ''}`}
                            onClick={() => setOpenIndex(isOpen ? null : i)}
                            type="button"
                        >
                            <div className="help-faq-card-header">
                                <div className="help-faq-icon">{item.icon}</div>
                                <span className="help-faq-question">{item.q}</span>
                                <svg
                                    className={`help-faq-chevron${isOpen ? ' open' : ''}`}
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                            {isOpen && (
                                <p className="help-faq-answer">{item.a}</p>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function Help() {
    usePageTitle('Ajuda');
    const { session, user } = useAuth();
    const isLoggedIn = !!session;
    const role = user?.role;

    return (
        <div className="dashboard-page help-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Central de Ajuda</h1>
                    <p className="dashboard-sub">Encontre respostas para suas dúvidas sobre o sistema de carteirinhas</p>
                </div>
            </div>

            <div className="help-content">
                {(!isLoggedIn || role === 'student') && (
                    <FaqSection
                        title="Estudantes"
                        description="Solicitação, documentos e carteirinha digital"
                        items={STUDENT_FAQS}
                    />
                )}

                {(!isLoggedIn || role === 'driver') && (
                    <FaqSection
                        title="Motoristas"
                        description="Validação de carteirinhas no transporte"
                        items={DRIVER_FAQS}
                    />
                )}

                <FaqSection
                    title="Geral"
                    description="Conta, segurança e informações do sistema"
                    items={GENERAL_FAQS}
                />

                {!isLoggedIn && (
                    <div className="help-cta card">
                        <div className="help-cta-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                        </div>
                        <div className="help-cta-text">
                            <h3 className="help-cta-title">Ainda não tem uma conta?</h3>
                            <p className="help-cta-desc">Crie sua conta para solicitar sua carteirinha estudantil ou acessar o sistema.</p>
                        </div>
                        <Link to="/access" className="btn btn-primary">Acessar</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
