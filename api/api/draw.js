import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const ADMIN_KEY = process.env.ADMIN_KEY;

// Caminhos
const BUNDLE_DATA_PATH = join(process.cwd(), "api", "data", "sorteio.json"); // leitura do bundle (read-only)
const TMP_DATA_PATH = "/tmp/sorteio.json"; // escrita na Vercel

// Lista padrão caso o JSON do bundle não exista
const DEFAULT_PARTICIPANTS = [
  { nome: "Lucas", sorteado: false, jaSorteou: false },
  { nome: "Gustavo", sorteado: false, jaSorteou: false },
  { nome: "Daniel Domingos", sorteado: false, jaSorteou: false },
  { nome: "Priscila", sorteado: false, jaSorteou: false },
  { nome: "Patricia", sorteado: false, jaSorteou: false },
  { nome: "Daniel Mello", sorteado: false, jaSorteou: false },
  { nome: "Danielle", sorteado: false, jaSorteou: false },
  { nome: "Gabrielle", sorteado: false, jaSorteou: false },
  { nome: "Raquel", sorteado: false, jaSorteou: false },
  { nome: "Ronald", sorteado: false, jaSorteou: false },
  { nome: "Beatriz", sorteado: false, jaSorteou: false },
  { nome: "Guilherme", sorteado: false, jaSorteou: false },
  { nome: "Alice", sorteado: false, jaSorteou: false },
  { nome: "Muriel", sorteado: false, jaSorteou: false },
  { nome: "Guigu", sorteado: false, jaSorteou: false },
  { nome: "Arleide", sorteado: false, jaSorteou: false },
  { nome: "Isaias", sorteado: false, jaSorteou: false },
  { nome: "Vó Branca", sorteado: false, jaSorteou: false }
];

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
  // 1) tenta ler do /tmp se já houver persistência desta execução
  try {
    if (existsSync(TMP_DATA_PATH)) {
      const json = JSON.parse(readFileSync(TMP_DATA_PATH, "utf8"));
      return json.participantes || [];
    }
  } catch {}

  // 2) tenta ler do arquivo do bundle (read-only)
  try {
    if (existsSync(BUNDLE_DATA_PATH)) {
      const json = JSON.parse(readFileSync(BUNDLE_DATA_PATH, "utf8"));
      return json.participantes || [];
    }
  } catch {}

  // 3) fallback seguro: usa lista padrão em memória
  return DEFAULT_PARTICIPANTS.map((p) => ({ ...p }));
}

function saveParticipants(list) {
  try {
    // garante que /tmp existe
    const dir = dirname(TMP_DATA_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    writeFileSync(
      TMP_DATA_PATH,
      JSON.stringify({ participantes: list }, null, 2),
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
    if (!participantes) {
      participantes = loadParticipants();
    }

    // ===== DEV-ONLY: listar pares e pendências =====
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
    const quemSorteiaRaw = (req.query.quem || "").trim();
    if (!quemSorteiaRaw) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    // aceita "contains" para facilitar (insensível a acentos/caixa)
    const key = normalize(quemSorteiaRaw);
    const participante = participantes.find((p) => normalize(p.nome).includes(key));

    if (!participante) {
      return res.status(400).json({ mensagem: "Nome não encontrado na lista!" });
    }

    if (participante.jaSorteou === true) {
      const pessoaSorteada = participantes.find((p) => p.sorteado === true && p.sorteadoPor === participante.nome);
      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
        sorteado: pessoaSorteada ? pessoaSorteada.nome : participante.sorteou
      });
    }

    const disponiveis = participantes.filter(
      (p) => p.sorteado !== true && normalize(p.nome) !== normalize(participante.nome)
    );

    if (disponiveis.length === 0) {
      return res.status(200).json({ mensagem: "Não há mais ninguém disponível!" });
    }

    const sorteado = disponiveis[Math.floor(Math.random() * disponiveis.length)];

    participante.jaSorteou = true;
    participante.sorteou = sorteado.nome;
    sorteado.sorteado = true;
    sorteado.sorteadoPor = participante.nome;

    // Persiste somente em /tmp (Vercel)
    saveParticipants(participantes);

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
      detalhe: String(error?.message || error)
    });
  }
}
