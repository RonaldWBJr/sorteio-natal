import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ADMIN_KEY = process.env.ADMIN_KEY;
if (req.headers["x-admin-key"] !== ADMIN_KEY) {
  return res.status(403).json({ erro: "Acesso restrito a desenvolvedor." });
}


const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
let participantes = null;

function normalize(str = "") {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// --- helper de proteção dev-only ---
function assertDevOnly(req, res) {
  const provided =
    req.headers["x-admin-key"] ||
    req.headers["x-admin-key".toLowerCase()] ||
    req.query.key;

  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return res
      .status(403)
      .json({ erro: "Acesso restrito. Falha na autenticação de desenvolvedor." });
  }
  return null;
}

export default function handler(req, res) {
  try {
    if (!participantes) {
      const jsonData = JSON.parse(readFileSync(dataPath, "utf8"));
      participantes = jsonData.participantes || [];
    }

    // ====== DEV-ONLY: listar pares ======
    if (req.method === "GET" && req.query.acao === "pares") {
      const denied = assertDevOnly(req, res);
      if (denied) return; // 403 já enviado

      const pares = participantes
        .filter((p) => p.jaSorteou && p.sorteou)
        .map((p) => ({ quem: p.nome, tirou: p.sorteou }));

      const pendentes = {
        aindaNaoSortearam: participantes.filter((p) => !p.jaSorteou).map((p) => p.nome),
        aindaNaoForamSorteados: participantes.filter((p) => !p.sorteado).map((p) => p.nome),
      };

      return res.status(200).json({ pares, pendentes });
    }

    // ====== SORTEIO NORMAL ======
    const quemSorteia = (req.query.quem || "").trim();
    if (!quemSorteia) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const participante = participantes.find(
      (p) => normalize(p.nome) === normalize(quemSorteia)
    );
    if (!participante) {
      return res.status(400).json({ mensagem: "Nome não encontrado na lista!" });
    }

    if (participante.jaSorteou === true) {
      const pessoaSorteada = participantes.find(
        (p) => p.sorteado === true && p.sorteadoPor === quemSorteia
      );
      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
        sorteado: pessoaSorteada ? pessoaSorteada.nome : undefined,
      });
    }

    const disponiveis = participantes.filter(
      (p) => p.sorteado !== true && normalize(p.nome) !== normalize(quemSorteia)
    );
    if (disponiveis.length === 0) {
      return res.status(200).json({ mensagem: "Não há mais ninguém disponível!" });
    }

    const sorteado = disponiveis[Math.floor(Math.random() * disponiveis.length)];

    participante.jaSorteou = true;
    participante.sorteou = sorteado.nome;
    sorteado.sorteado = true;
    sorteado.sorteadoPor = quemSorteia;

    writeFileSync(dataPath, JSON.stringify({ participantes }, null, 2), "utf8");

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res
      .status(500)
      .json({ mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente." });
  }
}
