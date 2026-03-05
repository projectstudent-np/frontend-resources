import usePageTitle from '../hooks/usePageTitle';
import './Legal.css';

export default function Terms() {
    usePageTitle('Termos de Uso');
    return (
        <div className="legal-page">
            <h1>Termos de Uso</h1>
            <p className="legal-updated">Última atualização: Março de 2026</p>

            <h2>1. Aceitação dos termos</h2>
            <p>
                Ao acessar e utilizar o Sistema de Carteirinha Estudantil Digital da
                Prefeitura Municipal de Nova Ponte, Minas Gerais, você concorda com estes termos
                de uso.
            </p>

            <h2>2. Descrição do serviço</h2>
            <p>
                O sistema permite o gerenciamento de carteirinhas estudantis digitais,
                incluindo solicitação, emissão e validação de carteirinhas para estudantes
                do município de Nova Ponte.
            </p>

            <h2>3. Cadastro e conta</h2>
            <p>
                Para utilizar o sistema, é necessário criar uma conta informando CPF
                e email válidos. O usuário é responsável por manter suas credenciais
                em segurança.
            </p>

            <h2>4. Responsabilidades do usuário</h2>
            <ul>
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Não compartilhar credenciais de acesso</li>
                <li>Utilizar o sistema de forma ética e legal</li>
                <li>Notificar sobre acessos não autorizados</li>
            </ul>

            <h2>5. Propriedade intelectual</h2>
            <p>
                Todo o conteúdo do sistema, incluindo interface, textos e logotipos, é
                propriedade da Prefeitura Municipal de Nova Ponte, Minas Gerais, representada
                pelos estudantes criadores do módulo, ou de seus licenciadores.
            </p>

            <h2>6. Alterações nos termos</h2>
            <p>
                A Prefeitura reserva-se o direito de alterar estes termos a qualquer
                momento. As alterações entram em vigor após publicação no sistema.
            </p>

            <h2>7. Contato</h2>
            <p>
                Para dúvidas sobre estes termos, entre em contato através do
                e-mail <a href="mailto:projetocarteirinhaestudantilnp@gmail.com" className="legal-link">projetocarteirinhaestudantilnp@gmail.com</a>,
                representado pelos estudantes criadores do módulo apresentado para a
                Prefeitura Municipal de Nova Ponte, Minas Gerais.
            </p>
        </div>
    );
}
