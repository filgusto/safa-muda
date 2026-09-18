import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de e-mail por SMTP.
 *
 * Configuração por ambiente:
 *   SMTP_HOST, SMTP_PORT   — servidor (em dev, o Mailpit do docker-compose)
 *   SMTP_USER, SMTP_PASS   — opcionais; sem eles, conecta sem autenticação
 *   SMTP_FROM              — remetente, ex.: "Safa Muda <nao-responda@x.org>"
 *
 * Transporte criado sob demanda, pelo mesmo motivo de db/index.ts: nada de
 * ler segredo em tempo de importação, porque `next build` roda antes deles
 * existirem.
 */

export interface Email {
  para: string;
  assunto: string;
  texto: string;
  html?: string;
}

let transporte: Transporter | undefined;

function obterTransporte(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  if (!transporte) {
    const porta = Number(process.env.SMTP_PORT ?? 587);
    const usuario = process.env.SMTP_USER;
    transporte = nodemailer.createTransport({
      host,
      port: porta,
      // 465 é TLS implícito; nas demais portas o nodemailer negocia STARTTLS
      // quando o servidor oferece.
      secure: porta === 465,
      auth: usuario
        ? { user: usuario, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return transporte;
}

export async function enviarEmail({
  para,
  assunto,
  texto,
  html,
}: Email): Promise<void> {
  const smtp = obterTransporte();

  if (!smtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST não configurado: e-mail não enviado.");
    }
    // Sem SMTP em dev (rodando fora do compose, por exemplo), o conteúdo vai
    // para o log para o fluxo continuar testável.
    console.info(`[dev] E-mail para ${para} — ${assunto}\n${texto}`);
    return;
  }

  await smtp.sendMail({
    from: process.env.SMTP_FROM ?? "Safa Muda <nao-responda@safamuda.local>",
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Casca visual dos e-mails transacionais (recuperação de senha, código de
 * confirmação): cabeçalho com o nome do produto e um cartão branco
 * centralizado, nas cores do app (ver --primary em globals.css).
 *
 * Layout em `<table>`, e cor só inline — é o que os clientes de e-mail mais
 * restritos entendem de forma previsível (o Outlook desktop renderiza com o
 * motor do Word, sem suporte a flexbox/grid nem `<style>` externo). Fontes
 * são pilhas seguras de sistema: a fonte do app (Fraunces) não teria como
 * carregar na maioria dos clientes.
 */
export function moldeDeEmail(corpoHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f1ea;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e2e0d4;border-radius:12px;">
        <tr>
          <td style="padding:32px 40px 0 40px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#1f3d2b;">
            🌱 Safa Muda
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px 40px;font-family:Arial,Helvetica,sans-serif;color:#2b2b26;">
            ${corpoHtml}
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr>
          <td style="padding-top:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9a988a;">
            Safa Muda — planejamento e gestão agroflorestal
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Um parágrafo do corpo do e-mail, com o espaçamento e a cor padrão. Os
 * templates em lib/auth.ts montam o corpo concatenando isto com boxDoCodigo
 * ou botaoDoEmail.
 */
export function paragrafoDoEmail(html: string): string {
  return `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;">${html}</p>`;
}

/**
 * Código de confirmação em destaque. Fica num só nó de texto — sem espaço,
 * traço ou tag entre os dígitos — para que um duplo clique selecione o
 * código inteiro de uma vez, como aconteceria com qualquer palavra; o
 * espaçamento visual entre os dígitos vem só do `letter-spacing`.
 */
export function boxDoCodigo(codigo: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 24px auto;">
  <tr>
    <td style="background-color:#e8f4ea;border:1px solid #bcdcc0;border-radius:10px;padding:16px 32px;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#1f3d2b;">${escaparHtml(codigo)}</span>
    </td>
  </tr>
</table>`;
}

/** Botão de ação (ex.: link de redefinição de senha). */
export function botaoDoEmail(url: string, rotulo: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 24px auto;">
  <tr>
    <td style="background-color:#3faf5c;border-radius:8px;">
      <a href="${escaparHtml(url)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escaparHtml(rotulo)}</a>
    </td>
  </tr>
</table>`;
}
