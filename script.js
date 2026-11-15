/* ===== Painel de Utilidades - simulação de área de trabalho (JS puro) ===== */
'use strict';

/* ---------- Utilitários e LocalStorage ---------- */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const salvar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const lerJSON = (k, padrao) => { try { return JSON.parse(ler(k)) ?? padrao; } catch (e) { return padrao; } };
const hhmm = d => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/* ---------- Lista de aplicativos (gera ícones, barra, menu e janelas) ---------- */
const APPS = [
  { id: 'calc', nome: 'Calculadora', ico: '🧮', cor: '#4f8cff', w: 330 },
  { id: 'tarefas', nome: 'Tarefas', ico: '✅', cor: '#7c6cff', w: 420 },
  { id: 'notas', nome: 'Bloco de Notas', ico: '📝', cor: '#38bdf8', w: 480 },
  { id: 'conversor', nome: 'Conversor', ico: '🌡️', cor: '#c084fc', w: 380 },
  { id: 'arquivos', nome: 'Explorador de Arquivos', ico: '📁', cor: '#e0a526', w: 580 },
  { id: 'relogio', nome: 'Relógio', ico: '🕒', cor: '#2fbf8f', w: 420 }
];

/* =========================================================
   GERENCIADOR DE JANELAS
   Cada janela é uma <section>. Estados por classe CSS:
   aberta, minimizada, maximizada, foco (a da frente).
   ========================================================= */
const desk = $('#desk'), jan = {};
let z = 10, foco = null, abertas = 0;
const telaPequena = () => matchMedia('(max-width:700px)').matches;

/** Cria a janela de um app e move o conteúdo para dentro dela. */
function criarJanela(a) {
  const j = document.createElement('section');
  j.className = 'janela'; j.style.width = a.w + 'px';
  j.innerHTML = `<header class="barra"><span>${a.ico}</span><b>${a.nome}</b><div class="ctl">
    <button data-c="min" aria-label="Minimizar">─</button><button data-c="max" aria-label="Maximizar">▢</button>
    <button data-c="x" class="x" aria-label="Fechar">✕</button></div></header><div class="corpo"></div>`;
  j.querySelector('.corpo').append($(`[data-corpo=${a.id}]`));
  desk.append(j); jan[a.id] = j;

  j.addEventListener('pointerdown', () => focar(a.id));                 // clicar traz para a frente
  j.querySelector('.ctl').addEventListener('click', e => {
    const c = e.target.dataset.c;
    if (c === 'min') minimizar(a.id); else if (c === 'max') maximizar(a.id); else if (c === 'x') fechar(a.id);
  });
  const barra = j.querySelector('.barra');
  barra.addEventListener('dblclick', e => { if (!e.target.closest('.ctl') && !telaPequena()) maximizar(a.id); });

  // Arrastar pela barra de título
  barra.addEventListener('pointerdown', e => {
    if (e.target.closest('.ctl') || j.classList.contains('maximizada') || telaPequena()) return;
    const dx = e.clientX - j.offsetLeft, dy = e.clientY - j.offsetTop;
    barra.setPointerCapture(e.pointerId);
    const mover = ev => {
      j.style.left = Math.min(Math.max(ev.clientX - dx, 60 - j.offsetWidth), desk.clientWidth - 60) + 'px';
      j.style.top = Math.min(Math.max(ev.clientY - dy, 0), desk.clientHeight - 40) + 'px';
    };
    const soltar = () => { barra.removeEventListener('pointermove', mover); barra.removeEventListener('pointerup', soltar); };
    barra.addEventListener('pointermove', mover); barra.addEventListener('pointerup', soltar);
  });
}

/** Abre o app (ou restaura se estiver minimizado) e traz para a frente. */
function abrir(id) {
  const j = jan[id];
  if (!j.classList.contains('aberta')) {
    j.classList.add('aberta');
    const n = abertas++ % 5;                                            // cascata de posições
    j.style.left = Math.max(0, (desk.clientWidth - j.offsetWidth) / 2 + (n - 2) * 30) + 'px';
    j.style.top = Math.max(0, (desk.clientHeight - j.offsetHeight) / 2 + (n - 2) * 24) + 'px';
  }
  j.classList.remove('minimizada', 'fechando');
  fecharMenus(); focar(id);
}
/** Coloca a janela na frente (maior z-index) e marca como ativa. */
function focar(id) {
  foco = id; jan[id].style.zIndex = ++z;
  for (const k in jan) jan[k].classList.toggle('foco', k === id);
  atualizarBarra();
}
function minimizar(id) {
  jan[id].classList.add('minimizada'); jan[id].classList.remove('foco');
  if (foco === id) foco = null; atualizarBarra();
}
function maximizar(id) {
  const j = jan[id]; j.classList.toggle('maximizada');
  j.querySelector('[data-c=max]').textContent = j.classList.contains('maximizada') ? '❐' : '▢';
}
function fechar(id) {
  const j = jan[id];
  if (foco === id) foco = null;
  j.classList.add('fechando');
  setTimeout(() => {                                                    // espera a animação terminar
    if (!j.classList.contains('fechando')) return;
    j.classList.remove('aberta', 'fechando', 'minimizada', 'maximizada');
    j.querySelector('[data-c=max]').textContent = '▢'; atualizarBarra();
  }, 160);
}
/** Botão do app na barra de tarefas: abre, minimiza ou traz para a frente. */
function alternar(id) {
  const j = jan[id];
  if (!j.classList.contains('aberta') || j.classList.contains('minimizada')) abrir(id);
  else if (foco === id) minimizar(id); else focar(id);
}
function mostrarDesktop() {
  APPS.forEach(a => { if (jan[a.id].classList.contains('aberta')) minimizar(a.id); });
  foco = null; fecharMenus(); atualizarBarra();
}
/** Atualiza o indicador (aberto) e o destaque (em foco) na barra de tarefas. */
function atualizarBarra() {
  APPS.forEach(a => {
    const b = $('#tb-' + a.id);
    b.classList.toggle('aberto', jan[a.id].classList.contains('aberta') && !jan[a.id].classList.contains('fechando'));
    b.classList.toggle('foco', foco === a.id);
  });
}

/* ---------- Montagem da interface ---------- */
const tile = a => `<span class="tile" style="background:linear-gradient(135deg,${a.cor},#0004)">${a.ico}</span>`;
APPS.forEach(a => {
  criarJanela(a);

  const at = document.createElement('button');                          // ícone da área de trabalho
  at.className = 'atalho'; at.innerHTML = tile(a) + `<span>${a.nome}</span>`;
  at.onclick = e => {
    $$('.atalho').forEach(x => x.classList.toggle('sel', x === at));
    if (e.detail === 0 || telaPequena() || matchMedia('(pointer:coarse)').matches) abrir(a.id);  // Enter ou toque
  };
  at.ondblclick = () => abrir(a.id);                                    // duplo clique abre
  $('#icones').append(at);

  const tb = document.createElement('button');                          // ícone fixado na barra
  tb.className = 'tb'; tb.id = 'tb-' + a.id; tb.title = a.nome; tb.innerHTML = tile(a);
  tb.onclick = () => alternar(a.id);
  $('#tb-apps').append(tb);

  const mi = document.createElement('button');                          // item do menu iniciar
  mi.className = 'mi-item'; mi.dataset.nome = a.nome.toLowerCase(); mi.innerHTML = tile(a) + `<span>${a.nome}</span>`;
  mi.onclick = () => abrir(a.id);
  $('#mi-lista').append(mi);
});
desk.addEventListener('pointerdown', e => { if (e.target === desk || e.target.id === 'icones') $$('.atalho').forEach(x => x.classList.remove('sel')); });
$('#mostrar-desk').onclick = mostrarDesktop;

/* ---------- Menu iniciar, calendário e desligar ---------- */
const menu = $('#menu-iniciar'), cal = $('#calendario');
function fecharMenus() { menu.hidden = true; cal.hidden = true; }
$('#btn-iniciar').onclick = () => {
  const abrirMenu = menu.hidden; fecharMenus(); menu.hidden = !abrirMenu;
  if (abrirMenu) { $('#busca').value = ''; filtrar(); $('#busca').focus(); }
};
/** Esconde os apps que não combinam com o texto pesquisado. */
function filtrar() {
  const q = $('#busca').value.trim().toLowerCase();
  $$('.mi-item').forEach(i => i.hidden = !i.dataset.nome.includes(q));
}
$('#busca').oninput = filtrar;
$('#busca').onkeydown = e => { if (e.key === 'Enter') { const p = $('.mi-item:not([hidden])'); if (p) p.click(); } };
document.addEventListener('pointerdown', e => {                         // clicar fora fecha os menus
  if (!menu.hidden && !menu.contains(e.target) && !$('#btn-iniciar').contains(e.target)) menu.hidden = true;
  if (!cal.hidden && !cal.contains(e.target) && !$('#relogio-bar').contains(e.target)) cal.hidden = true;
});

let mesCal = new Date(); mesCal.setDate(1);
/** Desenha o calendário do mês atual (com botões para navegar). */
function desenharCalendario() {
  const hoje = new Date(), ano = mesCal.getFullYear(), mes = mesCal.getMonth();
  let h = `<div class="cal-topo"><button data-m="-1">‹</button><b>${mesCal.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b><button data-m="1">›</button></div><div class="cal-g">`
    + [...'DSTQQSS'].map(x => `<i>${x}</i>`).join('') + '<span></span>'.repeat(mesCal.getDay());
  for (let d = 1; d <= new Date(ano, mes + 1, 0).getDate(); d++)
    h += `<span class="${d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear() ? 'hoje' : ''}">${d}</span>`;
  cal.innerHTML = h + '</div>';
}
$('#relogio-bar').onclick = () => {
  const abrirCal = cal.hidden; fecharMenus(); cal.hidden = !abrirCal;
  if (abrirCal) { mesCal = new Date(); mesCal.setDate(1); desenharCalendario(); }
};
cal.onclick = e => { const m = e.target.closest('[data-m]'); if (m) { mesCal.setMonth(mesCal.getMonth() + +m.dataset.m); desenharCalendario(); } };

/** Desligar simulado: fecha tudo e mostra tela preta até clicar. */
$('#desligar').onclick = () => {
  APPS.forEach(a => jan[a.id].classList.remove('aberta', 'minimizada', 'maximizada'));
  foco = null; atualizarBarra(); fecharMenus(); $('#tela-off').hidden = false;
};
$('#tela-off').onclick = () => { $('#tela-off').hidden = true; };

/* ---------- Relógio do sistema (área de trabalho, barra e app Relógio) ---------- */
function tick() {
  const d = new Date(), h = d.getHours();
  let dt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  dt = dt[0].toUpperCase() + dt.slice(1);
  $('#bv-sau').textContent = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + '! Bem-vindo ao seu painel.';
  $('#bv-hora').textContent = hhmm(d); $('#bv-data').textContent = dt;
  $('#tb-hora').textContent = hhmm(d); $('#tb-data').textContent = d.toLocaleDateString('pt-BR');
  $('#r-h').textContent = d.toLocaleTimeString('pt-BR'); $('#r-d').textContent = dt;
}
tick(); setInterval(tick, 1000);

/* =========================================================
   APP 1: CALCULADORA (com porcentagem e histórico)
   ========================================================= */
let cAt = '0', cAnt = null, cOp = null, cNovo = false, cErro = false, cHist = [];
const cSim = { '+': '+', '-': '−', '*': '×', '/': '÷' }, virg = s => s.replace('.', ',');
const cFmt = n => String(Math.round(n * 1e10) / 1e10);

function cVer() {
  $('#c-val').textContent = cErro ? 'Erro' : virg(cAt);
  $('#c-exp').textContent = cErro ? 'Divisão por zero' : cOp ? virg(cAnt) + ' ' + cSim[cOp] : '';
}
function cLimpa() { cAt = '0'; cAnt = cOp = null; cNovo = cErro = false; cVer(); }
function cDig(d) {                                                      // dígito ou ponto decimal
  if (cErro) cLimpa();
  if (cNovo) { cAt = d === '.' ? '0.' : d; cNovo = false; }
  else if (d === '.') { if (!cAt.includes('.')) cAt += '.'; }
  else if (cAt === '0') cAt = d;
  else if (cAt.length < 15) cAt += d;
  cVer();
}
function cApaga() {                                                     // apaga o último dígito
  if (cErro) return cLimpa();
  if (cNovo) return;
  cAt = cAt.length === 1 || (cAt.length === 2 && cAt[0] === '-') ? '0' : cAt.slice(0, -1); cVer();
}
function cConta() {                                                     // faz a conta pendente
  const a = +cAnt, b = +cAt;
  if (cOp === '/' && b === 0) return null;
  return cFmt(cOp === '+' ? a + b : cOp === '-' ? a - b : cOp === '*' ? a * b : a / b);
}
function cOperador(o) {
  if (cErro) cLimpa();
  if (cOp && !cNovo) { const r = cConta(); if (r === null) { cErro = true; cOp = null; return cVer(); } cAt = r; }
  cAnt = cAt; cOp = o; cNovo = true; cVer();
}
function cIgual() {                                                     // resultado + histórico
  if (!cOp) return;
  const exp = `${virg(cAnt)} ${cSim[cOp]} ${virg(cAt)}`, r = cConta();
  if (r === null) cErro = true;
  else { cAt = r; cHist.unshift(`${exp} = ${virg(r)}`); cHist = cHist.slice(0, 30); cMostraHist(); }
  cOp = cAnt = null; cNovo = true; cVer();
}
function cPct() {                                                       // 50 + 10 % = 5 ; 50 % = 0,5
  if (cErro) return;
  cAt = cFmt(cOp ? (+cAnt) * (+cAt) / 100 : (+cAt) / 100); cNovo = true; cVer();
}
function cSinal() { if (!cErro && cAt !== '0') { cAt = cAt[0] === '-' ? cAt.slice(1) : '-' + cAt; cVer(); } }
function cMostraHist() {
  $('#c-hist').innerHTML = '';
  cHist.forEach(t => { const li = document.createElement('li'); li.textContent = t; $('#c-hist').append(li); });
}
function cTecla(k) {
  if (/^\d$/.test(k)) cDig(k); else if (k === ',') cDig('.');
  else if ('÷×−+'.includes(k)) cOperador({ '÷': '/', '×': '*', '−': '-', '+': '+' }[k]);
  else if (k === 'C') cLimpa(); else if (k === '⌫') cApaga(); else if (k === '=') cIgual();
  else if (k === '%') cPct(); else if (k === '±') cSinal();
}
['%', 'C', '⌫', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', ',', '='].forEach(k => {
  const b = document.createElement('button');
  b.textContent = k; b.className = 'k' + ('÷×−+'.includes(k) ? ' op' : k === '=' ? ' ig' : '%C⌫'.includes(k) ? ' ac' : '');
  b.onclick = () => cTecla(k); $('#c-teclas').append(b);
});
$('#c-lh').onclick = () => { cHist = []; cMostraHist(); };
document.addEventListener('keydown', e => {                             // teclado só vale com a calculadora em foco
  if (!$('#tela-off').hidden) { $('#tela-off').hidden = true; return; }
  if (e.key === 'Escape') { fecharMenus(); }
  if (foco !== 'calc') return;
  const k = e.key;
  if (/^\d$/.test(k)) cDig(k); else if (k === '.' || k === ',') cDig('.');
  else if ('+-*/'.includes(k)) { e.preventDefault(); cOperador(k); }
  else if (k === 'Enter' || k === '=') { e.preventDefault(); cIgual(); }
  else if (k === 'Backspace') cApaga(); else if (k === '%') cPct();
  else if (k === 'Escape' || k.toLowerCase() === 'c') cLimpa();
});
cVer();

/* =========================================================
   APP 2: TAREFAS  { id, texto, ok }  salvas em JSON
   ========================================================= */
let tarefas = lerJSON('painel:tarefas', []);
const tSalvar = () => salvar('painel:tarefas', JSON.stringify(tarefas));
function tMostrar() {
  const ul = $('#t-lista'); ul.innerHTML = '';
  tarefas.forEach(t => {
    const li = document.createElement('li'); li.className = 'tarefa' + (t.ok ? ' ok' : '');
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = t.ok;
    c.onchange = () => { t.ok = !t.ok; tSalvar(); tMostrar(); };
    const s = document.createElement('span'); s.textContent = t.texto;   // textContent evita injeção de HTML
    const x = document.createElement('button'); x.textContent = '🗑️'; x.title = 'Excluir';
    x.onclick = () => { tarefas = tarefas.filter(o => o.id !== t.id); tSalvar(); tMostrar(); };
    li.append(c, s, x); ul.append(li);
  });
  const p = tarefas.filter(t => !t.ok).length;
  $('#t-cont').textContent = p === 0 ? 'Nenhuma tarefa pendente' : p === 1 ? '1 tarefa pendente' : p + ' tarefas pendentes';
  $('#t-vazio').hidden = tarefas.length > 0;
  $('#t-lc').hidden = !tarefas.some(t => t.ok);
}
function tAdicionar() {
  const texto = $('#t-texto').value.trim();
  if (!texto) { $('#t-erro').textContent = 'Digite o nome da tarefa.'; return; }
  $('#t-erro').textContent = '';
  tarefas.push({ id: Date.now(), texto, ok: false });
  $('#t-texto').value = ''; tSalvar(); tMostrar();
}
$('#t-add').onclick = tAdicionar;
$('#t-texto').onkeydown = e => { if (e.key === 'Enter') tAdicionar(); };
$('#t-lc').onclick = () => { tarefas = tarefas.filter(t => !t.ok); tSalvar(); tMostrar(); };
tMostrar();

/* =========================================================
   APP 3: BLOCO DE NOTAS (várias anotações + salvamento automático)
   ========================================================= */
let notas = lerJSON('painel:notas2', null) || [{ texto: ler('painel:notas') || '' }], nAt = 0, nTimer;
const nTitulo = (n, i) => `${i + 1}. ${(n.texto.split('\n')[0].trim() || 'Sem título').slice(0, 26)}`;
function nMostra() {                                                    // preenche a lista e o texto
  const s = $('#n-sel'); s.innerHTML = '';
  notas.forEach((n, i) => s.add(new Option(nTitulo(n, i), i)));
  s.value = nAt; $('#n-txt').value = notas[nAt].texto;
}
function nGrava(msg) {
  salvar('painel:notas2', JSON.stringify(notas));
  $('#n-status').textContent = (msg || 'Salvo às ' + hhmm(new Date())) + ' · ' + notas[nAt].texto.length + ' caracteres';
}
$('#n-txt').oninput = () => {                                           // salva 0,5 s depois de parar de digitar
  notas[nAt].texto = $('#n-txt').value; $('#n-status').textContent = 'Salvando...';
  clearTimeout(nTimer);
  nTimer = setTimeout(() => { nGrava(); $('#n-sel').options[nAt].text = nTitulo(notas[nAt], nAt); }, 500);
};
$('#n-salvar').onclick = () => { clearTimeout(nTimer); notas[nAt].texto = $('#n-txt').value; nGrava(); nMostra(); };
$('#n-novo').onclick = () => { notas.push({ texto: '' }); nAt = notas.length - 1; nGrava('Nova anotação'); nMostra(); $('#n-txt').focus(); };
$('#n-sel').onchange = e => { nAt = +e.target.value; nMostra(); nGrava('Anotação aberta'); };
$('#n-limpar').onclick = () => {
  if (notas[nAt].texto && !confirm('Limpar o conteúdo desta anotação?')) return;
  notas[nAt].texto = ''; nGrava('Conteúdo limpo'); nMostra();
};
nMostra();

/* =========================================================
   APP 4: CONVERSOR  C = (F - 32) * 5/9   |   F = C * 9/5 + 32
   ========================================================= */
const num = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function converter() {
  const txt = $('#cv-v').value.trim().replace(',', '.'), v = Number(txt), r = $('#cv-r');
  if (txt === '' || !Number.isFinite(v)) { r.className = 'res erro'; r.textContent = 'Digite um número válido.'; return; }
  r.className = 'res ok';
  r.textContent = $('#cv-u').value === 'C' ? `${num(v)} °C = ${num(v * 9 / 5 + 32)} °F` : `${num(v)} °F = ${num((v - 32) * 5 / 9)} °C`;
}
$('#cv-b').onclick = converter;
$('#cv-v').onkeydown = e => { if (e.key === 'Enter') converter(); };

/* =========================================================
   APP 5: EXPLORADOR DE ARQUIVOS (pastas simuladas na memória + LocalStorage)
   Cada pasta: { nome, filhos: [pastas] }   cam = caminho atual (nomes)
   ========================================================= */
let raiz = lerJSON('painel:fs', null) || { filhos: ['Documentos', 'Imagens', 'Downloads'].map(n => ({ nome: n, filhos: [] })) };
let cam = [], fsSel = null;
const pastaAtual = () => cam.reduce((p, n) => p.filhos.find(f => f.nome === n), raiz);
const fsSalvar = () => salvar('painel:fs', JSON.stringify(raiz));
function fsMostrar() {
  const p = pastaAtual(), L = $('#f-lista'); fsSel = null;
  $('#f-end').textContent = ['Este Computador', ...cam].join('  ›  '); $('#f-erro').textContent = '';
  L.innerHTML = '';
  p.filhos.forEach(f => {
    const b = document.createElement('button'); b.className = 'pasta'; b.innerHTML = '<span>📁</span>';
    const s = document.createElement('small'); s.textContent = f.nome; b.append(s);
    b.onclick = () => { fsSel = f.nome; $$('.pasta').forEach(x => x.classList.toggle('sel', x === b)); };
    b.ondblclick = () => { cam.push(f.nome); fsMostrar(); };
    L.append(b);
  });
  if (!p.filhos.length) L.innerHTML = '<p class="suave">Esta pasta está vazia.</p>';
  const lat = $('#f-lat'); lat.innerHTML = '';                          // painel lateral de acesso rápido
  [['🖥️ Este Computador', []], ...raiz.filhos.map(f => ['📁 ' + f.nome, [f.nome]])].forEach(([t, c]) => {
    const b = document.createElement('button'); b.textContent = t; b.className = cam.join('/') === c.join('/') ? 'on' : '';
    b.onclick = () => { cam = c; fsMostrar(); }; lat.append(b);
  });
}
$('#f-sobe').onclick = () => { cam.pop(); fsMostrar(); };
$('#f-abre').onclick = () => { if (fsSel) { cam.push(fsSel); fsMostrar(); } };
$('#f-del').onclick = () => {
  if (!fsSel) { $('#f-erro').textContent = 'Selecione uma pasta para excluir.'; return; }
  if (!confirm(`Excluir a pasta "${fsSel}" e tudo dentro dela?`)) return;
  const p = pastaAtual(); p.filhos = p.filhos.filter(f => f.nome !== fsSel); fsSalvar(); fsMostrar();
};
function fsNova() {
  const nome = $('#f-nome').value.trim(), p = pastaAtual();
  if (!nome) { $('#f-erro').textContent = 'Digite um nome para a pasta.'; return; }
  if (p.filhos.some(f => f.nome.toLowerCase() === nome.toLowerCase())) { $('#f-erro').textContent = 'Já existe uma pasta com esse nome.'; return; }
  p.filhos.push({ nome, filhos: [] }); $('#f-nome').value = ''; fsSalvar(); fsMostrar();
}
$('#f-nova').onclick = fsNova;
$('#f-nome').onkeydown = e => { if (e.key === 'Enter') fsNova(); };
fsMostrar();

/* =========================================================
   APP 6: RELÓGIO (hora/data são atualizadas em tick(), acima)
   Abas + cronômetro + temporizador
   ========================================================= */
$$('.abas button').forEach(b => b.onclick = () => {
  $$('.abas button').forEach(x => x.classList.toggle('on', x === b));
  $$('.aba').forEach(p => p.hidden = p.id !== b.dataset.aba);
});

// Cronômetro: soma o tempo já corrido (crAc) com o tempo desde o último "Iniciar"
let crAc = 0, crIni = 0, crInt = null;
function crFmt(ms) {
  const t = Math.floor(ms / 100), p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 36000))}:${p(Math.floor(t / 600) % 60)}:${p(Math.floor(t / 10) % 60)}.${t % 10}`;
}
$('#cr-ini').onclick = () => {
  if (crInt) { crAc += Date.now() - crIni; clearInterval(crInt); crInt = null; $('#cr-ini').textContent = 'Continuar'; }
  else {
    crIni = Date.now(); $('#cr-ini').textContent = 'Pausar';
    crInt = setInterval(() => $('#cr-v').textContent = crFmt(crAc + Date.now() - crIni), 50);
  }
};
$('#cr-rst').onclick = () => { clearInterval(crInt); crInt = null; crAc = 0; $('#cr-v').textContent = crFmt(0); $('#cr-ini').textContent = 'Iniciar'; };

// Temporizador: guarda o instante final (tFim) e calcula o que falta
let tRest = null, tFim = 0, tInt = null;
const tLer = () => (Math.max(0, +$('#tp-m').value || 0) * 60 + Math.min(59, Math.max(0, +$('#tp-s').value || 0))) * 1000;
const tMostra = ms => { const s = Math.ceil(ms / 1000); $('#tp-v').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function beep() { try { const c = new AudioContext(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + .6); } catch (e) {} }
$('#tp-ini').onclick = () => {
  if (tInt) { tRest = tFim - Date.now(); clearInterval(tInt); tInt = null; $('#tp-ini').textContent = 'Continuar'; return; }
  if (tRest === null) tRest = tLer();
  if (tRest <= 0) { tRest = null; return; }
  $('#tp-msg').textContent = ''; tFim = Date.now() + tRest; $('#tp-ini').textContent = 'Pausar';
  tInt = setInterval(() => {
    const r = tFim - Date.now();
    if (r > 0) return tMostra(r);
    clearInterval(tInt); tInt = null; tRest = null; tMostra(0);
    $('#tp-msg').textContent = '⏰ Tempo esgotado!'; $('#tp-ini').textContent = 'Iniciar'; beep();
  }, 200);
};
$('#tp-rst').onclick = () => { clearInterval(tInt); tInt = null; tRest = null; $('#tp-msg').textContent = ''; tMostra(tLer()); $('#tp-ini').textContent = 'Iniciar'; };
['#tp-m', '#tp-s'].forEach(s => $(s).oninput = () => { if (!tInt && tRest === null) tMostra(tLer()); });
tMostra(tLer());
