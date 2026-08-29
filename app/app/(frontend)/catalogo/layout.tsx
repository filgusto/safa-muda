/**
 * O slot `@modal` recebe a rota interceptada `(.)[slug]`: ao clicar num card da
 * grade, a ficha da espécie abre sobreposta ao catálogo, sem descartar a
 * listagem e os filtros. Visita direta ou recarga caem na página própria, que
 * continua sendo a versão indexável.
 */
export default function CatalogoLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
