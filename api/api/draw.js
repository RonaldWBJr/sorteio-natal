import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import fs from "fs";

export default function handler(req, res) {
  const dbFile = "/tmp/db.json";

  // Se o arquivo não existir no /tmp, copia o db.json inicial do projeto
  if (!fs.existsSync(dbFile)) {
    const initialData = {
      participantes: [
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
      ]
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
  }

  const adapter = new JSONFileSync(dbFile);
  const db = new LowSync(adapter);
  db.read();


  const quemSorteia = (req.query.quem || "").trim();
  if (!quemSorteia) return res.status(400).json({ mensagem: "Nome é obrigatório." });

  function normalize(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  const p = db.data.participantes.find(x => normalize(x.nome) === normalize(quemSorteia));
  if (!p) return res.json({ mensagem: "Nome não encontrado na lista!" });

  if (p.jaSorteou) return res.json({ mensagem: "Você já fez seu sorteio!" });

  const disponiveis = db.data.participantes.filter(
    x => !x.sorteado && normalize(x.nome) !== normalize(quemSorteia)
  );

  if (disponiveis.length === 0) return res.json({ mensagem: "Não há mais ninguém disponível!" });

  const sorteado = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  sorteado.sorteado = true;
  p.jaSorteou = true;
  db.write();

  return res.json({ nome: sorteado.nome });
}