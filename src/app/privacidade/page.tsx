import Link from 'next/link';
import { Sparkles, ArrowLeft, Shield } from 'lucide-react';
import { controlador } from '@/lib/controlador';

export const metadata = {
  title: 'Política de Privacidade · Acompanha',
};

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="size-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Acompanha</p>
              <h1 className="text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
            </div>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Última atualização: 23 de maio de 2026 · Versão 1.0 · Conformidade LGPD (Lei 13.709/2018)
          </p>
        </header>

        <article className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed text-[var(--color-foreground)]/90">

          <section className="rounded-2xl bg-violet-50 border border-violet-100 p-5 space-y-2">
            <div className="flex items-center gap-2 font-extrabold">
              <Shield className="size-5 text-violet-600" /> Resumo em 1 minuto
            </div>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li>Coletamos só o necessário pra você gerenciar seus alunos: nome, e-mail, telefone, dados clínicos que <em>você</em> escolhe inserir.</li>
              <li>Seus dados ficam armazenados no Brasil, na infraestrutura do Supabase (região São Paulo).</li>
              <li>Não vendemos nem compartilhamos seus dados com terceiros para marketing.</li>
              <li>Você pode pedir exclusão da conta e dos dados a qualquer momento.</li>
              <li>Usamos cookies essenciais (sessão) — não usamos cookies de rastreamento publicitário.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">1. Quem somos</h2>
            <p>
              O <strong>Acompanha</strong> é um serviço de software como serviço (SaaS) para
              profissionais de pedagogia e psicopedagogia gerenciarem agenda, alunos, evoluções
              clínicas e cobrança. Operado por {controlador.nome} ({controlador.tipoPessoa}),
              {' '}{controlador.documento}, localizado em {controlador.localizacao}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">2. Encarregado pelo Tratamento de Dados (DPO)</h2>
            <p>
              Para questões relacionadas a privacidade e LGPD, contate:<br />
              <strong>E-mail:</strong> {controlador.email}<br />
              <strong>Responsável:</strong> {controlador.nome}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">3. Quais dados coletamos</h2>

            <h3 className="font-bold mt-3">3.1. Dados do profissional (você)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo, e-mail, senha (criptografada)</li>
              <li>CPF/CNPJ, telefone, endereço de cobrança (na contratação de plano pago)</li>
              <li>Razão social, inscrição municipal, regime tributário (opcional, para emissão de recibos)</li>
              <li>Dados de pagamento são processados pelo Asaas — não armazenamos número de cartão, validade ou CCV.</li>
              <li>Logs técnicos: IP, navegador, ações realizadas na plataforma (audit log).</li>
            </ul>

            <h3 className="font-bold mt-3">3.2. Dados dos alunos (inseridos por você)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome, e-mail, telefone, indicador se o contato é responsável</li>
              <li>Agendamentos (data, horário, valor, status)</li>
              <li>Evoluções clínicas / prontuários (texto livre inserido por você)</li>
            </ul>
            <p className="text-xs italic">
              Para esses dados, <strong>você é o controlador</strong> e o Acompanha é o
              <strong> operador</strong>, nos termos da LGPD (art. 5º, V e VI).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">4. Base legal e finalidades</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Execução de contrato</strong> (Art. 7º, V): para fornecer o serviço que você contratou.</li>
              <li><strong>Consentimento</strong> (Art. 7º, I): para o cadastro inicial, marcado por você na checkbox de aceite.</li>
              <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II): retenção fiscal de comprovantes de pagamento.</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): logs de segurança e audit log.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">5. Com quem compartilhamos</h2>
            <p>Compartilhamos dados apenas com operadores essenciais para o serviço:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase</strong> (banco de dados e autenticação) — armazenamento na região São Paulo.</li>
              <li><strong>Asaas</strong> (gateway de pagamento) — apenas para cobrança recorrente.</li>
              <li><strong>Resend</strong> (envio de e-mails transacionais) — confirmação de agendamentos, recuperação de senha.</li>
              <li><strong>Vercel</strong> (hospedagem da aplicação).</li>
            </ul>
            <p>
              Cada um desses operadores tem suas próprias políticas de privacidade. Não
              compartilhamos dados com terceiros para fins publicitários ou comerciais.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">6. Seus direitos como titular</h2>
            <p>Conforme o Art. 18 da LGPD, você pode a qualquer momento solicitar:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Confirmação</strong> da existência de tratamento dos seus dados</li>
              <li><strong>Acesso</strong> aos dados que mantemos sobre você</li>
              <li><strong>Correção</strong> de dados incompletos ou desatualizados</li>
              <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários</li>
              <li><strong>Portabilidade</strong> dos dados em formato estruturado (JSON)</li>
              <li><strong>Eliminação</strong> dos dados tratados com base no seu consentimento</li>
              <li><strong>Informação</strong> sobre compartilhamento dos seus dados</li>
              <li><strong>Revogação do consentimento</strong> e exclusão da conta</li>
            </ul>
            <p>Para exercer esses direitos, escreva para <strong>{controlador.email}</strong>.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">7. Retenção</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento,
              os dados são apagados em até <strong>30 dias</strong>, exceto:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Audit logs (mantidos por 5 anos por conformidade legal)</li>
              <li>Comprovantes de pagamento (mantidos por 5 anos por exigência fiscal)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">8. Segurança</h2>
            <p>Adotamos medidas técnicas e administrativas:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Conexão HTTPS/TLS criptografada em toda a aplicação</li>
              <li>Senhas armazenadas com hash bcrypt (nunca em texto puro)</li>
              <li>Row Level Security (RLS) garantindo isolamento entre contas</li>
              <li>Rate limiting em login para prevenir ataques de força bruta</li>
              <li>Audit log de operações sensíveis para rastreabilidade</li>
              <li>Soft delete em dados clínicos — recuperação por 30 dias antes de eliminação definitiva</li>
              <li>Backups diários (em planos pagos do Supabase)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">9. Cookies</h2>
            <p>
              Usamos apenas cookies essenciais para manter sua sessão logada. Não usamos
              cookies de rastreamento publicitário, analytics de terceiros (Google Analytics,
              Facebook Pixel) ou similares.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">10. Crianças e adolescentes</h2>
            <p>
              A plataforma é destinada a profissionais maiores de 18 anos. Reconhecemos que
              os dados dos <strong>alunos</strong> registrados pelos profissionais podem incluir
              menores de idade. Cabe ao profissional, como controlador, obter consentimento
              dos pais ou responsáveis legais antes de inserir esses dados na plataforma (Art. 14
              da LGPD).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">11. Incidentes de segurança</h2>
            <p>
              Em caso de incidente que possa acarretar risco aos titulares, notificaremos a
              Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados em prazo
              razoável, conforme exigido pelo Art. 48 da LGPD.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">12. Alterações</h2>
            <p>
              Esta Política pode ser atualizada. Alterações materiais serão comunicadas por
              e-mail com pelo menos 15 dias de antecedência.
            </p>
          </section>

          <p className="text-[11px] italic text-[var(--color-muted-foreground)] pt-4 border-t">
            Esta política é a versão 1.0, vigente desde 23/05/2026. Recomendamos revisão
            periódica por profissional especializado em direito digital conforme o serviço
            evolui.
          </p>
        </article>
      </div>
    </div>
  );
}
