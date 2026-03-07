import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import QRCode from "qrcode"
import usePageTitle from "../hooks/usePageTitle"
import "./Dashboard.css"

const API_URL = import.meta.env.VITE_API_URL as string

function formatCPF(cpf: string) {
  const c = cpf.replace(/\D/g, "")
  if (c.length !== 11) return cpf
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ValidateResult {
  valid: boolean
  expired?: boolean
  studentName?: string
  cpf?: string
  phone?: string
  course?: string
  period?: string
  institution?: string
  city?: string
  studentIdNumber?: string
  photoUrl?: string
  expiresAt?: string
  qrCodeDataUrl?: string
}

export default function ValidateCard() {
  usePageTitle("Validar Carteirinha")
  const { studentId } = useParams<{ studentId: string }>()
  const [result, setResult] = useState<ValidateResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    validate(studentId)
  }, [studentId])

  async function validate(id: string) {
    setLoading(true)

    if (!UUID_RE.test(id)) {
      setResult({ valid: false })
      setLoading(false)
      return
    }

    try {
      const res = await fetch(
        `${API_URL}/api/cards/validate-public/${encodeURIComponent(id)}`,
      )
      const json = await res.json()

      if (!json.success || !json.data) {
        setResult({ valid: false })
        setLoading(false)
        return
      }

      const d = json.data

      const qrUrl = `${window.location.origin}/validate/${id}`
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
      })

      setResult({
        valid: d.valid,
        expired: d.expired,
        studentName: d.studentName,
        cpf: d.cpf,
        phone: d.phone,
        course: d.course,
        period: d.period,
        institution: d.institution,
        city: d.city,
        studentIdNumber: d.studentIdNumber,
        photoUrl: d.photoUrl,
        expiresAt: d.expiresAt,
        qrCodeDataUrl,
      })
    } catch {
      setResult({ valid: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="validate-page">
      {loading ? (
        <div className="dashboard-loading" />
      ) : !result ? (
        <div className="empty-state card">
          <h2 className="empty-state-title">Carteirinha não encontrada</h2>
          <p className="empty-state-desc">
            O código informado não corresponde a nenhuma carteirinha.
          </p>
        </div>
      ) : !result.studentName ? (
        <div className="empty-state card">
          <span
            className="badge badge-error"
            style={{ marginBottom: "var(--space-4)" }}
          >
            INVÁLIDA
          </span>
          <h2 className="empty-state-title">Carteirinha não encontrada</h2>
          <p className="empty-state-desc">
            O código informado não corresponde a nenhuma carteirinha válida.
          </p>
        </div>
      ) : (
        <>
          {/* Badge de status */}
          <div className="validate-status-banner">
            <span
              className={`badge ${result.valid ? "badge-success" : "badge-error"}`}
            >
              {result.valid
                ? "CARTEIRINHA VÁLIDA"
                : result.expired
                  ? "CARTEIRINHA EXPIRADA"
                  : "CARTEIRINHA INVÁLIDA"}
            </span>
          </div>

          {/* Carteirinha Digital */}
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
                {result.photoUrl ? (
                  <img
                    src={result.photoUrl}
                    alt="Foto 3x4"
                    className="student-card-doc-photo"
                    onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
                  />
                ) : (
                  <div className="student-card-doc-photo-placeholder">
                    Sem foto
                  </div>
                )}
                <div className="student-card-doc-fields">
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">Nome:</span>
                    <span className="student-card-doc-field-value">
                      {result.studentName}
                    </span>
                  </div>
                  {result.cpf && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">CPF:</span>
                      <span className="student-card-doc-field-value">
                        {formatCPF(result.cpf)}
                      </span>
                    </div>
                  )}
                  {result.course && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Curso:</span>
                      <span className="student-card-doc-field-value">
                        {result.course}
                      </span>
                    </div>
                  )}
                  {result.period && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Período:</span>
                      <span className="student-card-doc-field-value">
                        {result.period}
                      </span>
                    </div>
                  )}
                  {result.institution && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Instituição:</span>
                      <span className="student-card-doc-field-value">
                        {result.institution}
                      </span>
                    </div>
                  )}
                  {result.studentIdNumber && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Matrícula:</span>
                      <span className="student-card-doc-field-value">
                        {result.studentIdNumber}
                      </span>
                    </div>
                  )}
                  {result.city && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Cidade:</span>
                      <span className="student-card-doc-field-value">
                        {result.city}
                      </span>
                    </div>
                  )}
                  {result.phone && (
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">Telefone:</span>
                      <span className="student-card-doc-field-value">
                        {formatPhone(result.phone)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="student-card-virtual-bottom">
                {result.qrCodeDataUrl && (
                  <img
                    src={result.qrCodeDataUrl}
                    alt="QR Code"
                    className="student-card-virtual-qr"
                  />
                )}
                <div className="student-card-virtual-bottom-info">
                  <span>
                    Validade:{" "}
                    <strong>
                      {result.expiresAt ? formatDate(result.expiresAt) : "—"}
                    </strong>
                  </span>
                  <p className="student-card-doc-back-url">novaponte.mg.gov.br</p>
                </div>
              </div>
            </div>
          </div>

          <div className="validate-footer-text">
            Prefeitura Municipal de Nova Ponte — Sistema de Carteirinhas
            Estudantis
          </div>
        </>
      )}
    </div>
  )
}
