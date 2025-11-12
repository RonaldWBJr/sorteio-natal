// api/draw.js
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ADMIN_KEY = process.env.ADMIN_KEY;

// Caminhos de dados
// - No Vercel, grava em /tmp (fs efêmero).
// - O arquivo do bundle (somente leitura) fica em api/data/sorteios.json
const BUNDLE_DATA_PATH = join(process.cwd(), "api", "data", "sorteios.json");
const TMP_DATA_PATH = "/tmp/sorteios.json";

let participantesCache = null;

function normalize(str = "") {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isDevAuthorized(req) {
  const provided =
    req.headers["x-admin-key"] ||
    req.query.key;
  return ADMIN_KEY && provided === ADMIN_KEY;
}

function loadParticipants() {
  // 1) Se já houver em /tmp (escrito por esta função antes), prioriza
  if (existsSync(TMP_DATA_PATH)) {
    try {
      const json = JSON.parse(readFileSync(TMP_DATA_PATH, "utf8"));
      return Array.isArray(json.participantes) ? json.participantes : [];
    } catch (_) {}
  }

  // 2) Lê do bundle (somente leitura)
  const json = JSON.parse(readFileSync(BUNDLE_DATA_PATH, "utf8"));
  return Array.isArray(json.participantes) ? json.participantes : [];
}

function saveParticipants(participantes) {
  try {
    writeFileSync(
      TMP_DATA_PATH,
      JSON.stringify({ participantes }, null, 2),
      "utf8"
    );
    return true;
  } catch (err) {
    console.error("Falha ao salvar em /tmp:", err);
    return false;
  }
}

export default function handler(req, res) {
  try {
    if (!participantesCache) {
      participantesCache = loadParticipants();
    }

    // ===== DEV-ONLY: listar pares e pendências =====
    if (req.method === "GET" && req.query.acao === "pares") {
      if (!isDevAuthorized(req)) {
        return res
          .status(403)
          .json({ erro: "Acesso restrito. Falha na autenticação de desenvolvedor." });
      }

      const pares = participantesCache
        .filter((p) => p.jaSorteou && p.sorteou)
        .map((p) => ({ quem: p.nome, tirou: p.sorteou }));

      const pendentes = {
        aindaNaoSortearam: participantesCache.filter((p) => !p.jaSorteou).map((p) => p.nome),
        aindaNaoForamSorteados: participantesCache.filter((p) => !p.sorteado).map((p) => p.nome),
      };

      return res.status(200).json({ pares, pendentes });
    }

    // ===== SORTEIO NORMAL =====
    const quemSorteiaRaw = (req.query.quem || "").trim();
    if (!quemSorteiaRaw) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    // Aceita nome completo ou parte do nome (case/acento-insensitive)
    const alvoNorm = normalize(quemSorteiaRaw);
    const participante = participantesCache.find(
      (p) => normalize(p.nome).includes(alvoNorm)
    );

    if (!participante) {
      return res.status(400).json({ mensagem: "Nome não encontrado na lista!" });
    }

    if (participante.jaSorteou === true) {
      // Descobre quem ele/ela já tirou (se existir)
      const pessoaSorteada = participantesCache.find(
        (p) => p.sorteado === true && p.sorteadoPor === participante.nome
      );
      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
        sorteado: pessoaSorteada ? pessoaSorteada.nome : undefined,
      });
    }

    // Disponíveis = quem ainda não foi sorteado e não é o próprio participante
    const disponiveis = participantesCache.filter(
      (p) => p.sorteado !== true && normalize(p.nome) !== normalize(participante.nome)
    );

    if (disponiveis.length === 0) {
      return res.status(200).json({ mensagem: "Não há mais ninguém disponível!" });
    }

    // Caso extremo: se só sobrar ele(a) mesmo — impede travar o sorteio
    // (aqui apenas avisa; uma solução completa exigiria reembaralhar pares)
    if (
      disponiveis.length === 1 &&
      normalize(disponiveis[0].nome) === normalize(participante.nome)
    ) {
      return res.status(200).json({
        mensagem:
          "Não há opção válida no momento (só restou você). Tente novamente após outros sorteios.",
      });
    }

    const sorteado = disponiveis[Math.floor(Math.random() * disponiveis.length)];

    // Marca estados
    participante.jaSorteou = true;
    participante.sorteou = sorteado.nome;
    sorteado.sorteado = true;
    sorteado.sorteadoPor = participante.nome;

    // Persiste
    saveParticipants(participantesCache);

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res
      .status(500)
      .json({ mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente." });
  }
}
