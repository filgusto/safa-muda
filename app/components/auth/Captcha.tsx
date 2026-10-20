"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Desafio anti-robô do cadastro (Cloudflare Turnstile).
 *
 * `useCaptcha` pergunta ao servidor se há CAPTCHA configurado
 * (/api/captcha). Sem chave, `exigido` fica falso, nada é desenhado e o
 * cadastro segue como sempre. Com chave, `elemento` é o widget e `token` é a
 * resposta a mandar no cabeçalho `x-captcha-response` (ver `cabecalhos`).
 *
 * Cada resposta vale para UMA tentativa: chame `reiniciar()` depois de cada
 * envio, com sucesso ou não.
 */

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render: (
    alvo: HTMLElement,
    opcoes: {
      sitekey: string;
      language?: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let carregamento: Promise<Turnstile> | undefined;

/** Carrega o script uma vez só, mesmo com dois formulários na página. */
function carregarTurnstile(): Promise<Turnstile> {
  carregamento ??= new Promise<Turnstile>((resolver, rejeitar) => {
    if (window.turnstile) return resolver(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolver(window.turnstile)
        : rejeitar(new Error("Turnstile não carregou."));
    script.onerror = () => {
      carregamento = undefined;
      rejeitar(new Error("Turnstile não carregou."));
    };
    document.head.appendChild(script);
  });
  return carregamento;
}

export const MENSAGEM_DO_CAPTCHA =
  "Confirme que você não é um robô para continuar.";

export function useCaptcha(ativo: boolean) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const alvo = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    fetch("/api/captcha")
      .then((resposta) => resposta.json())
      .then((corpo: { siteKey?: string | null }) => {
        if (!cancelado) setSiteKey(corpo.siteKey ?? null);
      })
      // Sem resposta, segue sem o widget: se o servidor exigir o desafio, o
      // cadastro volta com erro e a pessoa recarrega a página.
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [ativo]);

  useEffect(() => {
    if (!ativo || !siteKey || !alvo.current) return;
    let cancelado = false;
    const elemento = alvo.current;

    carregarTurnstile()
      .then((turnstile) => {
        if (cancelado) return;
        widget.current = turnstile.render(elemento, {
          sitekey: siteKey,
          language: "pt-br",
          theme: "auto",
          callback: (resposta) => {
            setFalhou(false);
            setToken(resposta);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFalhou(true);
          },
        });
      })
      .catch(() => {
        if (!cancelado) setFalhou(true);
      });

    return () => {
      cancelado = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
      setToken(null);
    };
  }, [ativo, siteKey]);

  const reiniciar = useCallback(() => {
    setToken(null);
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  const exigido = ativo && siteKey !== null;

  return {
    exigido,
    token,
    reiniciar,
    /** Cabeçalho que o plugin de captcha do Better Auth lê. */
    cabecalhos: token ? { "x-captcha-response": token } : undefined,
    elemento: exigido ? (
      <div className="space-y-1">
        <div ref={alvo} />
        {falhou && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Não foi possível carregar a verificação anti-robô. Recarregue a
            página; se você usa bloqueador de conteúdo, libere
            challenges.cloudflare.com.
          </p>
        )}
      </div>
    ) : null,
  };
}
