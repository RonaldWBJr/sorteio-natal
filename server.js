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

      // Só aceita se for array e tiver pelo menos 1 participante
      if (Array.isArray(json?.participantes) && json.participantes.length > 0) {
        console.log("📂 Carregando participantes do db.json");
        return json.participantes;
      }

      console.warn(
        "⚠️ db.json encontrado, mas 'participantes' está vazio ou inválido. Voltando para a lista padrão."
      );
    }
  } catch (e) {
    console.error("❌ Erro ao carregar db.json, usando padrão:", e);
  }

  // Se deu erro ou estava vazio, usa a lista padrão
  console.log("✨ Usando DEFAULT_PARTICIPANTS");
  return DEFAULT_PARTICIPANTS.map((p) => ({ ...p }));
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

let participantes = loadDB();
