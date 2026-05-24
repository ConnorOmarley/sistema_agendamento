import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { controlador } from '@/lib/controlador';

export const metadata = {
  title: 'Termos de Uso · Acompanha',
};

export default function TermosDeUso() {
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
              <h1 className="text-3xl font-extrabold tracking-tight">Termos de Uso</h1>
            </div>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Última atualização: 23 de maio de 2026 · Versão 1.0
          </p>
        </header>

        {/* AVISO: Este é um esqueleto de Termos de Uso. ANTES de operar com cliente
            pagante, substitua por texto revisado por advogado ou gerado em iubenda.com */}

        <article className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed text-[var(--color-foreground)]/90">

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">1. Aceitação dos termos</h2>
            <p>
              Ao criar uma conta no <strong>Acompanha</strong> (a &ldquo;Plataforma&rdquo;), você
              concorda com estes Termos de Uso e com a nossa{' '}
              <Link href="/privacidade" className="font-bold text-[var(--color-primary)] hover:underline">
                Política de Privacidade
              </Link>. Se não concordar, não use a Plataforma.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">2. Quem pode usar</h2>
            <p>
              A Plataforma é destinada a profissionais maiores de 18 anos atuando como pedagogos,
              psicopedagogos, fonoaudiólogos ou áreas correlatas, devidamente habilitados pelo
              conselho profissional aplicável quando exigido por lei.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">3. Conta e segurança</h2>
            <p>
              Você é responsável por manter a confidencialidade da sua senha e por todas as
              atividades realizadas com a sua conta. Use senhas fortes e nos notifique
              imediatamente caso suspeite de acesso não autorizado.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">4. Dados dos alunos</h2>
            <p>
              Os dados de alunos, evoluções clínicas, agendamentos e cobranças inseridos por você
              são de sua responsabilidade enquanto <strong>controlador</strong> dos dados pessoais.
              O Acompanha atua como <strong>operador</strong>, processando esses dados em seu nome
              conforme a LGPD. Você se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Coletar consentimento dos titulares (ou responsáveis legais, no caso de menores) antes de cadastrá-los na Plataforma.</li>
              <li>Tratar os dados apenas para as finalidades legítimas relacionadas ao atendimento profissional.</li>
              <li>Cumprir o sigilo profissional aplicável à sua categoria (CFP, CRP, etc.).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">5. Planos e cobrança</h2>
            <p>
              A Plataforma oferece um período de teste gratuito de <strong>14 dias</strong>. Após
              esse período, o uso contínuo exige uma assinatura paga. Os valores e formas de
              pagamento estão disponíveis na página de assinatura. A cobrança é recorrente mensal,
              processada pelo Asaas (gateway de pagamento). Você pode cancelar a qualquer momento
              sem multas; o acesso permanece até o fim do ciclo já pago.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">6. Uso aceitável</h2>
            <p>É proibido:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Tentar burlar mecanismos de segurança ou acessar dados de outros usuários.</li>
              <li>Carregar conteúdo ilegal, ofensivo ou que viole direitos de terceiros.</li>
              <li>Usar a Plataforma para fins que descumpram a regulamentação profissional aplicável.</li>
              <li>Revender, redistribuir ou expor a Plataforma a terceiros sem autorização.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">7. Disponibilidade</h2>
            <p>
              Buscamos manter a Plataforma disponível 99% do tempo, mas não garantimos
              disponibilidade ininterrupta. Manutenções programadas serão comunicadas com
              antecedência sempre que possível.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">8. Encerramento da conta</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento pelas configurações. Reservamo-nos
              o direito de suspender contas que violem estes Termos, com aviso prévio quando
              possível. Após o encerramento, seus dados são apagados em até 30 dias, exceto quando
              a retenção for legalmente exigida.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">9. Limitação de responsabilidade</h2>
            <p>
              A Plataforma é fornecida &ldquo;como está&rdquo;. Nossa responsabilidade total fica
              limitada ao valor pago por você nos últimos 12 meses. Não nos responsabilizamos por
              danos indiretos, perda de lucros ou perda de dados causada por uso indevido da
              Plataforma.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">10. Alterações</h2>
            <p>
              Estes Termos podem ser atualizados periodicamente. Mudanças relevantes serão
              notificadas por e-mail com pelo menos 15 dias de antecedência. O uso continuado
              após a entrada em vigor implica aceite da nova versão.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">11. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito
              o foro da comarca do domicílio do usuário para dirimir eventuais controvérsias.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-extrabold">12. Contato</h2>
            <p>
              Dúvidas sobre estes Termos? Escreva para{' '}
              <strong>{controlador.email}</strong>.
            </p>
          </section>

          <p className="text-[11px] italic text-[var(--color-muted-foreground)] pt-4 border-t">
            Estes Termos estão na versão 1.0, vigente desde 23/05/2026. Recomendamos revisão
            periódica por profissional especializado em direito digital conforme o serviço
            evolui e ganha mais usuários.
          </p>
        </article>
      </div>
    </div>
  );
}
