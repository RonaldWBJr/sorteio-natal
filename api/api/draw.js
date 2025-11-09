import { readFileSync } from "fs";
import { join } from "path";

// Função para normalizar strings (remover acentos e converter para minúsculas)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function handler(req, res) {
  try {
    // Lê o arquivo JSON com os participantes
    const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
    const rawData = readFileSync(dataPath, "utf8");
    const data = JSON.parse(rawData);

    // Obtém o nome de quem está sorteando
    const quemSorteia = (req.query.quem || "").trim();

    // Validações
    if (!quemSorteia) {
      return res.status(400).json({
        mensagem: "Nome é obrigatório.",
      });
    }

    // Encontra o participante que está sorteando
    const participante = data.participantes.find(
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
    const disponiveis = data.participantes.filter(
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

    // Retorna o nome sorteado
    return res.status(200).json({
      nome: sorteado.nome,
    });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
    });
  }
}
