// api/api/draw.js
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ADMIN_KEY = process.env.ADMIN_KEY;

// caminhos de dados
const BUNDLE_DATA_PATH = join(process.cwd(), "api", "data", "sorteio.json"); // leitura do bundle
const TMP_DATA_PATH = "/tmp/sorteio.json"; // escrita em Vercel (filesystem efêmero)

let participantes = null;

function normalize(str = "") {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isDevAuthorized(req) {
  const provided =
    req.headers["x-admin-key"] ||
    req.headers["x-admin-key".toLowerCase()] ||
    req.query.key;
  return ADMIN_KEY && provided === ADMIN_KEY;
}

function loadParticipants() {
  // tenta ler do /tmp (se já salvou nesta execução)
  try {
    const json = JSON.parse(readFileSync(TMP_DATA_PATH, "utf8"));
    return json.participantes || [];
  } catch (_) {}

  // senão, lê do arquivo empacotado
  const json = JSON.parse(readFileSync(BUNDLE_DATA_PATH, "utf8"));
  return json.participantes || [];
}

function saveParticipants(participantes) {
  // em Vercel, escreva em /tmp
  try {
    writeFileSync(TMP_DATA_PATH, JSON.stringify({ participantes }, null, 2), "utf8");
    return true;
  } catch (_) {}

  // fallback local (ambientes fora da Vercel)
  try {
    writeFileSync(BUNDLE_DATA_PATH, JSON.stringify({ participantes }, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Falha ao salvar participantes:", err);
    return false;
  }
}

export default function handler(req, res) {
  try {
    if (!participantes) {
      participantes = loadParticipants();
    }

    // ===== DEV-ONLY: listar pares =====
    if (req.method === "GET" && req.query.acao === "pares") {
      if (!isDevAuthorized(req)) {
        return res
          .status(403)
          .json({ erro: "Acesso restrito. Falha na autenticação de desenvolvedor." });
      }

      const pares = participantes
        .filter((p) => p.jaSorteou && p.sorteou)
        .map((p) => ({ quem: p.nome, tirou: p.sorteou }));

      const pendentes = {
        aindaNaoSortearam: participantes.filter((p) => !p.jaSorteou).map((p) => p.nome),
        aindaNaoForamSorteados: participantes.filter((p) => !p.sorteado).map((p) => p.nome),
      };

      return res.status(200).json({ pares, pendentes });
    }

    // ===== SORTEIO NORMAL =====
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

    // persiste (em /tmp na Vercel)
    saveParticipants(participantes);

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res
      .status(500)
      .json({ mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente." });
  }
}
