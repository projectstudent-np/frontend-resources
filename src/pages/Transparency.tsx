import usePageTitle from '../hooks/usePageTitle';
import './Transparency.css';

export default function Transparency() {
    usePageTitle('Transparência');

    return (
        <div className="dashboard-page transparency-page">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Transparência do Projeto</h1>
                    <p className="dashboard-sub">
                        Conheça a origem e o propósito do sistema
                    </p>
                </div>
            </div>

            <div className="transparency-content">
                {/* Sobre o Projeto */}
                <section className="transparency-section">
                    <h2 className="transparency-section-title">Sobre o Projeto</h2>
                    <p className="transparency-section-text">
                        O sistema de carteirinhas estudantis é um projeto desenvolvido por estudantes
                        para a gestão digital e utilização dos alunos em prol do Município de Nova Ponte.
                        A plataforma moderniza o processo de solicitação, emissão e validação de
                        carteirinhas estudantis para o transporte público escolar, conectando estudantes,
                        motoristas, executivos e administradores em um fluxo digital completo — da
                        solicitação à validação no ônibus.
                    </p>
                    <p className="transparency-section-text">
                        O objetivo é oferecer uma solução acessível, segura e transparente que facilite
                        o acesso ao transporte escolar gratuito para todos os estudantes do município.
                    </p>
                </section>

                {/* Como foi pensado */}
                <section className="transparency-section">
                    <h2 className="transparency-section-title">Como o sistema foi pensado</h2>
                    <p className="transparency-section-text">
                        O projeto nasceu da necessidade de substituir o processo manual de emissão de
                        carteirinhas estudantis, que dependia de formulários em papel, filas presenciais
                        e validações manuais nos ônibus. A ideia central foi criar uma plataforma digital
                        que automatizasse todo o ciclo de vida da carteirinha — do cadastro do estudante
                        até a validação em tempo real pelo motorista.
                    </p>
                    <p className="transparency-section-text">
                        A arquitetura foi desenhada com foco em quatro pilares: acessibilidade, para que
                        qualquer estudante consiga se cadastrar de forma simples pelo celular ou computador;
                        segurança, com validação por QR Code único e intransferível; transparência, para
                        que gestores e a prefeitura acompanhem todo o fluxo em tempo real; e escalabilidade,
                        permitindo que o sistema cresça conforme a demanda do município.
                    </p>
                    <p className="transparency-section-text">
                        Cada perfil de usuário foi pensado para atender uma etapa do processo: o estudante
                        solicita e acompanha sua carteirinha; o gestor analisa e aprova as solicitações;
                        o motorista valida o embarque pelo QR Code; e o administrador gerencia todo o
                        sistema com visão completa dos dados e relatórios.
                    </p>
                </section>

                {/* Como usar a plataforma */}
                <section className="transparency-section">
                    <h2 className="transparency-section-title">Como usar a plataforma</h2>

                    <div className="transparency-subsection">
                        <h3 className="transparency-subsection-title">Para estudantes</h3>
                        <p className="transparency-section-text">
                            Crie sua conta informando seus dados pessoais e acadêmicos. Após o cadastro,
                            envie a solicitação da carteirinha e aguarde a aprovação de um gestor. Uma vez
                            aprovada, sua carteirinha digital estará disponível na plataforma com um QR Code
                            exclusivo. Apresente esse QR Code ao motorista no momento do embarque para
                            validar sua viagem. Você também pode acompanhar o status da sua carteirinha,
                            verificar o histórico de viagens e solicitar uma segunda via caso necessário.
                        </p>
                    </div>

                    <div className="transparency-subsection">
                        <h3 className="transparency-subsection-title">Para motoristas</h3>
                        <p className="transparency-section-text">
                            Acesse a plataforma com suas credenciais fornecidas pela administração. No
                            momento do embarque, utilize a função de leitura de QR Code para validar a
                            carteirinha do estudante. O sistema verifica instantaneamente se a carteirinha
                            é válida e exibe os dados do estudante para conferência. Todo o registro de
                            validações fica armazenado automaticamente para consulta e auditoria.
                        </p>
                    </div>

                    <div className="transparency-subsection">
                        <h3 className="transparency-subsection-title">Para gestores</h3>
                        <p className="transparency-section-text">
                            Gestores têm acesso ao painel de solicitações pendentes, onde podem analisar
                            os dados enviados pelos estudantes e aprovar ou recusar cada carteirinha. O
                            painel oferece filtros por status, instituição de ensino e período, facilitando
                            a organização do trabalho. Gestores também podem consultar relatórios de
                            emissão e acompanhar indicadores da plataforma.
                        </p>
                    </div>

                    <div className="transparency-subsection">
                        <h3 className="transparency-subsection-title">Para administradores</h3>
                        <p className="transparency-section-text">
                            Administradores possuem controle total do sistema: gerenciam usuários, rotas,
                            instituições de ensino e configurações gerais da plataforma. Através do painel
                            administrativo é possível acessar relatórios detalhados, acompanhar métricas
                            de uso, gerenciar permissões e garantir o funcionamento adequado de todos os
                            módulos do sistema.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
