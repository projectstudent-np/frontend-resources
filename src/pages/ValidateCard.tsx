import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../app/supabase';
import QRCode from 'qrcode';
import usePageTitle from '../hooks/usePageTitle';
import './Dashboard.css';

function formatCPF(cpf: string) {
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11) return cpf;
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

function formatDate(iso: string) {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

function formatPhone(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3)}`;
    return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StudentWithRelations {
    foto_3x4_path: string | null;
    student_id_number: string;
    users: { full_name: string; cpf: string; phone: string } | null;
    cursos: { nome: string } | null;
    periodos: { nome: string } | null;
    instituicoes: { nome: string } | null;
    cidades: { nome: string } | null;
}

interface ValidateResult {
    valid: boolean;
    expired?: boolean;
    studentName?: string;
    cpf?: string;
    phone?: string;
    course?: string;
    period?: string;
    institution?: string;
    city?: string;
    studentIdNumber?: string;
    photoUrl?: string;
    expiresAt?: string;
    qrCodeDataUrl?: string;
}

export default function ValidateCard() {
    usePageTitle('Validar Carteirinha');
    const { studentId } = useParams<{ studentId: string }>();
    const [result, setResult] = useState<ValidateResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        validate(studentId);
    }, [studentId]);

    async function validate(id: string) {
        setLoading(true);

        if (!UUID_RE.test(id)) {
            setResult({ valid: false });
            setLoading(false);
            return;
        }

        const { data: cardData } = await supabase
            .from('student_cards')
            .select('*, students(*, users(full_name, cpf, phone), cursos(nome), periodos(nome), instituicoes(nome), cidades(nome))')
            .eq('qr_code', id)
            .maybeSingle();

        if (!cardData) {
            setResult({ valid: false });
            setLoading(false);
            return;
        }

        const student = cardData.students as StudentWithRelations | null;
        const isActive = cardData.status === 'active';
        const isExpired = new Date(cardData.expires_at) < new Date();

        let photoUrl: string | undefined;
        if (student?.foto_3x4_path) {
            const { data: signedData } = await supabase.storage
                .from('student-documents')
                .createSignedUrl(student.foto_3x4_path, 300);
            if (signedData?.signedUrl) photoUrl = signedData.signedUrl;
        }

        // Gerar QR code igual ao do StudentDashboard
        const qrUrl = `${window.location.origin}/validate/${id}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { width: 140, margin: 1 });

        setResult({
            valid: isActive && !isExpired,
            expired: isExpired,
            studentName: student?.users?.full_name,
            cpf: student?.users?.cpf,
            phone: student?.users?.phone,
            course: student?.cursos?.nome,
            period: student?.periodos?.nome,
            institution: student?.instituicoes?.nome,
            city: student?.cidades?.nome,
            studentIdNumber: student?.student_id_number,
            photoUrl,
            expiresAt: cardData.expires_at,
            qrCodeDataUrl,
        });
        setLoading(false);
    }

    return (
        <div className="validate-page">
            {loading ? (
                <div className="dashboard-loading" />
            ) : !result ? (
                <div className="empty-state card">
                    <h2 className="empty-state-title">Carteirinha não encontrada</h2>
                    <p className="empty-state-desc">O código informado não corresponde a nenhuma carteirinha.</p>
                </div>
            ) : !result.studentName ? (
                <div className="empty-state card">
                    <span className="badge badge-error" style={{ marginBottom: 'var(--space-4)' }}>INVÁLIDA</span>
                    <h2 className="empty-state-title">Carteirinha não encontrada</h2>
                    <p className="empty-state-desc">O código informado não corresponde a nenhuma carteirinha válida.</p>
                </div>
            ) : (
                <>
                    {/* Badge de status */}
                    <div className="validate-status-banner">
                        <span className={`badge ${result.valid ? 'badge-success' : 'badge-error'}`}>
                            {result.valid ? 'CARTEIRINHA VÁLIDA' : result.expired ? 'CARTEIRINHA EXPIRADA' : 'CARTEIRINHA INVÁLIDA'}
                        </span>
                    </div>

                    {/* Layout frente + verso igual ao StudentDashboard */}
                    <div className="student-card-duo">
                        {/* FRENTE */}
                        <div className="student-card-document">
                            <div className="student-card-doc-header">
                                <div className="student-card-doc-header-row">
                                    <img src="/logo-prefeitura.png" alt="Logo" className="student-card-doc-logo" />
                                    <div>
                                        <h3>Prefeitura Municipal de Nova Ponte</h3>
                                        <p>Carteirinha Estudantil</p>
                                    </div>
                                </div>
                            </div>
                            <div className="student-card-doc-body">
                                {result.photoUrl ? (
                                    <img src={result.photoUrl} alt="Foto 3x4" className="student-card-doc-photo" />
                                ) : (
                                    <div className="student-card-doc-photo-placeholder">Sem foto</div>
                                )}
                                <div className="student-card-doc-fields">
                                    <div className="student-card-doc-field">
                                        <span className="student-card-doc-field-label">Nome:</span>
                                        <span className="student-card-doc-field-value">{result.studentName}</span>
                                    </div>
                                    {result.cpf && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">CPF:</span>
                                            <span className="student-card-doc-field-value">{formatCPF(result.cpf)}</span>
                                        </div>
                                    )}
                                    {result.course && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Curso:</span>
                                            <span className="student-card-doc-field-value">{result.course}</span>
                                        </div>
                                    )}
                                    {result.period && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Período:</span>
                                            <span className="student-card-doc-field-value">{result.period}</span>
                                        </div>
                                    )}
                                    {result.institution && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Instituição:</span>
                                            <span className="student-card-doc-field-value">{result.institution}</span>
                                        </div>
                                    )}
                                    {result.studentIdNumber && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Matrícula:</span>
                                            <span className="student-card-doc-field-value">{result.studentIdNumber}</span>
                                        </div>
                                    )}
                                    {result.city && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Cidade:</span>
                                            <span className="student-card-doc-field-value">{result.city}</span>
                                        </div>
                                    )}
                                    {result.phone && (
                                        <div className="student-card-doc-field">
                                            <span className="student-card-doc-field-label">Telefone:</span>
                                            <span className="student-card-doc-field-value">{formatPhone(result.phone)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="student-card-doc-footer">
                                <span>Validade: <strong>{result.expiresAt ? formatDate(result.expiresAt) : '—'}</strong></span>
                            </div>
                        </div>

                        {/* VERSO */}
                        <div className="student-card-document">
                            <div className="student-card-doc-header">
                                <div className="student-card-doc-header-row">
                                    <img src="/logo-prefeitura.png" alt="Logo" className="student-card-doc-logo" />
                                    <div>
                                        <h3>Prefeitura Municipal de Nova Ponte</h3>
                                        <p>Verso da Carteirinha</p>
                                    </div>
                                </div>
                            </div>
                            <div className="student-card-doc-back">
                                {result.qrCodeDataUrl && (
                                    <img src={result.qrCodeDataUrl} alt="QR Code" className="student-card-doc-qr" />
                                )}
                                <p className="student-card-doc-back-text">
                                    Apresente esta carteirinha ao motorista para validação.
                                    Em caso de perda, entre em contato com a prefeitura.
                                </p>
                                <p className="student-card-doc-back-url">novaponte.mg.gov.br</p>
                            </div>
                        </div>
                    </div>

                    <div className="validate-footer-text">
                        Prefeitura Municipal de Nova Ponte — Sistema de Carteirinhas Estudantis
                    </div>
                </>
            )}
        </div>
    );
}
