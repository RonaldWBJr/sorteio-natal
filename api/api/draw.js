import { readFileSync } from "fs";
import { join } from "path";

// Função para normalizar strings (remover acentos e converter para minúsculas)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Carrega o arquivo JSON com os participantes
function getParticipantes() {
  const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  return data.participantes || [];
}

export default function handler(req, res) {
  try {
    // Obtém o nome de quem está sorteando
    const quemSorteia = (req.query.quem || "").trim();

    // Validações
    if (!quemSorteia) {
      return res.status(400).json({
        mensagem: "Nome é obrigatório.",
      });
    }

    // Carrega os participantes
    const participantes = getParticipantes();

    // Encontra quem está sorteando
    const participante = participantes.find(
      (p) => normalize(p.nome) === normalize(quemSorteia)
    );

    if (!participante) {
      return res.status(400).json({
        mensagem: "Nome não encontrado na lista!",
      });
    }

    if (participante.jaSorteou) {
      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
      });
    }

    // Filtra participantes disponíveis
    const disponiveis = participantes.filter(
      (p) => !p.sorteado && normalize(p.nome) !== normalize(quemSorteia)
    );

    if (disponiveis.length === 0) {
      return res.status(200).json({
        mensagem: "Não há mais ninguém disponível!",
      });
    }

    // Realiza o sorteio
    const sorteado =
      disponiveis[Math.floor(Math.random() * disponiveis.length)];

    // Atualiza os status
    participante.jaSorteou = true;
    sorteado.sorteado = true;

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
    });
  }
}