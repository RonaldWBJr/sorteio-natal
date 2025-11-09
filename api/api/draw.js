import { readFileSync } from "fs";
import { join } from "path";

// Função para normalizar strings (remover acentos e converter para minúsculas)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Armazena os participantes em memória
let participantes = null;

export default function handler(req, res) {
  try {
    // Se ainda não carregou os participantes, carrega do arquivo
    if (!participantes) {
      const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
      const jsonData = JSON.parse(readFileSync(dataPath, "utf8"));
      participantes = jsonData.participantes;
    }

    // Obtém o nome de quem está sorteando
    const quemSorteia = (req.query.quem || "").trim();

    // Validações
    if (!quemSorteia) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    // Encontra quem está sorteando
    const participante = participantes.find(
      p => normalize(p.nome) === normalize(quemSorteia)
    );

    if (!participante) {
      return res
        .status(400)
        .json({ mensagem: "Nome não encontrado na lista!" });
    }

    if (participante.jaSorteou === true) {
      return res.status(200).json({ mensagem: "Você já fez seu sorteio!" });
    }

    // Filtra participantes disponíveis
    const disponiveis = participantes.filter(
      p => p.sorteado !== true && normalize(p.nome) !== normalize(quemSorteia)
    );

    if (disponiveis.length === 0) {
      return res
        .status(200)
        .json({ mensagem: "Não há mais ninguém disponível!" });
    }

    // Realiza o sorteio
    const sorteado =
      disponiveis[Math.floor(Math.random() * disponiveis.length)];

    // Atualiza os status em memória
    participante.jaSorteou = true;
    sorteado.sorteado = true;

    // Retorna o nome sorteado
    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
    });
  }
}
