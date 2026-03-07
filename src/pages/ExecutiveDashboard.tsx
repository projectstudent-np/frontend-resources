import { useEffect, useState, useRef } from "react"
import { generateCardPdf } from "../utils/generateCardPdf"
import QRCode from "qrcode"
import { useAuth } from "../store/AuthContext"
import { supabase } from "../app/supabase"
import type { Ticket, TicketHistory } from "../types"
import usePageTitle from "../hooks/usePageTitle"
import "./Dashboard.css"

/* ─────────────────── Types ─────────────────── */
interface TicketWithUser extends Ticket {
  users?: { full_name: string; email: string; cpf: string; phone: string }
}

interface StudentFull {
  id: string
  user_id: string
  curso_id: string
  periodo_id: string
  instituicao_id: string
  cidade_id: string
  student_id_number: string
  status: string
  foto_3x4_path: string | null
  comprovante_matricula_path: string | null
  documento_identidade_path: string | null
  cursos?: { nome: string }
  periodos?: { nome: string }
  instituicoes?: { nome: string }
  cidades?: { nome: string }
}

interface TicketHistoryWithUser extends TicketHistory {
  users?: { full_name: string }
}

/* ─────────────────── Constants ─────────────── */
const statusBadge: Record<string, string> = {
  open: "badge-info",
  in_review: "badge-warning",
  info_requested: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
}

const statusLabel: Record<string, string> = {
  open: "Aberto",
  in_review: "Em análise",
  info_requested: "Informações solicitadas",
  approved: "Aprovado",
  rejected: "Rejeitado",
}

const actionLabel: Record<string, string> = {
  submitted: "Solicitação enviada",
  approved: "Solicitação aprovada",
  rejected: "Solicitação rejeitada",
  info_requested: "Informações solicitadas",
  resubmitted: "Solicitação reenviada",
  unblocked: "Estudante desbloqueado",
  reopened: "Solicitação reaberta para revisão",
}

const TABS = [
  { key: "open", label: "Abertos" },
  { key: "approved", label: "Aprovados" },
  { key: "self_cancelled", label: "Encerrados pelo Usuário" },
  { key: "rejected", label: "Rejeitados" },
  { key: "info_requested", label: "Aguardando Nova Solicitação" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function formatCPF(cpf: string) {
  const c = cpf.replace(/\D/g, "")
  if (c.length !== 11) return cpf
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

function formatPhone(phone: string) {
  const c = phone.replace(/\D/g, "")
  if (c.length !== 11) return phone
  return `(${c.slice(0, 2)}) ${c.slice(2, 3)} ${c.slice(3, 7)}-${c.slice(7)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

/* ─────── JustificationDialog ─────────────── */
function JustificationDialog({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmClass: string
  onConfirm: (text: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [text, setText] = useState("")
  return (
    <div className="exec-modal-overlay" onClick={onCancel}>
      <div
        className="justification-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="justification-dialog-title">{title}</h2>
        <p className="justification-dialog-desc">{description}</p>
        <textarea
          className="justification-textarea"
          placeholder="Digite a justificativa..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <div className="justification-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`btn btn-sm ${confirmClass}`}
            disabled={text.trim().length < 10 || loading}
            onClick={() => onConfirm(text.trim())}
          >
            {loading ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────── TicketDetailModal ───────────────── */
function TicketDetailModal({
  ticket,
  currentUserId,
  onClose,
  onActionDone,
}: {
  ticket: TicketWithUser
  currentUserId: string
  onClose: () => void
  onActionDone: () => void
}) {
  const [student, setStudent] = useState<StudentFull | null>(null)
  const [history, setHistory] = useState<TicketHistoryWithUser[]>([])
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  const [docTypes, setDocTypes] = useState<Record<string, string>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [justDialog, setJustDialog] = useState<"reject" | "info" | null>(null)
  const [photoUrl, setPhotoUrl] = useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [cardExpiryDate, setCardExpiryDate] = useState("")
  const [downloadMenu, setDownloadMenu] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const digitalCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDetails()
  }, [ticket.id])

  async function loadDetails() {
    setLoadingData(true)

    // Buscar dados do estudante com joins
    const { data: studentData } = await supabase
      .from("students")
      .select(
        "*, cursos(nome), periodos(nome), instituicoes(nome), cidades(nome)",
      )
      .eq("user_id", ticket.user_id)
      .maybeSingle()
    setStudent(studentData)

    // Gerar URLs assinadas para os documentos
    if (studentData) {
      const urls: Record<string, string> = {}
      const types: Record<string, string> = {}
      const paths = [
        { key: "foto_3x4", path: studentData.foto_3x4_path },
        {
          key: "comprovante_matricula",
          path: studentData.comprovante_matricula_path,
        },
        {
          key: "documento_identidade",
          path: studentData.documento_identidade_path,
        },
      ]
      for (const { key, path } of paths) {
        if (path) {
          const { data } = await supabase.storage
            .from("student-documents")
            .createSignedUrl(path, 300)
          if (data?.signedUrl) {
            urls[key] = data.signedUrl
            // Detectar content-type via HEAD request
            try {
              const resp = await fetch(data.signedUrl, { method: "HEAD" })
              types[key] = resp.headers.get("content-type") ?? ""
            } catch {
              types[key] = ""
            }
          }
        }
      }
      setDocUrls(urls)
      setDocTypes(types)
    }

    // Foto assinada para carteirinha
    if (studentData?.foto_3x4_path) {
      const { data: photoData } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(studentData.foto_3x4_path, 600)
      if (photoData?.signedUrl) setPhotoUrl(photoData.signedUrl)
    }

    // QR code e validade (para tickets aprovados)
    if (ticket.status === "approved" && studentData) {
      const qrUrl = `${window.location.origin}/validate/${studentData.id}`
      const qrData = await QRCode.toDataURL(qrUrl, { width: 140, margin: 1 })
      setQrCodeDataUrl(qrData)

      const { data: cardData } = await supabase
        .from("student_cards")
        .select("expires_at")
        .eq("student_id", studentData.id)
        .eq("status", "active")
        .maybeSingle()
      if (cardData?.expires_at) setCardExpiryDate(cardData.expires_at)
    }

    // Buscar histórico
    const { data: histData } = await supabase
      .from("ticket_history")
      .select("*, users(full_name)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false })
    setHistory(histData ?? [])

    setLoadingData(false)
  }

  async function handleApprove() {
    setActionLoading(true)

    // Buscar student
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", ticket.user_id)
      .single()

    // Buscar validade configurada
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "card_expiry_date")
      .maybeSingle()
    const expiryDate = settings?.value ?? "2026-12-31"

    await supabase
      .from("tickets")
      .update({
        status: "approved",
        reviewed_by: currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
    await supabase
      .from("students")
      .update({ status: "approved" })
      .eq("user_id", ticket.user_id)

    // Criar student_card se não existir
    if (studentData) {
      const { data: existing } = await supabase
        .from("student_cards")
        .select("id")
        .eq("student_id", studentData.id)
        .eq("status", "active")
        .maybeSingle()

      if (!existing) {
        await supabase.from("student_cards").insert({
          student_id: studentData.id,
          issue_number: `MUNP-${Date.now()}`,
          status: "active",
          issued_at: new Date().toISOString(),
          expires_at: `${expiryDate}T23:59:59Z`,
          qr_code: studentData.id,
        })
      }
    }

    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      action: "approved",
      performed_by: currentUserId,
    })
    setActionLoading(false)
    onClose()
    onActionDone()
  }

  async function handleReject(justification: string) {
    setActionLoading(true)
    await supabase
      .from("tickets")
      .update({
        status: "rejected",
        reviewed_by: currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
    await supabase
      .from("students")
      .update({ status: "rejected" })
      .eq("user_id", ticket.user_id)
    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      action: "rejected",
      performed_by: currentUserId,
      justification,
    })
    setActionLoading(false)
    setJustDialog(null)
    onClose()
    onActionDone()
  }

  async function handleRequestInfo(justification: string) {
    setActionLoading(true)
    await supabase
      .from("tickets")
      .update({
        status: "info_requested",
        reviewed_by: currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
    await supabase
      .from("students")
      .update({ status: "info_requested" })
      .eq("user_id", ticket.user_id)
    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      action: "info_requested",
      performed_by: currentUserId,
      justification,
    })
    setActionLoading(false)
    setJustDialog(null)
    onClose()
    onActionDone()
  }

  async function handleReopen() {
    setActionLoading(true)
    await supabase
      .from("tickets")
      .update({
        status: "open",
        reviewed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
    await supabase
      .from("students")
      .update({ status: "pending" })
      .eq("user_id", ticket.user_id)
    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      action: "reopened",
      performed_by: currentUserId,
    })
    setActionLoading(false)
    onClose()
    onActionDone()
  }

  async function handleUnblock() {
    setActionLoading(true)
    await supabase
      .from("tickets")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", ticket.id)
    await supabase
      .from("students")
      .update({ status: "pending" })
      .eq("user_id", ticket.user_id)
    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      action: "unblocked",
      performed_by: currentUserId,
    })
    setActionLoading(false)
    onClose()
    onActionDone()
  }

  const isImageDoc = (key: string) =>
    docTypes[key]?.startsWith("image/") ?? false

  return (
    <>
      <div className="exec-modal-overlay" onClick={onClose}>
        <div className="exec-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="exec-modal-header">
            <div className="exec-modal-title">
              <span style={{ fontFamily: "monospace" }}>
                #{ticket.ticket_number}
              </span>
              {ticket.users?.full_name ?? "Desconhecido"}
              <span className={`badge ${statusBadge[ticket.status]}`}>
                {statusLabel[ticket.status]}
              </span>
            </div>
            <button className="exec-modal-close" onClick={onClose}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="exec-modal-body">
            {loadingData ? (
              <div className="exec-modal-skeleton">
                <div
                  className="skeleton-block"
                  style={{ height: 20, width: "40%", marginBottom: 12 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 14, width: "70%", marginBottom: 8 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 14, width: "55%", marginBottom: 8 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 14, width: "65%", marginBottom: 24 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 20, width: "35%", marginBottom: 12 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 14, width: "50%", marginBottom: 8 }}
                />
                <div
                  className="skeleton-block"
                  style={{ height: 14, width: "60%", marginBottom: 8 }}
                />
              </div>
            ) : (
              <>
                {/* Dados Pessoais */}
                <div className="exec-modal-section">
                  <h3 className="exec-modal-section-title">Dados Pessoais</h3>
                  <div className="exec-modal-grid">
                    <div className="exec-modal-field">
                      <span className="exec-modal-field-label">
                        Nome completo
                      </span>
                      <span className="exec-modal-field-value">
                        {ticket.users?.full_name ?? "—"}
                      </span>
                    </div>
                    <div className="exec-modal-field">
                      <span className="exec-modal-field-label">CPF</span>
                      <span className="exec-modal-field-value">
                        {ticket.users?.cpf ? formatCPF(ticket.users.cpf) : "—"}
                      </span>
                    </div>
                    <div className="exec-modal-field">
                      <span className="exec-modal-field-label">Email</span>
                      <span className="exec-modal-field-value">
                        {ticket.users?.email ?? "—"}
                      </span>
                    </div>
                    <div className="exec-modal-field">
                      <span className="exec-modal-field-label">Telefone</span>
                      <span className="exec-modal-field-value">
                        {ticket.users?.phone
                          ? formatPhone(ticket.users.phone)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dados Educacionais */}
                {student && (
                  <div className="exec-modal-section">
                    <h3 className="exec-modal-section-title">
                      Dados Educacionais
                    </h3>
                    <div className="exec-modal-grid">
                      <div className="exec-modal-field">
                        <span className="exec-modal-field-label">Curso</span>
                        <span className="exec-modal-field-value">
                          {student.cursos?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="exec-modal-field">
                        <span className="exec-modal-field-label">Período</span>
                        <span className="exec-modal-field-value">
                          {student.periodos?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="exec-modal-field">
                        <span className="exec-modal-field-label">
                          Instituição
                        </span>
                        <span className="exec-modal-field-value">
                          {student.instituicoes?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="exec-modal-field">
                        <span className="exec-modal-field-label">
                          Cidade da Faculdade
                        </span>
                        <span className="exec-modal-field-value">
                          {student.cidades?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="exec-modal-field">
                        <span className="exec-modal-field-label">
                          Matrícula / RA
                        </span>
                        <span className="exec-modal-field-value">
                          {student.student_id_number || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documentos */}
                <div className="exec-modal-section">
                  <h3 className="exec-modal-section-title">Documentos</h3>
                  <div className="exec-docs-grid">
                    {[
                      {
                        key: "foto_3x4",
                        label: "Foto 3x4",
                        path: student?.foto_3x4_path,
                      },
                      {
                        key: "comprovante_matricula",
                        label: "Comprovante de Matrícula",
                        path: student?.comprovante_matricula_path,
                      },
                      {
                        key: "documento_identidade",
                        label: "Documento de Identidade",
                        path: student?.documento_identidade_path,
                      },
                    ].map(({ key, label, path }) => (
                      <div key={key} className="exec-doc-item">
                        {!path ? (
                          <div className="exec-doc-none">Não enviado</div>
                        ) : docUrls[key] && isImageDoc(key) ? (
                          <img
                            src={docUrls[key]}
                            alt={label}
                            className="exec-doc-preview"
                            onClick={() => window.open(docUrls[key], "_blank")}
                          />
                        ) : docUrls[key] ? (
                          <a
                            href={docUrls[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="exec-doc-link"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            Abrir PDF
                          </a>
                        ) : (
                          <div
                            className="dashboard-loading"
                            style={{ minHeight: 80 }}
                          />
                        )}
                        <p className="exec-doc-label">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Histórico */}
                {history.length > 0 && (
                  <div className="exec-modal-section">
                    <h3 className="exec-modal-section-title">Histórico</h3>
                    <div className="timeline">
                      {history.map((h) => (
                        <div key={h.id} className="timeline-item">
                          <div className={`timeline-dot ${h.action}`} />
                          <div className="timeline-content">
                            <p className="timeline-action">
                              {actionLabel[h.action] ?? h.action}
                            </p>
                            <p className="timeline-meta">
                              {h.users?.full_name ?? "Sistema"} —{" "}
                              {formatDateTime(h.created_at)}
                            </p>
                            {h.justification && (
                              <p className="timeline-justification">
                                {h.justification}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Carteirinhas ocultas para exportação PDF */}
          {ticket.status === "approved" && student && (
            <>
              {/* Física (frente + verso) */}
              <div className="student-card-offscreen">
                <div ref={cardRef} className="student-card-duo">
                  <div className="student-card-document">
                    <div className="student-card-doc-header">
                      <div className="student-card-doc-header-row">
                        <img
                          src="/logo-prefeitura.png"
                          alt="Logo"
                          className="student-card-doc-logo"
                          crossOrigin="anonymous"
                        />
                        <div>
                          <h3>Prefeitura Municipal de Nova Ponte</h3>
                          <p>Carteirinha Estudantil</p>
                        </div>
                      </div>
                    </div>
                    <div className="student-card-doc-body">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Foto 3x4"
                          className="student-card-doc-photo"
                          crossOrigin="anonymous"
                          onLoad={(e) =>
                            (e.currentTarget.dataset.loaded = "true")
                          }
                        />
                      ) : (
                        <div className="student-card-doc-photo-placeholder">
                          Sem foto
                        </div>
                      )}
                      <div className="student-card-doc-fields">
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Nome:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.full_name ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            CPF:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.cpf
                              ? formatCPF(ticket.users.cpf)
                              : "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Curso:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.cursos?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Período:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.periodos?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Instituição:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.instituicoes?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Matrícula:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.student_id_number || "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Cidade:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.cidades?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Telefone:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.phone
                              ? formatPhone(ticket.users.phone)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="student-card-doc-footer">
                      <span>
                        Validade:{" "}
                        <strong>
                          {cardExpiryDate ? formatDate(cardExpiryDate) : "—"}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="student-card-document">
                    <div className="student-card-doc-header">
                      <div className="student-card-doc-header-row">
                        <img
                          src="/logo-prefeitura.png"
                          alt="Logo"
                          className="student-card-doc-logo"
                          crossOrigin="anonymous"
                        />
                        <div>
                          <h3>Prefeitura Municipal de Nova Ponte</h3>
                          <p>Verso da Carteirinha</p>
                        </div>
                      </div>
                    </div>
                    <div className="student-card-doc-back">
                      {qrCodeDataUrl && (
                        <img
                          src={qrCodeDataUrl}
                          alt="QR Code"
                          className="student-card-doc-qr"
                        />
                      )}
                      <p className="student-card-doc-back-text">
                        Apresente esta carteirinha ao motorista para validação.
                        Em caso de perda, entre em contato com a prefeitura.
                      </p>
                      <p className="student-card-doc-back-url">
                        novaponte.mg.gov.br
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital (layout único) */}
              <div className="student-card-offscreen">
                <div ref={digitalCardRef} className="student-card-virtual">
                  <div className="student-card-document">
                    <div className="student-card-doc-header">
                      <div className="student-card-doc-header-row">
                        <img
                          src="/logo-prefeitura.png"
                          alt="Logo"
                          className="student-card-doc-logo"
                          crossOrigin="anonymous"
                        />
                        <div>
                          <h3>Prefeitura Municipal de Nova Ponte</h3>
                          <p>Carteirinha Estudantil Digital</p>
                        </div>
                      </div>
                    </div>
                    <div className="student-card-doc-body">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Foto 3x4"
                          className="student-card-doc-photo"
                          crossOrigin="anonymous"
                          onLoad={(e) =>
                            (e.currentTarget.dataset.loaded = "true")
                          }
                        />
                      ) : (
                        <div className="student-card-doc-photo-placeholder">
                          Sem foto
                        </div>
                      )}
                      <div className="student-card-doc-fields">
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Nome:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.full_name ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            CPF:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.cpf
                              ? formatCPF(ticket.users.cpf)
                              : "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Curso:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.cursos?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Período:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.periodos?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Instituição:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.instituicoes?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Matrícula:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.student_id_number || "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Cidade:
                          </span>
                          <span className="student-card-doc-field-value">
                            {student.cidades?.nome ?? "—"}
                          </span>
                        </div>
                        <div className="student-card-doc-field">
                          <span className="student-card-doc-field-label">
                            Telefone:
                          </span>
                          <span className="student-card-doc-field-value">
                            {ticket.users?.phone
                              ? formatPhone(ticket.users.phone)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="student-card-virtual-bottom">
                      {qrCodeDataUrl && (
                        <img
                          src={qrCodeDataUrl}
                          alt="QR Code"
                          className="student-card-virtual-qr"
                          crossOrigin="anonymous"
                        />
                      )}
                      <div className="student-card-virtual-bottom-info">
                        <span>
                          Validade:{" "}
                          <strong>
                            {cardExpiryDate ? formatDate(cardExpiryDate) : "—"}
                          </strong>
                        </span>
                        <p className="student-card-doc-back-url">
                          novaponte.mg.gov.br
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer com ações */}
          {!loadingData && (
            <div className="exec-modal-footer">
              {ticket.status === "open" && (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Salvando..." : "Aprovar"}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setJustDialog("reject")}
                    disabled={actionLoading}
                  >
                    Rejeitar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setJustDialog("info")}
                    disabled={actionLoading}
                  >
                    Mais Infos
                  </button>
                </>
              )}
              {ticket.status === "approved" && (
                <>
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setDownloadMenu(!downloadMenu)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Baixar Carteirinha
                    </button>
                    {downloadMenu && (
                      <div className="exec-download-menu">
                        <button
                          className="exec-download-option"
                          onClick={() => {
                            if (!cardRef.current) return
                            generateCardPdf(
                              cardRef.current,
                              `carteirinha-fisica-${ticket.users?.full_name ?? "estudante"}.pdf`,
                            )
                            setDownloadMenu(false)
                          }}
                        >
                          PDF Física
                        </button>
                        <button
                          className="exec-download-option"
                          onClick={() => {
                            if (!digitalCardRef.current) return
                            generateCardPdf(
                              digitalCardRef.current,
                              `carteirinha-digital-${ticket.users?.full_name ?? "estudante"}.pdf`,
                            )
                            setDownloadMenu(false)
                          }}
                        >
                          PDF Digital
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleReopen}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Salvando..." : "Reabrir como Pendente"}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setJustDialog("reject")}
                    disabled={actionLoading}
                  >
                    Rejeitar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setJustDialog("info")}
                    disabled={actionLoading}
                  >
                    Mais Infos
                  </button>
                </>
              )}
              {ticket.status === "rejected" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleUnblock}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Salvando..." : "Desbloquear Estudante"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs de justificativa */}
      {justDialog === "reject" && (
        <JustificationDialog
          title="Rejeitar solicitação"
          description="Informe o motivo da rejeição. O estudante não poderá enviar nova solicitação até ser desbloqueado."
          confirmLabel="Rejeitar"
          confirmClass="btn-danger"
          onConfirm={handleReject}
          onCancel={() => setJustDialog(null)}
          loading={actionLoading}
        />
      )}
      {justDialog === "info" && (
        <JustificationDialog
          title="Solicitar mais informações"
          description="Descreva quais informações ou documentos o estudante precisa corrigir ou reenviar."
          confirmLabel="Solicitar"
          confirmClass="btn-primary"
          onConfirm={handleRequestInfo}
          onCancel={() => setJustDialog(null)}
          loading={actionLoading}
        />
      )}
    </>
  )
}

/* ─────────────────── Main ──────────────────── */
export default function ExecutiveDashboard() {
  usePageTitle("Executivo")
  const { user } = useAuth()
  const currentUserId = user?.id ?? ""

  const [tickets, setTickets] = useState<TicketWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("open")
  const [search, setSearch] = useState("")
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(
    null,
  )

  useEffect(() => {
    loadTickets()
  }, [activeTab])

  async function loadTickets() {
    setLoading(true)
    try {
      const dbStatus = activeTab === "self_cancelled" ? "rejected" : activeTab
      const { data } = await supabase
        .from("tickets")
        .select("*, users!tickets_user_id_fkey(full_name, email, cpf, phone)")
        .eq("status", dbStatus)
        .order("created_at", { ascending: false })

      let result = data ?? []

      // Separar auto-encerrados dos rejeitados pelo executivo
      if (activeTab === "self_cancelled" || activeTab === "rejected") {
        const ticketIds = result.map((t) => t.id)
        if (ticketIds.length > 0) {
          const { data: histEntries } = await supabase
            .from("ticket_history")
            .select("ticket_id, performed_by")
            .in("ticket_id", ticketIds)
            .eq("action", "rejected")
            .order("created_at", { ascending: false })

          // Pegar o performed_by mais recente de cada ticket
          const latestPerformer = new Map<string, string>()
          for (const h of histEntries ?? []) {
            if (!latestPerformer.has(h.ticket_id)) {
              latestPerformer.set(h.ticket_id, h.performed_by)
            }
          }

          if (activeTab === "self_cancelled") {
            result = result.filter(
              (t) => latestPerformer.get(t.id) === t.user_id,
            )
          } else {
            result = result.filter(
              (t) => latestPerformer.get(t.id) !== t.user_id,
            )
          }
        }
      }

      setTickets(result)
    } catch (err) {
      console.error("[ExecutiveDashboard] loadTickets error:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const num = `#${t.ticket_number}`
    return (
      num.includes(q) ||
      (t.users?.full_name?.toLowerCase().includes(q) ?? false) ||
      (t.users?.email?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Painel Executivo</h1>
          <p className="dashboard-sub">
            Gerencie solicitações de carteirinha dos estudantes
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            type="text"
            className="input-field"
            placeholder="Pesquisar por #número, nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="admin-count">
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="dashboard-loading" />
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <p className="empty-state-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </p>
          <h2 className="empty-state-title">
            {search
              ? "Nenhum resultado encontrado"
              : "Nenhum ticket neste status"}
          </h2>
          <p className="empty-state-desc">
            {search
              ? "Tente pesquisar com outros termos."
              : "Quando novos tickets aparecerem, eles serão listados aqui."}
          </p>
        </div>
      ) : (
        <div className="card-list">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="exec-ticket card clickable"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="exec-ticket-header">
                <div>
                  <p className="exec-ticket-user">
                    <span className="exec-ticket-number">
                      #{ticket.ticket_number}
                    </span>{" "}
                    {ticket.users?.full_name ?? "Desconhecido"}
                  </p>
                  <p className="exec-ticket-email">{ticket.users?.email}</p>
                </div>
                <span className={`badge ${statusBadge[ticket.status]}`}>
                  {statusLabel[ticket.status] ?? ticket.status}
                </span>
              </div>
              <div className="exec-ticket-info">
                <span className="ticket-type">
                  {ticket.type === "card_creation"
                    ? "Solicitação de Carteirinha"
                    : "Pergunta"}
                </span>
                <span className="ticket-date">
                  {formatDate(ticket.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          currentUserId={currentUserId}
          onClose={() => setSelectedTicket(null)}
          onActionDone={loadTickets}
        />
      )}
    </div>
  )
}
