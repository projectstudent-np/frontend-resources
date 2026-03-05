import usePageTitle from '../hooks/usePageTitle';
import './Legal.css';

export default function Privacy() {
    usePageTitle('Privacidade');
    return (
        <div className="legal-page">
            <h1>Aviso de Privacidade</h1>
            <p className="legal-updated">Última atualização: Março de 2026</p>

            <h2>1. Dados que coletamos</h2>
            <p>
                Para o funcionamento do sistema, coletamos os seguintes dados pessoais:
            </p>
            <ul>
                <li>CPF (para identificação única)</li>
                <li>Email (para comunicação e recuperação de conta)</li>
                <li>Nome completo (para exibição na carteirinha)</li>
                <li>Dados acadêmicos (instituição e curso)</li>
            </ul>

            <h2>2. Finalidade do tratamento</h2>
            <p>
                Os dados são utilizados exclusivamente para emissão, gerenciamento e
                validação de carteirinhas estudantis digitais no município de Nova Ponte, Minas Gerais.
            </p>

            <h2>3. Base legal</h2>
            <p>
                O tratamento de dados é realizado com base no cumprimento de obrigação
                legal e na execução de políticas públicas, conforme previsto na Lei Geral
                de Proteção de Dados (LGPD - Lei 13.709/2018).
            </p>

            <h2>4. Compartilhamento de dados</h2>
            <p>
                Seus dados não são compartilhados com terceiros, exceto quando necessário
                para o cumprimento de obrigações legais ou por determinação judicial.
            </p>

            <h2>5. Armazenamento e segurança</h2>
            <p>
                Os dados são armazenados em servidores seguros com criptografia e
                acesso restrito. Adotamos medidas técnicas e organizacionais para
                proteger suas informações.
            </p>

            <h2>6. Seus direitos</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul>
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a eliminação de dados desnecessários</li>
                <li>Revogar o consentimento</li>
            </ul>

            <h2>7. Contato do encarregado</h2>
            <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento
                de dados, entre em contato através do
                e-mail <a href="mailto:projetocarteirinhaestudantilnp@gmail.com" className="legal-link">projetocarteirinhaestudantilnp@gmail.com</a>,
                representado pelos estudantes criadores do módulo apresentado para a
                Prefeitura Municipal de Nova Ponte, Minas Gerais.
            </p>
        </div>
    );
}
