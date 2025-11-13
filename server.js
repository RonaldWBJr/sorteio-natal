// server.js — servidor local com Express (ESM)
// roda com: npm start  (porta 3000)

import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// --- persistência local em arquivo (db.json) ---
const DB_PATH = path.join(__dirname, "db.json");

// seed padrão (edite os nomes se quiser)
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

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const json = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

      // só aceita se for array e NÃO estiver vazio
      if (Array.isArray(json?.participantes) && json.participantes.length > 0) {
        return json.participantes;
      }

      console.warn("db.json encontrado, mas 'participantes' está vazio ou inválido. Recriando com padrão.");
    }
  } catch (e) {
    console.error("Erro ao carregar db.json, usando padrão:", e);
  }

  // se deu erro ou estava vazio, volta pros padrões:
  return DEFAULT_PARTICIPANTS.map((p) => ({ ...p }));
}


function saveDB(participantes) {
  try {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ participantes }, null, 2),
      "utf8"
    );
  } catch (e) {
    console.error("Falha ao salvar db.json:", e);
  }
}

let participantes = loadDB();

const norm = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// serve os arquivos estáticos (index.html dentro de /public)
app.use(express.static(path.join(__dirname, "public")));

// --- API local em /api/draw ---
app.get("/api/draw", (req, res) => {
  try {
    const quemRaw = String(req.query.quem || "").trim();
    if (!quemRaw) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const chave = norm(quemRaw);

    // AGORA: nome precisa bater exatamente (sem acento / caixa)
    const participante = participantes.find(
      (p) => norm(p.nome) === chave
    );

    if (!participante) {
      return res
        .status(400)
        .json({ mensagem: "Nome não encontrado na lista!" });
    }

    // segurança extra: se ele já tem 'sorteou' OU 'jaSorteou', não deixa sortear de novo
    const jaSorteou =
      participante.jaSorteou || typeof participante.sorteou === "string";

    if (jaSorteou) {
      const pessoaSorteada =
        participantes.find(
          (p) => p.sorteado && p.sorteadoPor === participante.nome
        ) ||
        participantes.find((p) => p.nome === participante.sorteou);

      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
        sorteado: pessoaSorteada?.nome || participante.sorteou
      });
    }

    // Lista de pessoas disponíveis para serem sorteadas:
    // - não podem ser o próprio participante
    // - não podem ter sido sorteadas antes
    //   (checando tanto 'sorteado' quanto 'sorteadoPor' por segurança)
    const disponiveis = participantes.filter((p) => {
      const ehProprio = norm(p.nome) === chave;
      const jaFoiSorteado = p.sorteado || !!p.sorteadoPor;
      return !ehProprio && !jaFoiSorteado;
    });

    if (disponiveis.length === 0) {
      return res
        .status(200)
        .json({ mensagem: "Não há mais ninguém disponível!" });
    }

    const sorteado =
      disponiveis[Math.floor(Math.random() * disponiveis.length)];

    // marca quem sorteou
    participante.jaSorteou = true;
    participante.sorteou = sorteado.nome;

    // marca quem foi sorteado
    sorteado.sorteado = true;
    sorteado.sorteadoPor = participante.nome;

    saveDB(participantes);

    return res.status(200).json({ nome: sorteado.nome });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
      detalhe: String(error?.message || error)
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor local rodando em http://localhost:${PORT}`);
});
