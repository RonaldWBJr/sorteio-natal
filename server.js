import express from "express";
import { LowSync, JSONFileSync } from "lowdb";
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
        { nome: "Lucas", sorteado: false },
        { nome: "João", sorteado: false },
        { nome: "Carlos", sorteado: false },
        { nome: "Joana", sorteado: false },
        { nome: "Lara", sorteado: false },
    ];
    db.write();
}

// Rota para sortear um participante
app.get("/draw", (req, res) => {
    db.read();
    const naoSorteados = db.data.participantes.filter((p) => !p.sorteado);

    if (naoSorteados.length === 0) {
        return res.json({ mensagem: "Todos já foram sorteados! 🎅" });
    }

    const sorteado =
    naoSorteados[Math.floor(Math.random() * naoSorteados.length)];
    sorteado.sorteado = true;
    db.write();

    res.json({ nome: sorteado.nome });
    });

    // Rota opcional para reiniciar o sorteio
    app.get("/reset", (req, res) => {
    db.data.participantes.forEach((p) => (p.sorteado = false));
    db.write();
    res.json({ mensagem: "Sorteio reiniciado com sucesso! 🎁" });
});

app.listen(3000, () => console.log("🎄 Servidor rodando na porta 3000"));