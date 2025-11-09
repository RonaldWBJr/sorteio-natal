import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { join } from "path";

// Função para normalizar strings (remover acentos e converter para minúsculas)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Configuração do MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db("sorteio-natal");
    const collection = db.collection("participantes");

    // Verifica se já tem dados no MongoDB, se não, carrega do JSON
    const count = await collection.countDocuments();

    if (count === 0) {
      const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
      const rawData = readFileSync(dataPath, "utf8");
      const jsonData = JSON.parse(rawData);
      await collection.insertMany(jsonData.participantes);
    }

    // Carrega os dados do MongoDB
    const participantes = await collection.find({}).toArray();

    // Obtém o nome de quem está sorteando
    const quemSorteia = (req.query.quem || "").trim();

    // Validações
    if (!quemSorteia) {
      return res.status(400).json({
        mensagem: "Nome é obrigatório.",
      });
    }

    // Encontra o participante que está sorteando
    const participante = await collection.findOne({
      nome: { $regex: new RegExp("^" + normalize(quemSorteia) + "$", "i") },
    });

    if (!participante) {
      await client.close();
      return res.status(400).json({
        mensagem: "Nome não encontrado na lista!",
      });
    }

    if (participante.jaSorteou) {
      await client.close();
      return res.status(200).json({
        mensagem: "Você já fez seu sorteio!",
      });
    }

    // Filtra participantes disponíveis
    const disponiveis = await collection
      .find({
        sorteado: false,
        nome: { $ne: participante.nome },
      })
      .toArray();

    if (disponiveis.length === 0) {
      await client.close();
      return res.status(200).json({
        mensagem: "Não há mais ninguém disponível!",
      });
    }

    // Realiza o sorteio
    const sorteado =
      disponiveis[Math.floor(Math.random() * disponiveis.length)];

    // Atualiza os status no MongoDB
    await collection.updateOne(
      { _id: participante._id },
      { $set: { jaSorteou: true } }
    );

    await collection.updateOne(
      { _id: sorteado._id },
      { $set: { sorteado: true } }
    );

    // Fecha conexão com MongoDB
    await client.close();

    // Retorna o nome sorteado
    return res.status(200).json({
      nome: sorteado.nome,
    });
  } catch (error) {
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
    });
  }
}
