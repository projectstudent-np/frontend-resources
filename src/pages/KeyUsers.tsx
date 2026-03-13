import usePageTitle from "../hooks/usePageTitle"
import "./KeyUsers.css"

interface TeamMember {
  name: string
  role: string
  description: string
  image: string | null
}

const TEAM: TeamMember[] = [
  {
    name: "Andeilson Luiz da Silva",
    role: "Comunicação e Relacionamento",
    description:
      "Responsável pela comunicação com o público, organização de agenda, articulação com as equipes envolvidas e relacionamento institucional do projeto.",
    image: null,
  },
  {
    name: "Pedro Henrique Ferreira Fonseca",
    role: "Desenvolvimento de Software",
    description:
      "Responsável pelo desenvolvimento da plataforma de carteirinhas, incluindo a arquitetura do sistema, implementação das funcionalidades e manutenção técnica.",
    image: null,
  },
]

export default function KeyUsers() {
  usePageTitle("Usuários Chave")
  return (
    <div className="dashboard-page key-users-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Usuários Chave</h1>
          <p className="dashboard-sub">
            Conheça as pessoas por trás do projeto
          </p>
        </div>
      </div>

      <div className="key-users-content">
        <section className="key-users-section">
          <h2 className="key-users-section-title">Sobre o Projeto</h2>
          <p className="key-users-section-text">
            O sistema de carteirinhas é um projeto desenvolvido por estudantes
            para a gestão digital e utilização dos alunos em prol do Município
            de Nova Ponte. A plataforma moderniza o processo de solicitação,
            emissão e validação de carteirinhas estudantis para o transporte
            público escolar, conectando estudantes, motoristas, executivos e
            administradores em um fluxo digital completo — da solicitação à
            validação no ônibus.
          </p>
        </section>

        <section className="key-users-section">
          <h2 className="key-users-section-title">Equipe</h2>
          <p className="key-users-section-desc">
            O projeto é conduzido por dois usuários chave, cada um com um papel
            essencial para o funcionamento e evolução da plataforma.
          </p>

          <div className="key-users-grid">
            {TEAM.map((member) => (
              <div key={member.name} className="key-users-card card">
                <div className="key-users-card-top">
                  <div className="key-users-avatar">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="key-users-avatar-img"
                      />
                    ) : (
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 64 64"
                        fill="none"
                      >
                        <circle cx="32" cy="32" r="32" fill="#F2F4F7" />
                        <circle cx="32" cy="25" r="10" fill="#98A2B3" />
                        <path
                          d="M14 56c0-10 8-18 18-18s18 8 18 18"
                          stroke="#98A2B3"
                          strokeWidth="2.5"
                          fill="none"
                        />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    className="key-users-linkedin"
                    aria-label="LinkedIn"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                </div>
                <div className="key-users-info">
                  <h3 className="key-users-name">{member.name}</h3>
                  <span className="key-users-role">{member.role}</span>
                  <p className="key-users-desc">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
