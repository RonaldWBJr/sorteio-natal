import express from "express";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔹 NOVO: serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static("public"));

// 🔹 NOVO: define uma rota padrão (para não dar 404 na raiz)
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

const adapter = new JSONFileSync("db.json");
const db = new LowSync(adapter, { participantes: [] });
db.read();

function normalizar(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

if (!db.data.participantes || db.data.participantes.length === 0) {
  db.data.participantes = [
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
    { nome: "Vó Branca", sorteado: false, jaSorteou: false },
  ];
  db.write();
}

app.get("/draw", (req, res) => {
  db.read();

  const quemSorteia = normalizar((req.query.quem || "").trim());

  if (!quemSorteia) {
    return res.status(400).json({ mensagem: "Nome é obrigatório." });
  }

  const participante = db.data.participantes.find((p) =>
    normalizar(p.nome).includes(quemSorteia)
  );

  if (!participante) {
    return res.status(400).json({ mensagem: "Nome não encontrado na lista." });
  }

  if (participante.jaSorteou) {
    return res.json({ mensagem: "Você já sorteou! ❌" });
  }

  const naoSorteados = db.data.participantes.filter(
  (p) => !p.sorteado && normalizar(p.nome) !== normalizar(participante.nome)
);

if (naoSorteados.length === 0) {
  return res.json({ mensagem: "Não há mais nomes para sortear 🎅" });
}

// ✅ Corrigido:
const sorteado = naoSorteados[Math.floor(Math.random() * naoSorteados.length)];

participante.jaSorteou = true;
sorteado.sorteado = true;

db.write();

res.json({ nome: sorteado.nome });
})