import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../store/AuthContext"
import { supabase } from "../app/supabase"
import "./ProfileSlideout.css"
import "../pages/Dashboard.css"

const ROLE_LABELS: Record<string, string> = {
  student: "Estudante",
  driver: "Motorista",
  executive: "Executivo",
  admin: "Administrador",
}

const ROLE_BADGES: Record<string, string> = {
  student: "badge-info",
  driver: "badge-warning",
  executive: "badge-neutral",
  admin: "badge-success",
}

function formatCPFDisplay(cpf: string) {
  const clean = cpf.replace(/\D/g, "")
  if (clean.length !== 11) return cpf
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15)
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR")
  } catch {
    return iso
  }
}

interface ProfileSlideoutProps {
  open: boolean
  onClose: () => void
}

export default function ProfileSlideout({
  open,
  onClose,
}: ProfileSlideoutProps) {
  const { user, refreshUser } = useAuth()
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(true)
  const [fieldsLocked, setFieldsLocked] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && user) {
      setFullName(user.full_name ?? "")
      setPhone(user.phone ?? "")
      setEmail(user.email ?? "")
      setSuccess("")
      setError("")
      setConfirmOpen(false)
    }
  }, [open, user])

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setAvatarLoading(true)
    setFieldsLoading(true)

    // Defer queries until after slide animation finishes
    const timer = setTimeout(async () => {
      // Load avatar
      let path = user.avatar_path
      if (!path && user.role === "student") {
        const { data: student } = await supabase
          .from("students")
          .select("foto_3x4_path")
          .eq("user_id", user.id)
          .maybeSingle()
        if (student?.foto_3x4_path) path = student.foto_3x4_path
      }
      if (!cancelled && path) {
        const { data } = await supabase.storage
          .from("student-documents")
          .createSignedUrl(path, 600)
        if (!cancelled) setAvatarUrl(data?.signedUrl ?? null)
      } else if (!cancelled) {
        setAvatarUrl(null)
      }
      if (!cancelled) setAvatarLoading(false)

      // Check field lock
      const { data: student } = await supabase
        .from("students")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle()
      if (cancelled || !student) {
        if (!cancelled) setFieldsLoading(false)
        return
      }

      const statusLocked =
        !!student.status &&
        student.status !== "draft" &&
        student.status !== "info_requested"
      const { data: card } = await supabase
        .from("student_cards")
        .select("status, expires_at")
        .eq("student_id", student.id)
        .eq("status", "active")
        .maybeSingle()
      if (cancelled) return

      const hasActiveCard = !!card && new Date(card.expires_at) > new Date()
      setFieldsLocked(statusLocked || hasActiveCard)
      setFieldsLoading(false)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, user?.avatar_path, user?.id])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  function handleClose() {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 250)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Formato inválido. Use JPG, PNG ou WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 5MB.")
      return
    }

    setUploadingAvatar(true)
    setError("")
    try {
      const ext = file.name.split(".").pop() || "jpg"
      const path = `avatars/${user.id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const { error: updateErr } = await supabase
        .from("users")
        .update({ avatar_path: path })
        .eq("id", user.id)
      if (updateErr) throw updateErr

      const { data: signed } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(path, 600)
      if (signed?.signedUrl) setAvatarUrl(signed.signedUrl)

      await refreshUser()
      setSuccess("Foto de perfil atualizada!")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto.")
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError("O nome completo é obrigatório.")
      return
    }

    setConfirmOpen(true)
  }

  async function handleConfirmSave() {
    if (!user) return
    setConfirmOpen(false)
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim(),
          phone: phone.replace(/\D/g, ""),
          email: email.trim(),
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      await refreshUser()
      setSuccess("Perfil atualizado com sucesso!")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.")
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return
    setSendingReset(true)
    setError("")
    setSuccess("")
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        user.email,
      )
      if (resetErr) throw resetErr
      setSuccess(`Email de redefinição de senha enviado para ${user.email}`)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar email de redefinição.",
      )
    } finally {
      setSendingReset(false)
    }
  }

  if (!open && !closing) return null
  if (!user) return null

  const canEditAvatar = user.role !== "student" || !fieldsLocked
  const hasChanges =
    fullName !== (user.full_name ?? "") ||
    phone !== (user.phone ?? "") ||
    email !== (user.email ?? "")

  return createPortal(
    <div
      className={`slideout-overlay${closing ? " slideout-closing" : ""}`}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        className={`slideout-panel${closing ? " slideout-panel-closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Perfil do usuário"
      >
        {/* Close button */}
        <button
          className="slideout-close-btn"
          onClick={handleClose}
          aria-label="Fechar"
          type="button"
        >
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
            <path d="M17 7 7 17M7 7l10 10" />
          </svg>
        </button>

        {/* Header with avatar */}
        <div className="slideout-header">
          <div className="slideout-avatar-area">
            <div
              className={`slideout-avatar${canEditAvatar ? " slideout-avatar-editable" : ""}`}
              onClick={
                canEditAvatar
                  ? () => avatarInputRef.current?.click()
                  : undefined
              }
              title={canEditAvatar ? "Alterar foto de perfil" : undefined}
            >
              {avatarLoading ? (
                <div className="skeleton-block" style={{ width: 96, height: 96, borderRadius: "50%" }} />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto do perfil"
                  className="slideout-avatar-img"
                />
              ) : (
                <svg width="96" height="96" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="24" fill="#F2F4F7" />
                  <circle cx="24" cy="19" r="8" fill="#98A2B3" />
                  <path
                    d="M10 42c0-8 6-14 14-14s14 6 14 14"
                    stroke="#98A2B3"
                    strokeWidth="2.5"
                    fill="none"
                  />
                </svg>
              )}
              {canEditAvatar && (
                <div className="slideout-avatar-hover">
                  {uploadingAvatar ? (
                    <span className="slideout-avatar-spinner" />
                  ) : (
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
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="slideout-avatar-input"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="slideout-user-info">
              <div className="slideout-user-name-row">
                <span className="slideout-user-name">
                  {user.full_name || "Usuário"}
                </span>
                <span className={`badge ${ROLE_BADGES[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <span className="slideout-user-cpf">
                {formatCPFDisplay(user.cpf)}
              </span>
            </div>
          </div>

          <div className="slideout-stats">
            <div className="slideout-stat">
              <span className="slideout-stat-label">Tipo de conta</span>
              <span className="slideout-stat-value">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <div className="slideout-stat">
              <span className="slideout-stat-label">Conta criada em</span>
              <span className="slideout-stat-value">
                {formatDate(user.created_at)}
              </span>
            </div>
            <div className="slideout-stat">
              <span className="slideout-stat-label">CPF</span>
              <span className="slideout-stat-value">
                {formatCPFDisplay(user.cpf)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="slideout-body">
          {error && <p className="slideout-error">{error}</p>}
          {success && <p className="slideout-success">{success}</p>}

          <form
            id="slideout-profile-form"
            onSubmit={handleSubmit}
            className="slideout-form"
            noValidate
          >
            <div className="slideout-separator" />

            {fieldsLoading ? (
              <>
                <div className="input-group">
                  <span className="skeleton-block" style={{ width: 120, height: 12, borderRadius: 4 }} />
                  <span className="skeleton-block" style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 6 }} />
                </div>
                <div className="slideout-separator" />
                <div className="input-group">
                  <span className="skeleton-block" style={{ width: 50, height: 12, borderRadius: 4 }} />
                  <span className="skeleton-block" style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 6 }} />
                </div>
                <div className="slideout-separator" />
                <div className="input-group">
                  <span className="skeleton-block" style={{ width: 70, height: 12, borderRadius: 4 }} />
                  <span className="skeleton-block" style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 6 }} />
                </div>
                <div className="slideout-separator" />
                <span className="skeleton-block" style={{ width: '100%', height: 40, borderRadius: 8 }} />
              </>
            ) : (
              <>
                <div className="slideout-field-row">
                  <div className="input-group">
                    <label className="input-label" htmlFor="slideout-name">
                      Nome completo
                    </label>
                    <input
                      id="slideout-name"
                      type="text"
                      className={`input-field${fieldsLocked ? " input-locked" : ""}`}
                      value={fullName}
                      disabled={fieldsLocked}
                      onChange={(e) => {
                        setFullName(toTitleCase(e.target.value))
                        setSuccess("")
                      }}
                    />
                  </div>
                </div>

                <div className="slideout-separator" />

                <div className="input-group">
                  <label className="input-label" htmlFor="slideout-email">
                    Email
                  </label>
                  <input
                    id="slideout-email"
                    type="email"
                    className={`input-field${fieldsLocked ? " input-locked" : ""}`}
                    placeholder="seu@email.com"
                    value={email}
                    disabled={fieldsLocked}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setSuccess("")
                    }}
                  />
                </div>

                <div className="slideout-separator" />

                <div className="input-group">
                  <label className="input-label" htmlFor="slideout-phone">
                    Telefone
                  </label>
                  <input
                    id="slideout-phone"
                    type="text"
                    inputMode="numeric"
                    className={`input-field${fieldsLocked ? " input-locked" : ""}`}
                    placeholder="(00) 00000-0000"
                    value={formatPhone(phone)}
                    maxLength={15}
                    disabled={fieldsLocked}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""))
                      setSuccess("")
                    }}
                  />
                </div>

                <div className="slideout-separator" />

                <button
                  type="button"
                  className="slideout-reset-btn"
                  disabled={sendingReset}
                  onClick={handleResetPassword}
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {sendingReset
                    ? "Enviando..."
                    : "Enviar email de alteração de senha"}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="slideout-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="slideout-profile-form"
            className="btn btn-primary"
            disabled={saving || !hasChanges || fieldsLoading}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          className="slideout-confirm-overlay"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="profile-confirm-modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-confirm-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="profile-confirm-title">Confirmar alterações</h2>
            <p className="profile-confirm-desc">
              Você confirma que os dados digitados estão corretos? Não será
              possível alterá-los enquanto a carteirinha estiver em processo de
              análise.
            </p>
            <div className="profile-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSave}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
