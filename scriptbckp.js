const API = 'http://localhost:3000/api'; // altere para o domínio do servidor

// Gera ID único por dispositivo
function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

// Atualiza lista de participantes (apenas visualização)
async function refreshList() {
  const resp = await fetch(API + '/participants');
  const list = await resp.json();
  const el = document.getElementById('list');
  if (!list || list.length === 0)
    el.innerText = 'Nenhum participante cadastrado ainda';
  else
    el.innerText = list
      .map(p => `${p.name} — ${p.drawn ? '✅ Sorteado' : '🎁 Aguardando'}`)
      .join('\n');
}

// Sorteio (usuário digita nome, mas sorteio é feito pelo sistema)
document.getElementById('drawBtn').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  if (!name) return alert('Por favor, digite seu nome antes de sortear!');

  const deviceId = getDeviceId(); 

  const res = await fetch(API + '/draw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, name })
  });

  const data = await res.json();
  const result = document.getElementById('result');

  if (!res.ok) {
    result.innerHTML = `<div class="winner danger">❌ Erro: ${data.error || 'desconhecido'}</div>`;
    return;
  }

  document.getElementById('bellSound').play();
  result.innerHTML = `<div class="winner">🎉 Vencedor: <strong>${data.winner.name}</strong> 🎁</div>`;
  createSnow();
  refreshList();
});

// Neve animada
function createSnow() {
  for (let i = 0; i < 30; i++) {
    const snow = document.createElement('div');
    snow.classList.add('snowflake');
    snow.innerHTML = '❄';
    snow.style.left = Math.random() * 100 + 'vw';
    snow.style.animationDuration = (Math.random() * 3 + 3) + 's';
    snow.style.fontSize = (Math.random() * 10 + 10) + 'px';
    document.body.appendChild(snow);
    setTimeout(() => snow.remove(), 5000);
  }
}

// Atualiza lista ao abrir
refreshList();
