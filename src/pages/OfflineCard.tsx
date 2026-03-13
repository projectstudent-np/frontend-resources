import { useMemo } from "react"
import { Link } from "react-router-dom"
import usePageTitle from "../hooks/usePageTitle"
import "./Dashboard.css"

interface OfflineData {
  studentName: string
  cpf: string
  phone: string
  course: string
  period: string
  institution: string
  city: string
  studentIdNumber: string
  photoDataUrl: string | null
  qrCodeDataUrl: string | null
  cardExpiryDate: string | null
  savedAt: string
}

function formatCPF(cpf: string) {
  const clean = cpf.replace(/\D/g, "")
  if (clean.length !== 11) return cpf
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

function formatDate(iso: string) {
  try {
    const [y, m, d] = iso.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`
}

function loadOfflineCard(): { data: OfflineData | null; expired: boolean } {
  try {
    const raw = localStorage.getItem("npmg_offline_card")
    if (!raw) return { data: null, expired: false }
    const parsed: OfflineData = JSON.parse(raw)
    const expired = parsed.cardExpiryDate
      ? new Date(parsed.cardExpiryDate) < new Date()
      : false
    return { data: parsed, expired }
  } catch {
    return { data: null, expired: false }
  }
}

export default function OfflineCard() {
  usePageTitle("Carteirinha Offline")
  const { data, expired } = useMemo(loadOfflineCard, [])

  if (!data) {
    return (
      <div className="dashboard-page">
        <div className="empty-state card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="empty-state-title">Nenhuma carteirinha salva</h2>
          <p className="empty-state-desc">
            Você ainda não salvou nenhuma carteirinha para uso offline. Faça login e salve sua carteirinha pelo painel do aluno.
          </p>
          <Link to="/access" className="btn btn-primary btn-md" style={{ marginTop: "var(--space-4)" }}>
            Fazer login
          </Link>
        </div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="dashboard-page">
        <div className="empty-state card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <span className="badge badge-error" style={{ marginBottom: "var(--space-4)" }}>
            EXPIRADA
          </span>
          <h2 className="empty-state-title">Carteirinha expirada</h2>
          <p className="empty-state-desc">
            A carteirinha salva offline expirou em {data.cardExpiryDate ? formatDate(data.cardExpiryDate) : "—"}. Faça login para renovar e salvar novamente.
          </p>
          <Link to="/access" className="btn btn-primary btn-md" style={{ marginTop: "var(--space-4)" }}>
            Fazer login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Carteirinha Offline</h1>
          <p className="dashboard-sub">Versão salva localmente no seu dispositivo</p>
        </div>
      </div>

      <div className="validate-status-banner">
        <span className="badge badge-success">CARTEIRINHA VÁLIDA</span>
      </div>

      <div className="student-card-virtual">
        <div className="student-card-document">
          <div className="student-card-doc-header">
            <div className="student-card-doc-header-row">
              <img
                src="/logo-prefeitura.png"
                alt="Logo"
                className="student-card-doc-logo"
              />
              <div>
                <h3>Prefeitura Municipal de Nova Ponte</h3>
                <p>Carteirinha Estudantil Digital</p>
              </div>
            </div>
          </div>
          <div className="student-card-doc-body">
            {data.photoDataUrl ? (
              <img
                src={data.photoDataUrl}
                alt="Foto 3x4"
                className="student-card-doc-photo"
              />
            ) : (
              <div className="student-card-doc-photo-placeholder">
                Sem foto
              </div>
            )}
            <div className="student-card-doc-fields">
              <div className="student-card-doc-field">
                <span className="student-card-doc-field-label">Nome:</span>
                <span className="student-card-doc-field-value">{data.studentName}</span>
              </div>
              <div className="student-card-doc-field">
                <span className="student-card-doc-field-label">CPF:</span>
                <span className="student-card-doc-field-value">{formatCPF(data.cpf)}</span>
              </div>
              {data.course && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Curso:</span>
                  <span className="student-card-doc-field-value">{data.course}</span>
                </div>
              )}
              {data.period && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Período:</span>
                  <span className="student-card-doc-field-value">{data.period}</span>
                </div>
              )}
              {data.institution && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Instituição:</span>
                  <span className="student-card-doc-field-value">{data.institution}</span>
                </div>
              )}
              {data.studentIdNumber && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Matrícula:</span>
                  <span className="student-card-doc-field-value">{data.studentIdNumber}</span>
                </div>
              )}
              {data.city && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Cidade:</span>
                  <span className="student-card-doc-field-value">{data.city}</span>
                </div>
              )}
              {data.phone && (
                <div className="student-card-doc-field">
                  <span className="student-card-doc-field-label">Telefone:</span>
                  <span className="student-card-doc-field-value">{formatPhone(data.phone)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="student-card-virtual-bottom">
            {data.qrCodeDataUrl && (
              <img
                src={data.qrCodeDataUrl}
                alt="QR Code"
                className="student-card-virtual-qr"
              />
            )}
            <div className="student-card-virtual-bottom-info">
              <span>
                Validade:{" "}
                <strong>
                  {data.cardExpiryDate ? formatDate(data.cardExpiryDate) : "—"}
                </strong>
              </span>
              <p className="student-card-doc-back-url">novaponte.mg.gov.br</p>
            </div>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "var(--space-4)" }}>
        Salva em {formatDate(data.savedAt)}
      </p>
    </div>
  )
}
