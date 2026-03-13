# Frontend Resources — Manual Técnico

> Interface web do sistema NPMG. React 19 + TypeScript + Vite + Supabase.

---

## Arquitetura

```
src/
├── main.tsx                    # Entry point (React DOM + providers)
├── App.tsx                     # Root component
├── app/
│   ├── router.tsx              # React Router — todas as rotas
│   └── supabase.ts             # Supabase client (anon key)
├── store/
│   └── AuthContext.tsx          # Provider global de autenticação
├── components/
│   ├── Navbar.tsx               # Navegação principal (multi-nível)
│   ├── Footer.tsx               # Rodapé
│   ├── PrivateRoute.tsx         # Guard: exige auth + role
│   ├── PublicOnlyRoute.tsx      # Guard: redireciona se logado
│   ├── AdminOverview.tsx        # Card de estatísticas admin
│   ├── CommandPalette.tsx       # Paleta de comandos (Ctrl+K)
│   ├── CookieConsent.tsx        # Banner de cookies
│   └── ProfileSlideout.tsx      # Sidebar de perfil do usuário
├── pages/
│   ├── Home.tsx                 # Landing page
│   ├── Access.tsx               # Login + Registro (tabs)
│   ├── StudentDashboard.tsx     # Painel do aluno
│   ├── DriverDashboard.tsx      # Painel do motorista
│   ├── ExecutiveDashboard.tsx   # Painel do executivo
│   ├── AdminDashboard.tsx       # Painel do administrador
│   ├── RequestCard.tsx          # Solicitação de carteirinha
│   ├── ValidateCard.tsx         # Validação pública de carteirinha
│   ├── Tickets.tsx              # Sistema de chamados
│   ├── Help.tsx                 # Página de ajuda
│   ├── Privacy.tsx              # Política de privacidade
│   ├── Terms.tsx                # Termos de uso
│   ├── Cookies.tsx              # Política de cookies
│   ├── Transparency.tsx         # Transparência do projeto
│   ├── KeyUsers.tsx             # Contatos chave
│   └── Unauthorized.tsx         # Página 403
├── layouts/
│   └── MainLayout.tsx           # Layout com Navbar + Footer
├── services/
│   └── authService.ts           # Chamadas de autenticação
├── hooks/
│   └── usePageTitle.ts          # Hook para título da página
├── types/
│   └── index.ts                 # Todas as interfaces TypeScript
├── utils/
│   └── generateCardPdf.ts       # Geração de PDF da carteirinha
├── styles/
│   └── design-system.css        # Design tokens (cores, tipografia, espaçamento)
└── assets/                      # Imagens e ícones
```

## Rotas

### Públicas (sem autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` ou `/home` | Home | Landing page com CTA |
| `/access` | Access | Login e registro |
| `/access?tab=register` | Access | Aba de registro |
| `/help` | Help | Ajuda e suporte |
| `/privacy` | Privacy | Política de privacidade |
| `/terms` | Terms | Termos de uso |
| `/cookies` | Cookies | Política de cookies |
| `/transparency` | Transparency | Transparência |
| `/key-users` | KeyUsers | Contatos |
| `/validate/:studentId` | ValidateCard | Validação pública de carteirinha |

### Protegidas (requer autenticação + role)

| Rota | Página | Roles Permitidos |
|------|--------|-----------------|
| `/student` | StudentDashboard | student |
| `/student/request` | RequestCard | student |
| `/driver` | DriverDashboard | driver |
| `/executive` | ExecutiveDashboard | executive |
| `/admin` | AdminDashboard | admin |
| `/tickets` | Tickets | student, executive, admin |

### Guards de Rota

```tsx
// Rota protegida — redireciona para /access se não autenticado
<PrivateRoute allowedRoles={['student', 'executive', 'admin']}>
  <Tickets />
</PrivateRoute>

// Rota pública — redireciona para dashboard se autenticado
<PublicOnlyRoute>
  <Access />
</PublicOnlyRoute>
```

**O PrivateRoute** verifica:
1. `loading` → mostra skeleton
2. `!user` → redireciona para `/access`
3. `user.role not in allowedRoles` → redireciona para `/unauthorized`

## Estado Global — AuthContext

```typescript
// Provido pelo <AuthProvider> em main.tsx
const { session, user, loading, signOut, refreshUser } = useAuth();

// session: Session | null — sessão Supabase
// user: User | null — perfil do usuário (tabela users)
// loading: boolean — carregando auth
// signOut(): Promise<void> — logout + limpa storage
// refreshUser(): Promise<void> — recarrega perfil
```

**Funcionalidades implementadas:**
- Sessão persistida via localStorage
- Auto-refresh de tokens
- Detecção de tab oculta >10s → recarrega
- Safety timeout de 5s (força `loading=false`)
- Logout limpa todo storage do Supabase

## Padrão de Página

Cada página segue esta estrutura:

```
pages/
  ├── NomePagina.tsx     # Componente React
  └── NomePagina.css     # Estilos específicos
```

**Dentro do componente:**

```tsx
import { useAuth } from '../store/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import './NomePagina.css';

export default function NomePagina() {
  usePageTitle('Título da Página');
  const { user } = useAuth();

  // Estado local, fetches, handlers...

  return (
    <div className="nome-pagina">
      {/* conteúdo */}
    </div>
  );
}
```

## Chamadas à API

### Via Supabase Client (direto)

```typescript
import { supabase } from '../app/supabase';

// Buscar dados
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('user_id', user.id);

// Auth
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
```

### Via API Backend

```typescript
const token = session?.access_token;
const res = await fetch(`${import.meta.env.VITE_API_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  method: 'POST',
  body: JSON.stringify(data),
});
const json = await res.json();
// json = { success: boolean, data?: any, message?: string }
```

## Tipos TypeScript

Todos os tipos estão em `src/types/index.ts`:

```typescript
type UserRole = 'student' | 'driver' | 'executive' | 'admin';

interface User {
  id: string; full_name: string; cpf: string;
  email: string; phone: string; role: UserRole;
  avatar_path?: string; created_at: string;
}

type StudentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'info_requested';

interface Student {
  id: string; user_id: string; course: string;
  period: string; student_id_number: string;
  institution: string; city: string; status: StudentStatus;
  // FKs de lookup: curso_id, periodo_id, instituicao_id, cidade_id
  // Documentos: foto_3x4_path, comprovante_matricula_path, documento_identidade_path
}

type CardStatus = 'pending' | 'active' | 'cancelled';

interface StudentCard {
  id: string; student_id: string; issue_number: string;
  status: CardStatus; issued_at: string; expires_at: string;
  qr_code: string;
}

type TicketType = 'card_creation' | 'question';
type TicketStatus = 'open' | 'in_review' | 'info_requested' | 'approved' | 'rejected';

interface Ticket { /* id, user_id, type, status, ticket_number, ... */ }
interface Message { /* id, ticket_id, user_id, content, created_at */ }
interface TicketHistory { /* id, ticket_id, action, performed_by, justification, created_at */ }
```

**Regra:** Ao adicionar campos no banco, SEMPRE atualizar `types/index.ts` também.

---

## Design System Completo

### Fonte

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif
/* Google Fonts — pesos utilizados: 300, 400, 500, 600, 700, 800 */
```

### Escala Tipográfica

| Token | Tamanho | Uso |
|-------|---------|-----|
| `--text-xs` | 12px | Badges, labels auxiliares, tabela header |
| `--text-sm` | 14px | Botões, inputs label, body secundário, hints |
| `--text-md` | 16px | Body padrão, inputs |
| `--text-lg` | 18px | Subtítulos |
| `--text-xl` | 20px | Títulos médios |
| `--display-xs` | 24px | Títulos de seção |
| `--display-sm` | 30px | Títulos de página |
| `--display-md` | 36px | Título principal |
| `--display-lg` | 48px | Hero heading |
| `--display-xl` | 60px | Hero display |

**Pesos:** 300 light, 400 normal, 500 medium, 600 semibold, 700 bold, 800 extra bold

### Paleta de Cores

#### Gray Scale (Untitled UI)
| Token | Hex | Uso |
|-------|-----|-----|
| `--gray-25` | #FCFCFD | Hover de tabela, card footer |
| `--gray-50` | #F9FAFB | Background da página, hover de botão secondary |
| `--gray-100` | #F2F4F7 | Background de avatar, input disabled |
| `--gray-200` | #EAECF0 | Bordas padrão, separadores |
| `--gray-300` | #D0D5DD | Borda de input, borda de botão secondary |
| `--gray-400` | #98A2B3 | Placeholder, texto terciário |
| `--gray-500` | #667085 | Texto secundário, hints |
| `--gray-600` | #475467 | Texto de tabela, botão tertiary |
| `--gray-700` | #344054 | Labels, dropdown items, botão secondary text |
| `--gray-800` | #182230 | Texto enfatizado |
| `--gray-900` | #101828 | Texto principal, títulos |
| `--gray-950` | #0C111D | Texto mais escuro |

#### Brand (Vermelho — cor principal do sistema)
| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-25` | #FFF5F5 | Alert info background |
| `--brand-50` | #FEF2F2 | Badge info bg, botão secondary-color bg |
| `--brand-100` | #FEE2E2 | Focus ring, badge info border |
| `--brand-200` | #FECACA | Botão secondary-color border |
| `--brand-300` | #FCA5A5 | Input focus border |
| `--brand-400` | #F87171 | — |
| `--brand-500` | #EF4444 | — |
| `--brand-600` | #DC2626 | **Cor PRIMARY**, botões primary, tabs ativas, links |
| `--brand-700` | #B91C1C | **Primary hover**, badge info text |
| `--brand-800` | #991B1B | Secondary-color hover text |
| `--brand-900` | #7F1D1D | — |
| `--brand-950` | #450A0A | — |

#### Accent (Azul — cor secundária do sistema)
| Token | Hex | Uso |
|-------|-----|-----|
| `--accent-25` | #F0F6FF | — |
| `--accent-50` | #E0EDFF | — |
| `--accent-100` | #C2DBFF | — |
| `--accent-200` | #94BFFF | — |
| `--accent-300` | #5C9BFF | — |
| `--accent-400` | #3B82F6 | **Accent**, botão accent |
| `--accent-500` | #1E6BD6 | — |
| `--accent-600` | #0F4C81 | **Secondary** |
| `--accent-700` | #0C3A63 | — |
| `--accent-800` | #092D4D | — |
| `--accent-900` | #061D33 | — |

#### Cores Semânticas
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-success-500` | #12B76A | Sucesso |
| `--color-success-700` | #027A48 | Texto sucesso |
| `--color-error-500` | #F04438 | Erro |
| `--color-error-700` | #B42318 | Texto erro |
| `--color-warning-500` | #F79009 | Aviso |
| `--color-warning-700` | #B54708 | Texto aviso |

#### Cores de Superfície
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg` | #F9FAFB | Background geral da página |
| `--color-surface` | #FFFFFF | Cards, modais, inputs |
| `--color-text` | #101828 | Texto principal |
| `--color-text-secondary` | #667085 | Texto secundário |
| `--color-text-tertiary` | #98A2B3 | Texto terciário, placeholders |
| `--color-border` | #EAECF0 | Bordas padrão |
| `--color-border-secondary` | #D0D5DD | Bordas de input |

### Espaçamento (base 4px)

| Token | Valor | Uso comum |
|-------|-------|-----------|
| `--space-1` | 4px | Gap mínimo, padding de tabs |
| `--space-2` | 8px | Gap de botão, gap de items |
| `--space-3` | 12px | Gap de alert, padding de tabs |
| `--space-4` | 16px | Padding de modal mobile, card footer padding |
| `--space-5` | 20px | Card header padding |
| `--space-6` | 24px | Card content padding, modal padding |
| `--space-8` | 32px | Container padding, dashboard padding |
| `--space-10` | 40px | — |
| `--space-12` | 48px | Empty state padding, page-top-spacing |
| `--space-16` | 64px | — |
| `--space-20` | 80px | — |
| `--space-24` | 96px | Footer padding |

### Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-xs` | 4px | Elementos pequenos |
| `--radius-sm` | 6px | — |
| `--radius-md` | 8px | **Botões, inputs** (padrão do sistema) |
| `--radius-lg` | 12px | **Cards, modais, tabelas, dropdowns** |
| `--radius-xl` | 16px | Modais grandes |
| `--radius-2xl` | 20px | Footer background |
| `--radius-full` | 9999px | **Badges, avatars** (pill) |

### Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-xs` | `0px 1px 2px rgba(16,24,40,0.05)` | Inputs, botões |
| `--shadow-sm` | `0px 1px 3px rgba(16,24,40,0.10), ...` | Cards |
| `--shadow-md` | `0px 4px 8px -2px rgba(16,24,40,0.10), ...` | — |
| `--shadow-lg` | `0px 12px 16px -4px rgba(16,24,40,0.08), ...` | Dropdowns |
| `--shadow-xl` | `0px 20px 24px -4px rgba(16,24,40,0.08), ...` | Modais |
| `--shadow-2xl` | `0px 24px 48px -12px rgba(16,24,40,0.18)` | — |

### Focus Ring

```css
--focus-ring: 0 0 0 4px var(--brand-100);            /* Foco normal — anel vermelho claro */
--focus-ring-error: 0 0 0 4px var(--color-error-100); /* Foco em campo com erro */
```

### Layout

| Token | Valor | Descrição |
|-------|-------|-----------|
| `--topbar-height` | 42px | Barra superior |
| `--navbar-height` | 80px (60px mobile) | Navbar principal |
| `--subnav-height` | 52px | Sub-navegação |
| `--max-width` | 1440px | Largura máxima do conteúdo |
| `--page-top-spacing` | 48px (24px mobile) | Espaço após navbar |

---

## Componentes UI — Referência de Classes

### Botões

**Base:** `.btn` — `inline-flex`, padding `10px 18px`, radius `8px`, font `14px/600`, transition `0.15s`

| Classe | Background | Cor | Borda | Hover |
|--------|-----------|-----|-------|-------|
| `.btn-primary` | #DC2626 | #fff | #DC2626 | bg #B91C1C |
| `.btn-secondary` | #fff | #344054 | #D0D5DD | bg #F9FAFB |
| `.btn-secondary-color` | #FEF2F2 | #B91C1C | #FECACA | bg #FEE2E2 |
| `.btn-tertiary` | transparent | #475467 | transparent | bg #F9FAFB |
| `.btn-link` | transparent | #DC2626 | transparent | color #B91C1C |
| `.btn-accent` | #3B82F6 | #fff | #3B82F6 | bg #D97706 |
| `.btn-danger` | #D92D20 | #fff | #D92D20 | bg #B42318 |
| `.btn-danger-outline` | #fff | #B42318 | #FDA29B | bg #FEF3F2 |

**Tamanhos:**

| Classe | Padding | Font |
|--------|---------|------|
| `.btn-sm` | 8px 14px | 14px |
| `.btn-md` | 10px 16px | 14px |
| `.btn-lg` | 10px 18px | 16px |
| `.btn-xl` | 12px 20px | 16px |
| `.btn-2xl` | 16px 28px | 18px |
| `.btn-icon` | 10px | — |

**Disabled:** `opacity: 0.5; cursor: not-allowed;`

### Inputs

**Campo:** `.input-field` — padding `10px 14px`, border `1px solid #D0D5DD`, radius `8px`, font `16px`

| Estado | Estilo |
|--------|--------|
| Normal | border #D0D5DD, shadow-xs |
| Focus | border #FCA5A5, sem shadow |
| Erro | border #FDA29B |
| Disabled | bg #F2F4F7, color #98A2B3 |

**Label:** `.input-label` — font `14px/500`, color `#344054`
**Hint:** `.input-hint` — font `14px`, color `#667085`
**Erro:** `.input-error` — font `14px`, color `#F04438`
**Grupo:** `.input-group` — flex column, gap `6px`
**Select:** Mesmo estilo + seta SVG custom à direita

### Cards

**Base:** `.card` — bg `#fff`, radius `12px`, border `1px solid #EAECF0`, shadow-sm

| Parte | Padding | Extra |
|-------|---------|-------|
| `.card-header` | 20px 24px | border-bottom |
| `.card-content` | 24px | — |
| `.card-footer` | 16px 24px | border-top, bg #FCFCFD |

### Badges

**Base:** `.badge` — pill (`9999px`), padding `2px 10px`, font `12px/500`

| Classe | Background | Cor | Borda |
|--------|-----------|-----|-------|
| `.badge-success` | #ECFDF3 | #027A48 | #D1FADF |
| `.badge-error` | #FEF3F2 | #B42318 | #FEE4E2 |
| `.badge-warning` | #FFFAEB | #B54708 | #FEF0C7 |
| `.badge-info` | #FEF2F2 | #B91C1C | #FEE2E2 |
| `.badge-neutral` | #F9FAFB | #344054 | #EAECF0 |

**Tamanhos:** `.badge-sm` (2px 8px), `.badge-lg` (4px 12px, font 14px)
**Com dot:** `.badge-dot` — bolinha 6px de currentColor antes do texto

### Alerts

**Base:** `.alert` — flex, gap `12px`, padding `16px`, radius `12px`, font `14px`

| Classe | Background | Cor | Borda |
|--------|-----------|-----|-------|
| `.alert-success` | #ECFDF3 | #027A48 | #D1FADF |
| `.alert-error` | #FEF3F2 | #B42318 | #FEE4E2 |
| `.alert-warning` | #FFFAEB | #B54708 | #FEF0C7 |
| `.alert-info` | #FFF5F5 | #B91C1C | #FEE2E2 |

### Avatars

**Base:** `.avatar` — circle (`9999px`), bg `#F2F4F7`, color `#475467`, font `600`

| Classe | Tamanho | Font |
|--------|---------|------|
| `.avatar-xs` | 24px | 10px |
| `.avatar-sm` | 32px | 12px |
| `.avatar-md` | 40px | 14px |
| `.avatar-lg` | 48px | 16px |
| `.avatar-xl` | 56px | 18px |

### Tabelas

**Wrapper:** `.table-wrap` — border `1px solid #EAECF0`, radius `12px`, shadow-sm, overflow-x auto
**Table:** `.table` — width 100%, font `14px`, bg `#fff`
**Header:** bg `#F9FAFB`, font `12px/500`, color `#475467`, padding `12px 24px`
**Cell:** color `#475467`, padding `16px 24px`
**Row hover:** bg `#FCFCFD`

### Tabs

**Lista:** `.tabs-list` — flex, gap `4px`, border-bottom `1px solid #EAECF0`
**Item:** `.tab-item` — font `14px/600`, color `#667085`, border-bottom `2px transparent`
**Ativo:** `.tab-item.active` — color `#DC2626`, border-bottom `#DC2626`

### Modal

**Overlay:** `.modal-overlay` — fixed, bg `rgba(16,24,40,0.70)`, blur `4px`, z-index `1000`
**Box:** `.modal-box` — bg `#fff`, radius `12px`, shadow-xl, padding `24px`, max-width `480px`

### Dropdown

**Menu:** `.dropdown-menu` — absolute, bg `#fff`, border `#EAECF0`, radius `12px`, shadow-lg, min-width `200px`
**Item:** `.dropdown-item` — font `14px`, color `#344054`, padding `10px 16px`, hover bg `#F9FAFB`
**Separador:** `.dropdown-separator` — 1px `#EAECF0`
**Animação:** slide de cima 0.15s ease

### Empty State

```css
.empty-state — flex column, center, padding 48px 24px, gap 16px
.empty-state-icon — 48px circle, bg #F2F4F7, border 6px #F9FAFB
.empty-state-title — 16px/600, color #101828
.empty-state-desc — 14px, color #667085, max-width 352px
```

---

## Gradientes

### Hero Title Accent
```css
background: linear-gradient(135deg, #93b5ff, #5b8def);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### Hero Background
```css
background: linear-gradient(145deg, var(--gray-900) 0%, #0a1a5e 40%, #0216a0 70%, #1a3ab5 100%);
```

### Hero Grid Pattern
```css
background-image:
  linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
background-size: 40px 40px;
```

---

## Animações

| Nome | Duração | Easing | Uso |
|------|---------|--------|-----|
| `dropdownSlide` | 0.15s | ease | Dropdown menu |
| `mobileMenuSlide` | 0.15s | ease | Menu mobile |
| `marquee-scroll` | 30s | linear infinite | Banner marquee (Home) |
| `auth-spin` | 1s | linear infinite | Spinner de auth |
| `slideout-panel-in` | 0.25s | cubic-bezier(0.16,1,0.3,1) | ProfileSlideout abrir |
| `slideout-panel-out` | 0.25s | ease | ProfileSlideout fechar |
| `overview-pulse` | 1.5s | ease-in-out infinite | Skeleton loading admin |
| `loading-spin` | 0.7s | linear infinite | Spinners gerais |
| `cmd-fade-in` | 0.12s | ease | Command palette overlay |
| `cmd-slide-in` | 0.15s | ease | Command palette box |
| `cookie-slide-up` | 0.35s | ease-out | Cookie banner |

**Transição padrão do sistema:** `all 0.15s ease` para micro-interações

---

## Breakpoints Responsivos

| Breakpoint | Comportamento |
|------------|---------------|
| `≤ 640px` | Container padding 16px, modal padding 20px, navbar 60px, page-top 24px |
| `≤ 768px` | Navbar 60px, subnav escondida, hamburger visível, grids 1-2 colunas |
| `≤ 1024px` | Hero visual escondido, grids adaptados |
| `≥ 1280px` | Layout completo, max-width 1440px |

**Abordagem:** Mobile-first — a base é estilizada para mobile, expandida com `@media (min-width: ...)`

---

## Convenção CSS

- Cada page/component tem seu próprio `.css`
- Classes nomeadas com kebab-case: `.student-dashboard`, `.card-item`
- Prefixo do componente como namespace: `.navbar-*`, `.footer-*`
- Responsividade com `@media` queries dentro do próprio CSS
- **Não usar** Tailwind inline — CSS separado
- **SEMPRE** usar tokens do design-system.css (nunca cores/tamanhos hardcoded)

---

## Agents / Skills

### frontend-developer

```
Trigger: Quando for necessário criar novos componentes, páginas, hooks, ou alterar funcionalidades do React.

Você é um desenvolvedor frontend sênior especializado em React 19 + TypeScript + Vite. Seu foco é manter os componentes do projeto limpos, tipados e performáticos.

ANTES de qualquer alteração:
1. Leia o componente/página que será alterado
2. Leia types/index.ts para entender os tipos disponíveis
3. Leia router.tsx para entender a estrutura de rotas
4. Verifique se já existe componente reutilizável antes de criar novo

Regras do projeto:
- Componentes funcionais com hooks (sem classes)
- TypeScript strict — tipar props, estados, e retornos de API
- Usar useAuth() para acessar estado de autenticação
- Usar usePageTitle() em toda nova página
- CSS em arquivo separado (NomePagina.css)
- Imports relativos (../) — não há imports absolutos configurados
- Nunca acessar import.meta.env sem prefixo VITE_

Padrão de nova página:
1. Criar NovaPagina.tsx + NovaPagina.css em src/pages/
2. Importar usePageTitle e useAuth
3. Adicionar rota em router.tsx com PrivateRoute se necessário
4. Atualizar tipos em types/index.ts se necessário

Padrão de novo componente:
1. Criar Componente.tsx em src/components/
2. CSS no mesmo diretório se necessário
3. Exportar como default
4. Props tipadas com interface

Performance:
- Usar React.memo() apenas se componente re-renderiza desnecessariamente
- Usar useMemo/useCallback apenas quando necessário de verdade
- Evitar fetches no render — usar useEffect
- Limpar listeners/intervals no return do useEffect
```

### ui-ux-designer

```
Trigger: Quando for necessário melhorar visual, responsividade, acessibilidade, ou o design system.

Você é um designer UI/UX sênior com expertise em design systems, responsividade mobile-first, e acessibilidade WCAG 2.1. Seu foco é criar interfaces bonitas, consistentes e acessíveis neste projeto.

ANTES de qualquer alteração:
1. Leia styles/design-system.css para conhecer TODOS os tokens
2. Leia o CSS do componente/página que será alterado
3. Verifique o estado atual no desktop E mobile

Design System — Regras obrigatórias:
- Usar SEMPRE os tokens CSS do design-system.css
- Nunca usar cores hardcoded — usar var(--color-*) ou var(--brand-*) ou var(--gray-*)
- Nunca usar font-size hardcoded — usar var(--text-*) ou var(--display-*)
- Nunca usar radius hardcoded — usar var(--radius-*)
- Nunca usar shadow hardcoded — usar var(--shadow-*)
- Nunca usar spacing hardcoded — usar var(--space-*)
- Espaçamento consistente com os tokens

Identidade visual do sistema:
- Cor primária: vermelho #DC2626 (--brand-600)
- Cor secundária: azul #0F4C81 (--accent-600)
- Accent: azul #3B82F6 (--accent-400)
- Fonte: Inter (Google Fonts)
- Estilo: Untitled UI (clean, professional, minimal)

Componentes reutilizáveis já prontos:
- Botões: .btn + variantes (primary, secondary, tertiary, accent, danger, link)
- Inputs: .input-field + .input-group + .input-label + .input-error
- Cards: .card + .card-header + .card-content + .card-footer
- Badges: .badge + variantes (success, error, warning, info, neutral)
- Alerts: .alert + variantes
- Avatars: .avatar + tamanhos (xs, sm, md, lg, xl)
- Tabelas: .table-wrap + .table
- Tabs: .tabs-list + .tab-item
- Modal: .modal-overlay + .modal-box
- Dropdown: .dropdown-menu + .dropdown-item
- Empty state: .empty-state + .empty-state-icon + .empty-state-title

Responsividade:
- Mobile-first: estilizar base para mobile, expandir com @media
- Testar em 320px, 375px, 768px, 1024px, 1280px
- Navbar tem hamburger menu no mobile
- Tabelas responsivas (scroll horizontal ou cards no mobile)
- Touch targets mínimo 44x44px no mobile

Acessibilidade:
- Contraste mínimo 4.5:1 (AA) para texto
- Labels em todos os inputs
- aria-label em botões com apenas ícone
- Focus visible em elementos interativos (focus-ring do sistema)
- Ordem de tab lógica
- Alt text em imagens

Animações:
- Preferir transitions CSS a animations JS
- Respeitar prefers-reduced-motion
- Duração entre 150ms-300ms para micro-interações
- Easing: ease-out para entradas, ease-in para saídas
- Padrão do sistema: transition all 0.15s ease
```

### fullstack-integrator

```
Trigger: Quando for necessário integrar frontend com backend, ajustar chamadas de API, ou sincronizar tipos entre front e back.

Você é um desenvolvedor fullstack sênior especializado em integração React ↔ Express.js + Supabase. Seu foco é garantir que o frontend e o backend se comunicam corretamente.

ANTES de qualquer alteração:
1. Leia o endpoint no backend (routes + controller)
2. Leia o componente/service no frontend que consome o endpoint
3. Verifique os tipos em types/index.ts
4. Confirme que o formato de response é { success, data/message }

Checklist de integração:
- [ ] Tipo do body (POST/PATCH) corresponde ao Zod schema do backend?
- [ ] Token enviado no header Authorization?
- [ ] Response tratada corretamente (success true/false)?
- [ ] Erros exibidos ao usuário com mensagem amigável?
- [ ] Loading state durante a requisição?
- [ ] Tipo TypeScript atualizado se schema mudou?

Fluxo de nova integração:
1. Backend: criar/alterar endpoint (ver backend-architect)
2. Frontend: atualizar types/index.ts com novos campos
3. Frontend: criar/alterar chamada no service ou componente
4. Frontend: tratar response (success → atualizar UI, error → exibir mensagem)
5. Testar fluxo completo (registro → login → ação → verificar)

Padrão de fetch:
```typescript
const response = await fetch(`${import.meta.env.VITE_API_URL}/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
const result = await response.json();
if (!result.success) {
  // Exibir result.message ao usuário
  return;
}
// Usar result.data
```

Supabase direto vs API backend:
- Usar Supabase direto: auth (login/register/logout), storage uploads
- Usar API backend: tudo que precisa de lógica de negócio, validação, ou acesso admin
```

---

## Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| react | 19.x | Framework UI |
| react-dom | 19.x | Renderização DOM |
| react-router-dom | 7.x | Roteamento |
| @supabase/supabase-js | 2.x | Cliente Supabase |
| vite | 6.x | Build tool + dev server |
| typescript | 5.x | Tipagem estática |

## Scripts

```bash
npm run dev      # Vite dev server com HMR (porta 5173)
npm run build    # tsc + vite build
npm run lint     # ESLint
npm run preview  # Preview do build de produção
```

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3000/api
```

**Regra:** Variáveis frontend DEVEM ter prefixo `VITE_`. Sem prefixo = não acessível no browser.
