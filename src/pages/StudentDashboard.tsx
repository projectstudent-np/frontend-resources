import { useEffect, useRef, useState } from "react"
import { useAuth } from "../store/AuthContext"
import { supabase } from "../app/supabase"
import { generateCardPdf } from "../utils/generateCardPdf"
import QRCode from "qrcode"
import type { Student, TicketHistory } from "../types"
import usePageTitle from "../hooks/usePageTitle"
import "./Dashboard.css"

interface MasterItem {
  id: string
  nome: string
}

interface TicketHistoryWithUser extends TicketHistory {
  users?: { full_name: string }
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

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
}

const STEPS = [
  { label: "Dados Pessoais" },
  { label: "Dados Educacionais" },
  { label: "Anexos" },
]

const actionLabel: Record<string, string> = {
  submitted: "Solicitação enviada",
  approved: "Solicitação aprovada",
  rejected: "Solicitação rejeitada",
  info_requested: "Informações solicitadas",
  resubmitted: "Solicitação reenviada",
  unblocked: "Estudante desbloqueado",
}

/* ─────────────────── Stepper UI ─────────────────── */
function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="stepper">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentStep
        const isActive = i === currentStep
        const cls = isCompleted ? "completed" : isActive ? "active" : ""

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: i < STEPS.length - 1 ? 1 : "0 0 auto",
            }}
          >
            <div className={`stepper-step ${cls}`}>
              <div className="stepper-circle">
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8.5L6.5 12L13 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="stepper-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`stepper-connector ${isCompleted ? "completed" : "dashed"}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────── Step 1: Dados Pessoais ─────── */
function StepPersonalInfo({ onNext }: { onNext: () => void }) {
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!user) return null

  const nameValue = fullName.trim()
  const phoneDigits = phone.replace(/\D/g, "")
  const canSave = nameValue.length > 0 && phoneDigits.length === 11

  const handleSaveAndContinue = async () => {
    if (!nameValue) {
      setError("O nome completo é obrigatório.")
      return
    }
    if (phoneDigits.length !== 11) {
      setError("Informe um telefone válido com DDD (11 dígitos).")
      return
    }

    setSaving(true)
    setError("")
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: toTitleCase(nameValue),
          phone: phoneDigits,
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      await refreshUser()
      onNext()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="step-card card">
      <h2 className="step-card-title">Dados Pessoais</h2>
      <p className="step-card-desc">
        Preencha seus dados pessoais para continuar.
      </p>

      <div className="step-form-grid">
        <div className="input-group">
          <label className="input-label" htmlFor="step-name">
            Nome completo *
          </label>
          <input
            id="step-name"
            type="text"
            className="input-field"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setError("")
            }}
            disabled={saving}
          />
        </div>

        <div className="step-readonly">
          <span className="step-readonly-label">CPF</span>
          <span className="step-readonly-value">{formatCPF(user.cpf)}</span>
        </div>

        <div className="step-readonly">
          <span className="step-readonly-label">Email</span>
          <span className="step-readonly-value">{user.email || "—"}</span>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="step-phone">
            Telefone *
          </label>
          <input
            id="step-phone"
            type="text"
            inputMode="numeric"
            className="input-field"
            placeholder="(00) 0 0000-0000"
            value={formatPhone(phone)}
            maxLength={16}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, ""))
              setError("")
            }}
            disabled={saving}
          />
        </div>

        <div className="step-readonly">
          <span className="step-readonly-label">Conta criada em</span>
          <span className="step-readonly-value">
            {formatDate(user.created_at)}
          </span>
        </div>
      </div>

      {error && (
        <p className="auth-error" style={{ marginTop: "var(--space-4)" }}>
          {error}
        </p>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveAndContinue}
          disabled={!canSave || saving}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────── Step 2: Dados Educacionais ──── */
function StepEducationalData({
  onSaveAndNext,
  onBack,
  form,
  setForm,
  saving,
}: {
  onSaveAndNext: () => Promise<void>
  onBack: () => void
  form: {
    curso_id: string
    periodo_id: string
    student_id_number: string
    instituicao_id: string
    cidade_id: string
  }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  saving: boolean
}) {
  const [periodos, setPeriodos] = useState<MasterItem[]>([])
  const [cursos, setCursos] = useState<MasterItem[]>([])
  const [instituicoes, setInstituicoes] = useState<MasterItem[]>([])
  const [cidades, setCidades] = useState<MasterItem[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadMaster() {
      try {
        const [p, c, i, ci] = await Promise.all([
          supabase.from("periodos").select("*").order("nome"),
          supabase.from("cursos").select("*").order("nome"),
          supabase.from("instituicoes").select("*").order("nome"),
          supabase.from("cidades").select("*").order("nome"),
        ])
        setPeriodos(p.data ?? [])
        setCursos(c.data ?? [])
        setInstituicoes(i.data ?? [])
        setCidades(ci.data ?? [])
      } catch {
        setError("Erro ao carregar dados. Recarregue a página.")
      } finally {
        setLoadingData(false)
      }
    }
    loadMaster()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const canContinue =
    form.curso_id &&
    form.periodo_id &&
    form.instituicao_id &&
    form.cidade_id &&
    form.student_id_number.trim()

  const handleNext = async () => {
    if (!canContinue) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }
    try {
      await onSaveAndNext()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados.")
    }
  }

  if (loadingData) {
    return (
      <div className="step-card card" style={{ padding: "var(--space-5)" }}>
        <span className="skeleton-block" style={{ width: 180, height: 18, display: "block" }} />
        <span className="skeleton-block" style={{ width: 240, height: 13, display: "block", marginTop: 8 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="skeleton-block" style={{ width: 80, height: 12, display: "block" }} />
              <span className="skeleton-block" style={{ width: "100%", height: 40, display: "block", borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="step-card card">
      <h2 className="step-card-title">Dados Educacionais</h2>
      <p className="step-card-desc">Preencha suas informações acadêmicas.</p>

      <div className="step-form-grid">
        <div className="input-group">
          <label className="input-label" htmlFor="periodo_id">
            Período / Semestre *
          </label>
          <select
            id="periodo_id"
            name="periodo_id"
            className="input-field"
            value={form.periodo_id}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecione um período</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="curso_id">
            Curso *
          </label>
          <select
            id="curso_id"
            name="curso_id"
            className="input-field"
            value={form.curso_id}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecione um curso</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="instituicao_id">
            Instituição *
          </label>
          <select
            id="instituicao_id"
            name="instituicao_id"
            className="input-field"
            value={form.instituicao_id}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecione uma instituição</option>
            {instituicoes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="cidade_id">
            Cidade da Faculdade *
          </label>
          <select
            id="cidade_id"
            name="cidade_id"
            className="input-field"
            value={form.cidade_id}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecione uma cidade</option>
            {cidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="student_id_number">
            Matrícula / RA *
          </label>
          <input
            id="student_id_number"
            name="student_id_number"
            type="text"
            className="input-field"
            placeholder="Número de matrícula"
            value={form.student_id_number}
            onChange={handleChange}
            disabled={saving}
          />
        </div>
      </div>

      {error && (
        <p className="auth-error" style={{ marginTop: "var(--space-4)" }}>
          {error}
        </p>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={saving}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleNext}
          disabled={!canContinue || saving}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────── Step 3: Anexos ─────────────── */
interface UploadedFiles {
  foto_3x4: string | null
  comprovante_matricula: string | null
  documento_identidade: string | null
}

const UPLOAD_ICON = (
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
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const CHECK_ICON = (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function StepAttachments({
  onBack,
  onSubmit,
  submitting,
  userId,
  existingFiles,
}: {
  onBack: () => void
  onSubmit: (files: UploadedFiles) => void
  submitting: boolean
  userId: string
  existingFiles?: UploadedFiles
}) {
  const [files, setFiles] = useState<UploadedFiles>(
    existingFiles ?? {
      foto_3x4: null,
      comprovante_matricula: null,
      documento_identidade: null,
    },
  )
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  // Gerar signed URLs para preview dos arquivos existentes
  useEffect(() => {
    const keys = [
      "foto_3x4",
      "comprovante_matricula",
      "documento_identidade",
    ] as const
    keys.forEach(async (key) => {
      const path = files[key]
      if (path) {
        const { data } = await supabase.storage
          .from("student-documents")
          .createSignedUrl(path, 600)
        if (data?.signedUrl)
          setPreviewUrls((prev) => ({ ...prev, [key]: data.signedUrl }))
      }
    })
  }, [])

  const allUploaded =
    !!files.foto_3x4 &&
    !!files.comprovante_matricula &&
    !!files.documento_identidade

  async function handleFileSelect(key: keyof UploadedFiles, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 5MB.")
      return
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowed.includes(file.type)) {
      setError("Formato inválido. Use JPG, PNG, WebP ou PDF.")
      return
    }

    setUploading(key)
    setError("")
    try {
      const path = `${userId}/${key}`

      // Sempre deletar o arquivo existente antes de subir o novo
      const oldPath = files[key]
      if (oldPath) {
        await supabase.storage.from("student-documents").remove([oldPath])
      }
      // Também tenta deletar o path fixo caso já exista
      if (!oldPath || oldPath !== path) {
        await supabase.storage.from("student-documents").remove([path])
      }

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      setFiles((prev) => ({ ...prev, [key]: path }))
      // Gerar preview URL do novo arquivo
      const { data: signedData } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(path, 600)
      if (signedData?.signedUrl)
        setPreviewUrls((prev) => ({ ...prev, [key]: signedData.signedUrl }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.")
    } finally {
      setUploading(null)
    }
  }

  function triggerInput(key: keyof UploadedFiles, accept: string) {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelect(key, file)
    }
    input.click()
  }

  return (
    <div className="step-card card">
      <h2 className="step-card-title">Anexos</h2>
      <p className="step-card-desc">
        Envie os documentos necessários para a emissão da carteirinha.{" "}
        <span className="upload-limit-hint">Máximo 5MB por arquivo.</span>
      </p>

      <div className="step-uploads">
        <div className={`upload-item${files.foto_3x4 ? " upload-done" : ""}`}>
          <div className="upload-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="upload-info">
            <p className="upload-title">Foto do rosto (3x4)</p>
            <p className="upload-desc">
              Foto recente, de frente, com fundo claro. Sem acessórios que
              cubram o rosto. Esta será a foto da sua carteirinha.
            </p>
            {files.foto_3x4 ? (
              <span className="upload-btn-row">
                <span className="upload-btn-success">{CHECK_ICON} Enviado</span>
                <button
                  type="button"
                  className="upload-btn"
                  disabled={!!uploading}
                  onClick={() =>
                    triggerInput("foto_3x4", "image/jpeg,image/png,image/webp")
                  }
                >
                  {uploading === "foto_3x4" ? (
                    "Enviando..."
                  ) : (
                    <>{UPLOAD_ICON} Substituir arquivo enviado</>
                  )}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="upload-btn"
                disabled={uploading === "foto_3x4"}
                onClick={() =>
                  triggerInput("foto_3x4", "image/jpeg,image/png,image/webp")
                }
              >
                {uploading === "foto_3x4" ? (
                  "Enviando..."
                ) : (
                  <>{UPLOAD_ICON} Selecionar foto</>
                )}
              </button>
            )}
            {previewUrls.foto_3x4 && (
              <div className="upload-preview">
                <img
                  src={previewUrls.foto_3x4}
                  alt="Preview foto 3x4"
                  className="upload-preview-img"
                />
              </div>
            )}
          </div>
          <div className="upload-example">
            <img
              src="/foto-3x4-example.png"
              alt="Exemplo foto 3x4"
              className="upload-example-img"
            />
          </div>
        </div>

        <div
          className={`upload-item${files.comprovante_matricula ? " upload-done" : ""}`}
        >
          <div className="upload-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="upload-info">
            <p className="upload-title">Comprovante de matrícula</p>
            <p className="upload-desc">
              Declaração de matrícula ou comprovante de vínculo com a
              instituição de ensino.
            </p>
            {files.comprovante_matricula ? (
              <span className="upload-btn-row">
                <span className="upload-btn-success">{CHECK_ICON} Enviado</span>
                <button
                  type="button"
                  className="upload-btn"
                  disabled={!!uploading}
                  onClick={() =>
                    triggerInput(
                      "comprovante_matricula",
                      "image/jpeg,image/png,image/webp,application/pdf",
                    )
                  }
                >
                  {uploading === "comprovante_matricula" ? (
                    "Enviando..."
                  ) : (
                    <>{UPLOAD_ICON} Substituir arquivo enviado</>
                  )}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="upload-btn"
                disabled={uploading === "comprovante_matricula"}
                onClick={() =>
                  triggerInput(
                    "comprovante_matricula",
                    "image/jpeg,image/png,image/webp,application/pdf",
                  )
                }
              >
                {uploading === "comprovante_matricula" ? (
                  "Enviando..."
                ) : (
                  <>{UPLOAD_ICON} Selecionar arquivo</>
                )}
              </button>
            )}
            {previewUrls.comprovante_matricula && (
              <div className="upload-preview">
                <img
                  src={previewUrls.comprovante_matricula}
                  alt="Preview comprovante"
                  className="upload-preview-img"
                />
              </div>
            )}
          </div>
        </div>

        <div
          className={`upload-item${files.documento_identidade ? " upload-done" : ""}`}
        >
          <div className="upload-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div className="upload-info">
            <p className="upload-title">RG ou comprovante de residência</p>
            <p className="upload-desc">
              Documento de identidade (frente e verso) ou conta de água/luz
              recente.
            </p>
            {files.documento_identidade ? (
              <span className="upload-btn-row">
                <span className="upload-btn-success">{CHECK_ICON} Enviado</span>
                <button
                  type="button"
                  className="upload-btn"
                  disabled={!!uploading}
                  onClick={() =>
                    triggerInput(
                      "documento_identidade",
                      "image/jpeg,image/png,image/webp,application/pdf",
                    )
                  }
                >
                  {uploading === "documento_identidade" ? (
                    "Enviando..."
                  ) : (
                    <>{UPLOAD_ICON} Substituir arquivo enviado</>
                  )}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="upload-btn"
                disabled={uploading === "documento_identidade"}
                onClick={() =>
                  triggerInput(
                    "documento_identidade",
                    "image/jpeg,image/png,image/webp,application/pdf",
                  )
                }
              >
                {uploading === "documento_identidade" ? (
                  "Enviando..."
                ) : (
                  <>{UPLOAD_ICON} Selecionar arquivo</>
                )}
              </button>
            )}
            {previewUrls.documento_identidade && (
              <div className="upload-preview">
                <img
                  src={previewUrls.documento_identidade}
                  alt="Preview documento"
                  className="upload-preview-img"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="auth-error" style={{ marginTop: "var(--space-4)" }}>
          {error}
        </p>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={!!uploading}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSubmit(files)}
          disabled={!allUploaded || submitting || !!uploading}
        >
          {submitting ? "Enviando..." : "Salvar e solicitar carteirinha"}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────── Main Component ─────────────── */
export default function StudentDashboard() {
  usePageTitle("Estudante")
  const { user, session } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [timeline, setTimeline] = useState<TicketHistoryWithUser[]>([])
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Info requested state
  const [infoRequestJustification, setInfoRequestJustification] = useState<
    string | null
  >(null)
  const [infoRequestExecutive, setInfoRequestExecutive] = useState<
    string | null
  >(null)
  // Rejected state
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [rejectionExecutive, setRejectionExecutive] = useState<string | null>(
    null,
  )
  const [selfCancelled, setSelfCancelled] = useState(false)
  const [resubmitLoading, setResubmitLoading] = useState(false)

  // Cancel card state
  const [cancelCpf, setCancelCpf] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Carteirinha state (approved)
  const [studentFull, setStudentFull] = useState<Record<string, any> | null>(
    null,
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [cardExpiryDate, setCardExpiryDate] = useState<string | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const digitalCardRef = useRef<HTMLDivElement>(null)
  const digitalPdfRef = useRef<HTMLDivElement>(null)

  // Stepper state
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [form, setForm] = useState({
    curso_id: "",
    periodo_id: "",
    student_id_number: "",
    instituicao_id: "",
    cidade_id: "",
  })

  const userId = user?.id ?? session?.user?.id

  const loadData = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    setInfoRequestJustification(null)
    setInfoRequestExecutive(null)
    setRejectionReason(null)
    setRejectionExecutive(null)

    try {
      const { data: studentData, error: studentErr } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()
      if (studentErr)
        console.warn(
          "[StudentDashboard] students query error:",
          studentErr.message,
        )
      setStudent(studentData)

      // Se draft ou info_requested, restaurar form e posicionar stepper
      if (
        studentData?.status === "draft" ||
        studentData?.status === "info_requested"
      ) {
        setStudentId(studentData.id)
        setForm({
          curso_id: studentData.curso_id ?? "",
          periodo_id: studentData.periodo_id ?? "",
          student_id_number: studentData.student_id_number ?? "",
          instituicao_id: studentData.instituicao_id ?? "",
          cidade_id: studentData.cidade_id ?? "",
        })
        setCurrentStep(2) // Vai para Anexos, mas pode voltar
      }

      // Buscar justificativa de info_requested
      if (studentData?.status === "info_requested") {
        const { data: histEntry } = await supabase
          .from("ticket_history")
          .select("justification, action, users(full_name)")
          .not("justification", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (histEntry?.justification) {
          setInfoRequestJustification(histEntry.justification)
          setInfoRequestExecutive(
            (histEntry.users as unknown as { full_name: string })?.full_name ??
              null,
          )
        }
      }

      // Buscar motivo de rejeição e detectar auto-encerramento
      if (studentData?.status === "rejected") {
        const { data: histEntry } = await supabase
          .from("ticket_history")
          .select("justification, performed_by, users(full_name)")
          .eq("action", "rejected")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (histEntry) {
          setRejectionReason(histEntry.justification)
          setRejectionExecutive(
            (histEntry.users as unknown as { full_name: string })?.full_name ??
              null,
          )
          setSelfCancelled(histEntry.performed_by === userId)
        }
      }

      // Buscar dados completos + foto + validade para carteirinha aprovada
      if (studentData?.status === "approved") {
        const { data: fullData } = await supabase
          .from("students")
          .select(
            "cursos(nome), periodos(nome), instituicoes(nome), cidades(nome)",
          )
          .eq("id", studentData.id)
          .maybeSingle()
        setStudentFull(fullData)

        if (studentData.foto_3x4_path) {
          const { data: signedData } = await supabase.storage
            .from("student-documents")
            .createSignedUrl(studentData.foto_3x4_path, 600)
          if (signedData?.signedUrl) {
            setPhotoUrl(signedData.signedUrl)
            // Pré-converter para data URL (base64) para uso nos PDFs offscreen.
            // Isso evita problemas de CORS/cacheBust do html-to-image com URLs assinadas.
            try {
              const resp = await fetch(signedData.signedUrl)
              const blob = await resp.blob()
              const reader = new FileReader()
              const dataUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
              })
              setPhotoDataUrl(dataUrl)
            } catch (e) {
              console.warn("[StudentDashboard] Falha ao converter foto para data URL:", e)
            }
          }
        }

        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "card_expiry_date")
          .maybeSingle()
        if (settingsData?.value) setCardExpiryDate(settingsData.value)

        // Gerar QR code com URL de validação
        const qrUrl = `${window.location.origin}/validate/${studentData.id}`
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 1,
        })
        setQrCodeDataUrl(qrDataUrl)
      }

      // Buscar timeline (histórico de follow-ups)
      const { data: histData } = await supabase
        .from("ticket_history")
        .select("*, users(full_name)")
        .order("created_at", { ascending: false })
        .limit(20)

      // Filtrar apenas histórico dos tickets do usuário
      // (RLS já filtra, mas garantimos no frontend)
      setTimeline(histData ?? [])
    } catch (err) {
      console.error("[StudentDashboard] load error:", err)
      setError("Erro ao carregar dados. Tente recarregar a página.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  // Step 2: Salvar dados educacionais (INSERT ou UPDATE)
  const handleSaveEducational = async () => {
    if (!userId) return
    setSubmitting(true)
    try {
      if (studentId) {
        const { error: updateErr } = await supabase
          .from("students")
          .update({
            curso_id: form.curso_id,
            periodo_id: form.periodo_id,
            instituicao_id: form.instituicao_id,
            cidade_id: form.cidade_id,
            student_id_number: form.student_id_number,
          })
          .eq("id", studentId)
        if (updateErr) throw updateErr
      } else {
        const { data, error: insertErr } = await supabase
          .from("students")
          .insert({
            user_id: userId,
            curso_id: form.curso_id,
            periodo_id: form.periodo_id,
            instituicao_id: form.instituicao_id,
            cidade_id: form.cidade_id,
            student_id_number: form.student_id_number,
            status: "draft",
          })
          .select()
          .single()
        if (insertErr) throw insertErr
        setStudentId(data.id)
      }
      setCurrentStep(2)
    } catch (err: unknown) {
      console.error("[StudentDashboard] save educational error:", err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  // Encerrar carteirinha pelo próprio estudante
  async function handleCancelCard() {
    if (!user || !student) return
    setCancelLoading(true)
    try {
      await supabase
        .from("students")
        .update({ status: "rejected" })
        .eq("id", student.id)
      await supabase
        .from("student_cards")
        .update({ status: "cancelled" })
        .eq("student_id", student.id)
        .eq("status", "active")

      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "card_creation")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (ticket) {
        await supabase
          .from("tickets")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", ticket.id)
        await supabase.from("ticket_history").insert({
          ticket_id: ticket.id,
          action: "rejected",
          performed_by: user.id,
          justification: "O próprio usuário decidiu encerrar a carteirinha.",
        })
      }
      window.location.reload()
    } catch {
      /* silencioso */
    } finally {
      setCancelLoading(false)
    }
  }

  // Reenviar para análise após auto-encerramento
  // Muda student para info_requested (stepper aparece com dados preenchidos).
  // O ticket permanece 'rejected' até o estudante submeter pelo stepper (handleFinalSubmit).
  async function handleSelfResubmit() {
    if (!user || !student) return
    setResubmitLoading(true)
    try {
      await supabase
        .from("students")
        .update({ status: "info_requested" })
        .eq("id", student.id)
      window.location.reload()
    } catch {
      /* silencioso */
    } finally {
      setResubmitLoading(false)
    }
  }

  // Step 3: Finalizar (submit ou resubmit)
  const handleFinalSubmit = async (uploadedFiles: UploadedFiles) => {
    if (!userId || !studentId) return
    setSubmitting(true)
    try {
      // Atualizar student com arquivos
      const { error: updateErr } = await supabase
        .from("students")
        .update({
          foto_3x4_path: uploadedFiles.foto_3x4,
          comprovante_matricula_path: uploadedFiles.comprovante_matricula,
          documento_identidade_path: uploadedFiles.documento_identidade,
          status: "pending",
        })
        .eq("id", studentId)
      if (updateErr) throw updateErr

      // Salvar foto como avatar
      if (uploadedFiles.foto_3x4) {
        await supabase
          .from("users")
          .update({ avatar_path: uploadedFiles.foto_3x4 })
          .eq("id", userId)
      }

      if (student?.status === "info_requested") {
        // RESUBMIT: atualizar ticket existente para open
        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "card_creation")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingTicket) {
          await supabase
            .from("tickets")
            .update({ status: "open", updated_at: new Date().toISOString() })
            .eq("id", existingTicket.id)
          await supabase.from("ticket_history").insert({
            ticket_id: existingTicket.id,
            action: "resubmitted",
            performed_by: userId,
          })
        }
      } else {
        // PRIMEIRO ENVIO: criar ticket novo + history
        const { data: newTicket } = await supabase
          .from("tickets")
          .insert({ user_id: userId, type: "card_creation", status: "open" })
          .select("id")
          .single()

        if (newTicket) {
          await supabase.from("ticket_history").insert({
            ticket_id: newTicket.id,
            action: "submitted",
            performed_by: userId,
          })
        }
      }

      setCurrentStep(0)
      setStudentId(null)
      await loadData()
    } catch (err: unknown) {
      console.error("[StudentDashboard] final submit error:", err)
      setError(
        err instanceof Error ? err.message : "Erro ao enviar solicitação.",
      )
      setSubmitting(false)
    }
  }

  const statusBadge: Record<string, string> = {
    pending: "badge-warning",
    approved: "badge-success",
    rejected: "badge-error",
    info_requested: "badge-warning",
    active: "badge-success",
    cancelled: "badge-error",
  }

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    info_requested: "Informações solicitadas",
    active: "Ativo",
    cancelled: "Cancelado",
  }

  const displayName =
    user?.full_name?.trim() || session?.user?.email || "Estudante"
  const showStepper =
    !student ||
    student.status === "draft" ||
    student.status === "info_requested"

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <span className="skeleton-block" style={{ width: 220, height: 24, display: "block" }} />
            <span className="skeleton-block" style={{ width: 160, height: 14, display: "block", marginTop: 8 }} />
          </div>
        </div>
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <span className="skeleton-block" style={{ width: 100, height: 120, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[180, 140, 160, 120, 150, 100].map((w, i) => (
                <span key={i} className="skeleton-block" style={{ width: w, height: 14, display: "block" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )

  if (error && !student) {
    return (
      <div className="dashboard-page">
        <div className="empty-state card">
          <p className="empty-state-icon">!</p>
          <h2 className="empty-state-title">{error}</h2>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </div>
    )
  }

  // Stepper: sem registro, draft ou info_requested
  if (showStepper) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              {student?.status === "info_requested"
                ? "Atualizar Solicitação"
                : "Solicitar Carteirinha"}
            </h1>
            <p className="dashboard-sub">
              {student?.status === "info_requested"
                ? "Atualize as informações solicitadas pelo executivo."
                : "Preencha as etapas abaixo para solicitar sua carteirinha estudantil."}
            </p>
          </div>
        </div>

        {/* Banner info_requested */}
        {student?.status === "info_requested" && infoRequestJustification && (
          <div
            className="alert-warning"
            style={{ marginBottom: "var(--space-6)" }}
          >
            <strong>
              Informações solicitadas
              {infoRequestExecutive ? ` por ${infoRequestExecutive}` : ""}:
            </strong>
            <p style={{ marginTop: "var(--space-2)" }}>
              {infoRequestJustification}
            </p>
          </div>
        )}

        <Stepper currentStep={currentStep} />

        {error && (
          <p className="auth-error" style={{ marginBottom: "var(--space-4)" }}>
            {error}
          </p>
        )}

        {currentStep === 0 && (
          <StepPersonalInfo onNext={() => setCurrentStep(1)} />
        )}
        {currentStep === 1 && (
          <StepEducationalData
            onSaveAndNext={handleSaveEducational}
            onBack={() => setCurrentStep(0)}
            form={form}
            setForm={setForm}
            saving={submitting}
          />
        )}
        {currentStep === 2 && userId && (
          <StepAttachments
            onBack={() => setCurrentStep(1)}
            onSubmit={handleFinalSubmit}
            submitting={submitting}
            userId={userId}
            existingFiles={
              student
                ? {
                    foto_3x4: student.foto_3x4_path ?? null,
                    comprovante_matricula:
                      student.comprovante_matricula_path ?? null,
                    documento_identidade:
                      student.documento_identidade_path ?? null,
                  }
                : undefined
            }
          />
        )}
      </div>
    )
  }

  // Dashboard normal (pending, approved, rejected)
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Meu Painel</h1>
          <p className="dashboard-sub">Bem-vindo(a), {displayName}</p>
        </div>
      </div>

      {/* Status: Rejeitado */}
      {student.status === "rejected" && (
        <section className="section">
          {selfCancelled ? (
            <div
              className="alert-warning"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <strong>Você encerrou sua carteirinha.</strong>
              <p style={{ marginTop: "var(--space-2)" }}>
                Caso deseje uma nova carteirinha, clique no botão abaixo para
                reenviar sua solicitação para análise.
              </p>
              <button
                className="btn btn-primary btn-sm"
                disabled={resubmitLoading}
                onClick={handleSelfResubmit}
                style={{ marginTop: "var(--space-3)" }}
              >
                {resubmitLoading ? "Reenviando..." : "Reenviar para análise"}
              </button>
            </div>
          ) : (
            <div
              className="alert-error"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <strong>Sua solicitação foi rejeitada.</strong>
              {rejectionReason && (
                <p style={{ marginTop: "var(--space-2)" }}>
                  Motivo{rejectionExecutive ? ` (${rejectionExecutive})` : ""}:{" "}
                  {rejectionReason}
                </p>
              )}
              <p
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: "var(--gray-500)",
                }}
              >
                Não é possível enviar uma nova solicitação no momento. Entre em
                contato para mais informações.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Carteirinha aprovada */}
      {student.status === "approved" && (
        <section className="section">
          {/* 3 botões de ação */}
          <div className="card-action-buttons">
            <button
              className="card-action-btn"
              onClick={() => {
                if (!cardRef.current) return
                generateCardPdf(cardRef.current, "carteirinha-fisica.pdf")
              }}
            >
              <svg
                width="28"
                height="28"
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
              <span>PDF Física</span>
            </button>
            <button
              className="card-action-btn"
              onClick={() => {
                if (!digitalPdfRef.current) return
                generateCardPdf(
                  digitalPdfRef.current,
                  "carteirinha-digital.pdf",
                )
              }}
            >
              <svg
                width="28"
                height="28"
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
              <span>PDF Digital</span>
            </button>
            <button
              className={`card-action-btn${showSettings ? " card-action-btn--active" : ""}`}
              onClick={() => setShowSettings((v) => !v)}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Configurações</span>
            </button>
          </div>

          {/* Configurações (toggle) */}
          {showSettings && (
            <div className="card-settings-section">
              <h3 className="card-settings-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Configurações da Carteirinha
              </h3>
              <p className="card-settings-desc">
                Para encerrar sua carteirinha, confirme digitando seu CPF.
              </p>
              <div className="card-settings-row">
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="000.000.000-00"
                  value={cancelCpf}
                  maxLength={14}
                  onChange={(e) => setCancelCpf(formatCPF(e.target.value))}
                />
                <button
                  className="btn btn-error btn-sm"
                  disabled={
                    cancelCpf.replace(/\D/g, "") !== user?.cpf || cancelLoading
                  }
                  onClick={handleCancelCard}
                >
                  {cancelLoading ? (
                    "Encerrando..."
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <h2 className="section-title">Minha Carteirinha</h2>

          {/* Pré-visualização: modelo Digital (único) */}
          <div className="student-card-virtual" ref={digitalCardRef}>
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
                      {displayName}
                    </span>
                  </div>
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">CPF:</span>
                    <span className="student-card-doc-field-value">
                      {user ? formatCPF(user.cpf) : "—"}
                    </span>
                  </div>
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">Curso:</span>
                    <span className="student-card-doc-field-value">
                      {studentFull?.cursos?.nome ?? "—"}
                    </span>
                  </div>
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">
                      Período:
                    </span>
                    <span className="student-card-doc-field-value">
                      {studentFull?.periodos?.nome ?? "—"}
                    </span>
                  </div>
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">
                      Instituição:
                    </span>
                    <span className="student-card-doc-field-value">
                      {studentFull?.instituicoes?.nome ?? "—"}
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
                      {studentFull?.cidades?.nome ?? "—"}
                    </span>
                  </div>
                  <div className="student-card-doc-field">
                    <span className="student-card-doc-field-label">
                      Telefone:
                    </span>
                    <span className="student-card-doc-field-value">
                      {user?.phone ? formatPhone(user.phone) : "—"}
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

          {/* Modelo Física (frente + verso) — oculto, usado apenas para gerar PDF */}
          <div className="student-card-offscreen">
            <div ref={cardRef} className="physical-pdf-page">
              <div className="digital-pdf-header">
                <img
                  src="/logo-prefeitura.png"
                  alt="Logo"
                  crossOrigin="anonymous"
                />
                <div className="digital-pdf-header-text">
                  <h3>Prefeitura Municipal de Nova Ponte</h3>
                  <p>Carteirinha Estudantil</p>
                </div>
              </div>
              <p className="pdf-description">
                Aqui está sua carteirinha física para impressão — gerada pelo Sistema de Carteirinha de Transporte da Prefeitura Municipal de Nova Ponte.
              </p>
              <div className="physical-pdf-body student-card-duo">
              {/* FRENTE */}
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
                  {(photoDataUrl || photoUrl) ? (
                    <img
                      src={photoDataUrl || photoUrl!}
                      alt="Foto 3x4"
                      className="student-card-doc-photo"
                      crossOrigin="anonymous"
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
                        {displayName}
                      </span>
                    </div>
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">CPF:</span>
                      <span className="student-card-doc-field-value">
                        {user ? formatCPF(user.cpf) : "—"}
                      </span>
                    </div>
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">
                        Curso:
                      </span>
                      <span className="student-card-doc-field-value">
                        {studentFull?.cursos?.nome ?? "—"}
                      </span>
                    </div>
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">
                        Período:
                      </span>
                      <span className="student-card-doc-field-value">
                        {studentFull?.periodos?.nome ?? "—"}
                      </span>
                    </div>
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">
                        Instituição:
                      </span>
                      <span className="student-card-doc-field-value">
                        {studentFull?.instituicoes?.nome ?? "—"}
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
                        {studentFull?.cidades?.nome ?? "—"}
                      </span>
                    </div>
                    <div className="student-card-doc-field">
                      <span className="student-card-doc-field-label">
                        Telefone:
                      </span>
                      <span className="student-card-doc-field-value">
                        {user?.phone ? formatPhone(user.phone) : "—"}
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

              {/* VERSO */}
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
                    Apresente esta carteirinha ao motorista para validação. Em
                    caso de perda, entre em contato com a prefeitura.
                  </p>
                  <p className="student-card-doc-back-url">
                    novaponte.mg.gov.br
                  </p>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Digital PDF (CNH-style) — offscreen, only for PDF export */}
          <div className="student-card-offscreen">
            <div ref={digitalPdfRef} className="digital-pdf-page">
              <div className="digital-pdf-header">
                <img
                  src="/logo-prefeitura.png"
                  alt="Logo"
                  crossOrigin="anonymous"
                />
                <div className="digital-pdf-header-text">
                  <h3>Prefeitura Municipal de Nova Ponte</h3>
                  <p>Carteirinha Estudantil Digital</p>
                </div>
              </div>
              <p className="pdf-description">
                Aqui está sua carteirinha digital — gerada pelo Sistema de Carteirinha de Transporte da Prefeitura Municipal de Nova Ponte.
              </p>
              <div className="digital-pdf-body">
                <div className="student-card-document">
                  <div className="student-card-doc-header">
                    <div className="student-card-doc-header-row">
                      <div />
                    </div>
                  </div>
                  <div className="student-card-doc-body">
                    {(photoDataUrl || photoUrl) ? (
                      <img
                        src={photoDataUrl || photoUrl!}
                        alt="Foto 3x4"
                        className="student-card-doc-photo"
                        crossOrigin="anonymous"
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
                          {displayName}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">CPF:</span>
                        <span className="student-card-doc-field-value">
                          {user ? formatCPF(user.cpf) : "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Curso:</span>
                        <span className="student-card-doc-field-value">
                          {studentFull?.cursos?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Período:</span>
                        <span className="student-card-doc-field-value">
                          {studentFull?.periodos?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Instituição:</span>
                        <span className="student-card-doc-field-value">
                          {studentFull?.instituicoes?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Matrícula:</span>
                        <span className="student-card-doc-field-value">
                          {student.student_id_number || "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Cidade:</span>
                        <span className="student-card-doc-field-value">
                          {studentFull?.cidades?.nome ?? "—"}
                        </span>
                      </div>
                      <div className="student-card-doc-field">
                        <span className="student-card-doc-field-label">Telefone:</span>
                        <span className="student-card-doc-field-value">
                          {user?.phone ? formatPhone(user.phone) : "—"}
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
          </div>
        </section>
      )}

      {/* Pendente */}
      {student.status === "pending" && (
        <section className="section">
          <div className="empty-state card">
            <h2 className="empty-state-title">Solicitação em andamento</h2>
            <p className="empty-state-desc">
              Sua solicitação está sendo analisada.
            </p>
            <span className={`badge ${statusBadge[student.status]}`}>
              Status: {statusLabel[student.status] ?? student.status}
            </span>
          </div>
        </section>
      )}

      {/* Histórico de Follow-ups */}
      <section className="section">
        <h2 className="section-title">Histórico de Follow-ups</h2>
        {timeline.length === 0 ? (
          <p className="empty-note">Nenhum histórico ainda.</p>
        ) : (
          <>
            <div className="timeline">
              {(timelineExpanded ? timeline : timeline.slice(0, 4)).map(
                (entry) => (
                  <div key={entry.id} className="timeline-item">
                    <div className={`timeline-dot ${entry.action}`} />
                    <div className="timeline-content">
                      <p className="timeline-action">
                        {actionLabel[entry.action] ?? entry.action}
                      </p>
                      <p className="timeline-meta">
                        {entry.users?.full_name ?? "Sistema"} —{" "}
                        {formatDateTime(entry.created_at)}
                      </p>
                      {entry.justification && (
                        <p className="timeline-justification">
                          {entry.justification}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
            {timeline.length > 4 && (
              <button
                className="btn btn-sm btn-outline timeline-toggle"
                onClick={() => setTimelineExpanded(!timelineExpanded)}
              >
                {timelineExpanded
                  ? "Ocultar histórico"
                  : `Visualizar histórico completo (${timeline.length})`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
