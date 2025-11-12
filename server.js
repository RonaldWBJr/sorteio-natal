// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const normalize = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Caminhos
const DB_PATH = "db.json";
const SEED_PATH = join(process.cwd(), "api", "data", "sorteios.json");

// Inicializa lowdb
if (!existsSync(DB_PATH)) {
  writeFileSync(DB_PATH, JSON.stringify({ participantes: [] }, null, 2));
}
const adapter = new JSONFileSync(DB_PATH);
const db = new LowSync(adapter, { participantes: [] });
db.read();

// Semente a partir do arquivo do bundle, se o db estiver vazio
if (!db.data.participantes || db.data.participantes.length === 0) {
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  db.data.participantes = seed.participantes?.map((p) => ({ ...p })) ?? [];
  db.write();
}

app.get("/draw", (req, res) => {
  db.read();

  const quemRaw = (req.query.quem || "").trim();
  if (!quemRaw) {
    return res.status(400).json({ mensagem: "Nome é obrigatório." });
  }

  const alvoNorm = normalize(quemRaw);
  const participante = db.data.participantes.find((p) =>
    normalize(p.nome).includes(alvoNorm)
  );

  if (!participante) {
    return res.status(400).json({ mensagem: "Nome não encontrado na lista." });
  }

  if (participante.jaSorteou) {
    const pessoaSorteada = db.data.participantes.find(
      (p) => p.sorteado === true && p.sorteadoPor === participante.nome
    );
    return res.json({
      mensagem: "Você já sorteou! ❌",
      sorteado: pessoaSorteada ? pessoaSorteada.nome : undefined,
    });
  }

  const disponiveis = db.data.participantes.filter(
    (p) => !p.sorteado && normalize(p.nome) !== normalize(participante.nome)
  );

  if (disponiveis.length === 0) {
    return res.json({ mensagem: "Não há mais nomes para sortear 🎅" });
  }

  if (
    disponiveis.length === 1 &&
    normalize(disponiveis[0].nome) === normalize(participante.nome)
  ) {
    return res.json({
      mensagem:
        "Não há opção válida no momento (só restou você). Tente novamente após outros sorteios.",
    });
  }

  const sorteado = disponiveis[Math.floor(Math.random() * disponiveis.length)];

  participante.jaSorteou = true;
  participante.sorteou = sorteado.nome;
  sorteado.sorteado = true;
  sorteado.sorteadoPor = participante.nome;

  db.write();

  res.json({ nome: sorteado.nome });
});

app.listen(3000, () => {
  console.log("✅ Server local rodando em http://localhost:3000");
});
