// server.js — servidor local com Express (ESM)
// roda com: npm start  (porta 3000)

import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ----------------- CONFIG / BANCO SIMPLES -----------------

const DB_PATH = path.join(__dirname, "db.json");

// Lista padrão (pode editar os nomes)
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

function normalizaRegistro(p) {
  // garante que todos tenham as mesmas chaves
  return {
    nome: String(p.nome),
    sorteado: !!p.sorteado,
    jaSorteou: !!p.jaSorteou,
    sorteou: p.sorteou || null,
    sorteadoPor: p.sorteadoPor || null
  };
}

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const json = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

      if (Array.isArray(json?.participantes) && json.participantes.length > 0) {
        console.log("📂 Carregando participantes do db.json");
        return json.participantes.map(normalizaRegistro);
      }

      console.warn(
        "⚠️ db.json encontrado, mas 'participantes' está vazio ou inválido. Voltando para a lista padrão."
      );
    }
  } catch (e) {
    console.error("❌ Erro ao carregar db.json, usando padrão:", e);
  }

  console.log("✨ Usando DEFAULT_PARTICIPANTS");
  return DEFAULT_PARTICIPANTS.map((p) => normalizaRegistro(p));
}

function saveDB(participantes) {
  try {
    if (!Array.isArray(participantes) || participantes.length === 0) {
      console.warn("⚠️ Tentativa de salvar DB vazio ignorada.");
      return;
    }

    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ participantes }, null, 2),
      "utf8"
    );
    console.log("✅ db.json salvo com sucesso.");
  } catch (e) {
    console.error("❌ Falha ao salvar db.json:", e);
  }
}

// carrega estado atual
let participantes = loadDB();

const norm = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ----------------- FRONT ESTÁTICO -----------------

app.use(express.static(path.join(__dirname, "public")));

// ----------------- ROTA DO SORTEIO -----------------

app.get("/api/draw", (req, res) => {
  try {
    const quemRaw = String(req.query.quem || "").trim();
    if (!quemRaw) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const chave = norm(quemRaw);

    // precisa bater exatamente (ignora só acento e caixa)
    const participante = participantes.find(
      (p) => norm(p.nome) === chave
    );

    if (!participante) {
      return res
        .status(400)
        .json({ mensagem: "Nome não encontrado na lista!" });
    }

    // 🔒 se já sorteou alguma vez, não deixa de novo
    if (participante.jaSorteou || participante.sorteou) {
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

    // monta a lista de quem pode ser sorteado:
    // - não pode ser ele mesmo
    // - não pode ter sido sorteado por ninguém
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

    // segurança extra: se por algum bug ele já estiver marcado, trava
    if (sorteado.sorteado || sorteado.sorteadoPor) {
      console.error("Estado inconsistente, pessoa já marcada como sorteada:", sorteado);
      return res
        .status(500)
        .json({ mensagem: "Erro de estado: pessoa já foi sorteada antes." });
    }

    // marca o participante
    participante.jaSorteou = true;
    participante.sorteou = sorteado.nome;

    // marca o sorteado
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

// ----------------- START SERVER -----------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor local rodando em http://localhost:${PORT}`);
});
