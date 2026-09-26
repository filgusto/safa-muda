/**
 * Mensagens de boas-vindas do enquadramento da foto de perfil: uma brincadeira
 * do site, sorteada a cada foto enviada.
 *
 * Nenhuma se dirige à pessoa por gênero (nada de "linda", "bem-vindo",
 * "obrigada" falando dela): o elogio vai para a planta, a foto ou o quintal.
 */
export const MENSAGENS_DE_FOTO = [
  "Uau, que plantinha mais linda! 🌱🤩",
  "Essa foto tem cara de sombra boa de quintal. 🌳",
  "Um rosto assim faria bonito em qualquer consórcio: chama luz e boa conversa. ☀️",
  "Estrato emergente: essa foto está lá no alto, brilhando! ✨",
  "Enquadrando com carinho, como quem poda com cuidado. ✂️🌿",
  "Sucessão em andamento: de pioneira a clímax, foto por foto. 🌱➡️🌳",
  "As abelhas já estão a caminho para conferir. 🐝",
  "Esse sorriso faz brotar até semente dormindo. 🌻",
  "Regada de boas ideias e pronta para crescer. 💧🌿",
  "A luz que atravessa essa foto alimenta todos os andares da agrofloresta. 🌤️",
  "Placenta, secundária ou clímax? Só sabemos que é a estrela do canteiro! ⭐",
  "Que presença! Ocupa o espaço como uma bananeira no meio do quintal. 🍌",
  "Solo fértil, rosto à vista: vamos plantar essa foto no site. 🌱",
  "Mais um rostinho para a nossa agrofloresta de gente. 🌳🫶",
  "Foto de raiz profunda e copa frondosa. 🌿",
] as const;

/** Sorteia uma mensagem. `aleatorio` entra por parâmetro para os testes. */
export function sortearMensagemDeFoto(aleatorio: () => number = Math.random) {
  const indice = Math.floor(aleatorio() * MENSAGENS_DE_FOTO.length);
  return MENSAGENS_DE_FOTO[Math.min(indice, MENSAGENS_DE_FOTO.length - 1)]!;
}
