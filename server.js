import express from "express";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Banco de dados local (db.json)
const adapter = new JSONFileSync("db.json");
const db = new LowSync(adapter, { participantes: [] });
db.read();

// Inicializa lista de participantes fixos (edite aqui)
if (!db.data.participantes || db.data.participantes.length === 0) {
    db.data.participantes = [
        // Coloque os nomes dos participantes abaixo:
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

// Rota para sortear um participante
app.get("/draw", (req, res) => {
  db.read();

  const quemSorteia = (req.query.quem || "").trim();

  if (!quemSorteia) {
    return res.status(400).json({ mensagem: "Nome de quem sorteia é obrigatório." });
  }

  const participante = db.data.participantes.find(
    (p) => p.nome.toLowerCase() === quemSorteia.toLowerCase()
  );

  if (!particIpante) {
    return res.status(400).json({ mensagem: "Esse nome não está na lista de participantes!" });
  }

  // VERIFICA SE JÁ SORTEOU ANTES
  if (particIpante.jaSorteou) {
    return res.json({ mensagem: "Você já fez seu sorteio! ❌" });
  }

  // Lista de quem ainda pode ser sorteado (exclui quem sorteia)
  const naoSorteados = db.data.participantes.filter(
    (p) => !p.sorteado && p.nome.toLowerCase() !== quemSorteia.toLowerCase()
  );

  if (naoSorteados.length === 0) {
    return res.json({ mensagem: "Não há mais ninguém disponível para sortear! 🎅" });
  }

  const sorteado = naoSorteados[Math.floor(Math.random() * naoSorteados.length)];

  // MARCA QUEM FOI SORTEADO
  sorteado.sorteado = true;

  // MARCA QUE ESSA PESSOA JÁ FEZ O SORTEIO
  particIpante.jaSorteou = true;

  db.write();

  res.json({ nome: sorteado.nome });
});

app.listen(3000, () => console.log("🎄 Servidor rodando na porta 3000"));