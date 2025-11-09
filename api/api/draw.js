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
  let session;

  try {
    await client.connect();
    const db = client.db("sorteio-natal");
    const collection = db.collection("participantes");

    // Reinicia a coleção a cada deploy para garantir estado inicial
    await collection.drop().catch(() => {}); // Ignora erro se a coleção não existir

    const dataPath = join(process.cwd(), "api", "data", "sorteios.json");
    const rawData = readFileSync(dataPath, "utf8");
    const jsonData = JSON.parse(rawData);

    // Garante que todos os participantes têm os campos corretos
    const participantesIniciais = jsonData.participantes.map((p) => ({
      nome: p.nome,
      sorteado: false,
      jaSorteou: false,
    }));

    await collection.insertMany(participantesIniciais);

    // Cria índices necessários
    await collection.createIndex({ nome: 1 });
    await collection.createIndex({ sorteado: 1 });

    // Obtém o nome de quem está sorteando
    const quemSorteia = (req.query.quem || "").trim();

    // Validações
    if (!quemSorteia) {
      return res.status(400).json({
        mensagem: "Nome é obrigatório.",
      });
    }

    // Inicia uma sessão para transação
    session = client.startSession();
    let sorteadoNome;

    await session.withTransaction(async () => {
      // Encontra e bloqueia o participante que está sorteando
      const participante = await collection.findOne(
        {
          nome: { $regex: new RegExp("^" + normalize(quemSorteia) + "$", "i") },
          jaSorteou: false, // Garante que não sorteou ainda
        },
        { session }
      );

      if (!participante) {
        const jaFezSorteio = await collection.findOne({
          nome: { $regex: new RegExp("^" + normalize(quemSorteia) + "$", "i") },
          jaSorteou: true,
        });

        if (jaFezSorteio) {
          throw new Error("ALREADY_DRAWN");
        } else {
          throw new Error("NOT_FOUND");
        }
      }

      // Filtra participantes disponíveis
      const disponiveis = await collection
        .find(
          {
            sorteado: false,
            _id: { $ne: participante._id },
          },
          { session }
        )
        .toArray();

      if (disponiveis.length === 0) {
        throw new Error("NO_AVAILABLE");
      }

      // Realiza o sorteio
      const sorteado =
        disponiveis[Math.floor(Math.random() * disponiveis.length)];
      sorteadoNome = sorteado.nome;

      // Atualiza os status no MongoDB (dentro da transação)
      await collection.updateOne(
        { _id: participante._id },
        { $set: { jaSorteou: true } },
        { session }
      );

      await collection.updateOne(
        { _id: sorteado._id },
        { $set: { sorteado: true } },
        { session }
      );
    });

    // Se chegou aqui, a transação foi bem sucedida
    return res.status(200).json({ nome: sorteadoNome });
  } catch (error) {
    if (error.message === "ALREADY_DRAWN") {
      return res.status(200).json({ mensagem: "Você já fez seu sorteio!" });
    } else if (error.message === "NOT_FOUND") {
      return res
        .status(400)
        .json({ mensagem: "Nome não encontrado na lista!" });
    } else if (error.message === "NO_AVAILABLE") {
      return res
        .status(200)
        .json({ mensagem: "Não há mais ninguém disponível!" });
    }
    console.error("Erro no sorteio:", error);
    return res.status(500).json({
      mensagem: "Erro ao realizar o sorteio. Por favor, tente novamente.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
    await client.close();
  }
}
