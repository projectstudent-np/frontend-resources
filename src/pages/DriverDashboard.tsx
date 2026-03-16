import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import QRCode from "qrcode"
import { supabase } from "../app/supabase"
import usePageTitle from "../hooks/usePageTitle"
import "./Dashboard.css"

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

interface StudentWithRelations {
  foto_3x4_path: string | null
  student_id_number: string
  users: { full_name: string; cpf: string; phone: string } | null
  cursos: { nome: string } | null
  periodos: { nome: string } | null
  instituicoes: { nome: string } | null
  cidades: { nome: string } | null
}

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

export default function DriverDashboard() {
  usePageTitle("Motorista")
  const [result, setResult] = useState<ValidateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scannerActive, setScannerActive] = useState(true)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (!scannerActive) return

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false,
    )

    scanner.render(
      (decodedText) => {
        handleValidateByUrl(decodedText)
        scanner.clear()
        setScannerActive(false)
      },
      () => {}, // ignore scan errors
    )

    scannerRef.current = scanner

    return () => {
      try {
        scanner.clear()
      } catch {
        /* already cleared */
      }
    }
  }, [scannerActive])

  async function handleValidateByUrl(text: string) {
    setLoading(true)
    setError("")
    setResult(null)

    // Extrair student ID da URL ou usar direto como UUID
    let studentId = text.trim()
    const match = text.match(/\/validate\/([a-f0-9-]+)/i)
    if (match) studentId = match[1]

    await validateById(studentId)
  }

  async function validateById(id: string) {
    setLoading(true)
    setError("")
    setResult(null)

    if (!UUID_RE.test(id)) {
      setResult({ valid: false })
      setLoading(false)
      return
    }

    try {
      const { data: cardData } = await supabase
        .from("student_cards")
        .select(
          "*, students(*, users(full_name, cpf, phone), cursos(nome), periodos(nome), instituicoes(nome), cidades(nome))",
        )
        .eq("student_id", id)
        .maybeSingle()

      if (!cardData) {
        setResult({ valid: false })
        setLoading(false)
        return
      }

      const student = cardData.students as StudentWithRelations | null
      const isActive = cardData.status === "active"
      const isExpired = new Date(cardData.expires_at) < new Date()

      let photoUrl: string | undefined
      if (student?.foto_3x4_path) {
        const { data: signedData } = await supabase.storage
          .from("student-documents")
          .createSignedUrl(student.foto_3x4_path, 300)
        if (signedData?.signedUrl) photoUrl = signedData.signedUrl
      }

      const qrUrl = `${window.location.origin}/validate/${id}`
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
      })

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
      })
    } catch {
      setError("Erro ao validar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const resetScanner = () => {
    setResult(null)
    setError("")
    setScannerActive(true)
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Painel do Motorista</h1>
          <p className="dashboard-sub">Valide carteirinhas estudantis</p>
        </div>
      </div>

      {/* Scanner de câmera */}
      {scannerActive && (
        <div className="scanner-section">
          <div className="scanner-section-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <div className="scanner-section-header-text">
              <h3>Escanear QR Code</h3>
              <p>Aponte a câmera para o QR Code da carteirinha</p>
            </div>
          </div>
          <div id="qr-reader" />
        </div>
      )}

      {/* Error message (from QR scan) */}
      {error && (
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <p className="auth-error">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {loading && (
        <div className="student-card-virtual" style={{ marginTop: "var(--space-4)" }}>
          <div className="student-card-document">
            <div className="student-card-doc-header">
              <div className="student-card-doc-header-row">
                <div className="skeleton-block" style={{ width: 48, height: 48, borderRadius: 8 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="skeleton-block" style={{ width: 220, height: 16, display: "block" }} />
                  <span className="skeleton-block" style={{ width: 160, height: 13, display: "block" }} />
                </div>
              </div>
            </div>
            <div className="student-card-doc-body">
              <div className="skeleton-block" style={{ width: 100, height: 120, borderRadius: 8 }} />
              <div className="student-card-doc-fields">
                {[140, 110, 130, 100, 150, 90].map((w, i) => (
                  <div className="student-card-doc-field" key={i}>
                    <span className="skeleton-block" style={{ width: 60, height: 12, display: "block" }} />
                    <span className="skeleton-block" style={{ width: w, height: 14, display: "block" }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="student-card-virtual-bottom">
              <div className="skeleton-block" style={{ width: 80, height: 80, borderRadius: 6 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="skeleton-block" style={{ width: 120, height: 14, display: "block" }} />
                <span className="skeleton-block" style={{ width: 100, height: 12, display: "block" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {result && !result.studentName && !result.valid && (
        <div
          className="empty-state card"
          style={{ maxWidth: 600, margin: "0 auto" }}
        >
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
      )}

      {result && result.studentName && (
        <>
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
        </>
      )}

      {/* Botão para escanear novamente */}
      {(result || !scannerActive) && (
        <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <button className="btn btn-secondary btn-sm" onClick={resetScanner}>
            Escanear novamente
          </button>
        </div>
      )}
    </div>
  )
}
