// Lógica de status de atendimento do cliente (CRM)

export const DIAS_PENDENTE = 15;

export type StatusCliente = "em_dia" | "pendente";

export type InfoStatus = {
  status: StatusCliente;
  diasDesde: number | null;
};

export function statusAtendimento(
  ultimoAtendimento: string | null
): InfoStatus {
  if (!ultimoAtendimento) {
    return { status: "pendente", diasDesde: null };
  }
  const ultimo = new Date(ultimoAtendimento).getTime();
  const dias = Math.floor((Date.now() - ultimo) / (1000 * 60 * 60 * 24));
  return {
    status: dias >= DIAS_PENDENTE ? "pendente" : "em_dia",
    diasDesde: dias,
  };
}

export function textoTempo(diasDesde: number | null): string {
  if (diasDesde === null) return "Nunca atendido";
  if (diasDesde === 0) return "Atendido hoje";
  if (diasDesde === 1) return "Atendido ontem";
  return `Há ${diasDesde} dias`;
}
