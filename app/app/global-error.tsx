"use client";

// Último recurso: substitui o layout raiz quando ele mesmo falha, então traz
// o próprio <html> e não depende de Tailwind nem das fontes do app.
export default function ErroGlobal({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "Georgia, serif",
          maxWidth: 560,
          margin: "6rem auto",
          padding: "0 1rem",
          textAlign: "center",
        }}
      >
        <h1>Algo deu errado</h1>
        <p>O Safa Muda não conseguiu carregar. Tente de novo em instantes.</p>
        <button type="button" onClick={reset}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
