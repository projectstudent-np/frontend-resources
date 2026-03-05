import usePageTitle from '../hooks/usePageTitle';
import './Legal.css';

export default function Cookies() {
    usePageTitle('Cookies');
    return (
        <div className="legal-page">
            <h1>Política de Cookies</h1>
            <p className="legal-updated">Última atualização: Março de 2026</p>

            <h2>O que são cookies?</h2>
            <p>
                Cookies são pequenos arquivos de texto armazenados no seu navegador quando você
                visita nosso site. Eles nos ajudam a oferecer uma experiência melhor e mais
                personalizada.
            </p>

            <h2>Cookies que utilizamos</h2>

            <p><strong>Cookies essenciais</strong></p>
            <p>
                Necessários para o funcionamento básico do sistema, como manter sua sessão
                ativa após o login. Não podem ser desativados.
            </p>
            <ul>
                <li>Sessão de autenticação (Supabase)</li>
                <li>Preferência de tema</li>
            </ul>

            <p><strong>Cookies de desempenho</strong></p>
            <p>
                Nos ajudam a entender como os visitantes interagem com o site, coletando
                informações de forma anônima.
            </p>

            <h2>Como gerenciar cookies</h2>
            <p>
                Você pode configurar seu navegador para bloquear ou alertar sobre cookies.
                No entanto, algumas funcionalidades do sistema podem não funcionar corretamente
                sem os cookies essenciais.
            </p>

            <h2>Contato</h2>
            <p>
                Dúvidas sobre nossa política de cookies podem ser enviadas para o
                e-mail <a href="mailto:projetocarteirinhaestudantilnp@gmail.com" className="legal-link">projetocarteirinhaestudantilnp@gmail.com</a>,
                representado pelos estudantes criadores do módulo apresentado para a
                Prefeitura Municipal de Nova Ponte, Minas Gerais.
            </p>
        </div>
    );
}
