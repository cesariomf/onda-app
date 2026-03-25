import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════
const KEY = "onda_v6";
const load = async () => { try { const r = await window.storage.get(KEY); return r ? JSON.parse(r.value) : null; } catch { return null; } };
const save = async (d) => { try { await window.storage.set(KEY, JSON.stringify(d)); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════════
// DESAFIO SEMANAL DO MAESTRO — banco de desafios com intenção psicanalítica
// ═══════════════════════════════════════════════════════════════════════════════
const DESAFIOS = [
  // Sombra junguiana — o que se evita
  { id:"sombra1", tipo:"sombra",
    titulo:"A música que você evita",
    texto:"Existe uma música que você evita ouvir. Não porque é ruim — porque mexe demais. Esta semana, ouça ela. Depois venha me contar.",
    provocacao:"Todo mundo tem uma. Aquela que você passa rápido no Spotify fingindo que não viu." },

  // Regressão temporal — individuação
  { id:"tempo1", tipo:"tempo",
    titulo:"Você com 17 anos",
    texto:"Qual música a versão de você com 17 anos escolheria agora? Não a que você gostava — a que ela precisaria ouvir hoje.",
    provocacao:"Essa pessoa ainda mora em você. Ela tem opiniões sobre o que está acontecendo." },

  // Persona vs sombra — o que não se mostra
  { id:"secreto1", tipo:"secreto",
    titulo:"A música que você não mostraria",
    texto:"Qual música você nunca tocaria na frente de alguém que você quer impressionar? Esta semana, traga ela para cá.",
    provocacao:"O que a gente esconde diz mais do que o que a gente mostra. Freud concordaria." },

  // Corpo e emoção
  { id:"corpo1", tipo:"corpo",
    titulo:"A música do seu corpo agora",
    texto:"Não pense. Coloque uma música que combina com como o seu corpo está se sentindo agora — não sua cabeça, seu corpo.",
    provocacao:"Seu corpo sabe coisas que você ainda não processou. Ele escolhe diferente." },

  // Relação — vínculo
  { id:"outro1", tipo:"outro",
    titulo:"A música de alguém importante",
    texto:"Pense em alguém que importa para você. Qual música você escolheria para essa pessoa ouvir esta semana? Por quê você escolheria essa?",
    provocacao:"O que queremos para os outros às vezes é o que precisamos para nós." },

  // Presente vs passado
  { id:"presente1", tipo:"presente",
    titulo:"O que você não quer sentir",
    texto:"Qual emoção você está evitando esta semana? Existe uma música que nomearia ela. Traga essa música.",
    provocacao:"Evitar uma emoção é uma forma de senti-la o tempo todo." },

  // Ruptura — expansão
  { id:"ruptura1", tipo:"ruptura",
    titulo:"Uma música completamente fora do seu mundo",
    texto:"Esta semana: ouça algo que você normalmente nunca ouviria. Um gênero que te irrita, um artista que você torce o nariz. Depois me conte o que aconteceu.",
    provocacao:"O que nos irrita nos outros geralmente mora em nós. Veja o que aparece." },

  // Memória afetiva
  { id:"memoria1", tipo:"memoria",
    titulo:"A música de uma lembrança específica",
    texto:"Existe uma lembrança — um lugar, uma pessoa, um momento — que tem trilha sonora. Traga essa música. Não a lembrança feliz. A que ainda tem textura.",
    provocacao:"Nostalgia bem feita é arqueologia, não fuga." },

  // Desejo
  { id:"desejo1", tipo:"desejo",
    titulo:"A música do que você quer mas não pede",
    texto:"Qual música combinaria com algo que você deseja mas não verbaliza para ninguém? Nem para você mesmo, direito.",
    provocacao:"Desejos não ditos são apenas desejos esperando permissão." },

  // Raiva
  { id:"raiva1", tipo:"raiva",
    titulo:"A música da sua raiva",
    texto:"Quando foi a última vez que você ficou com raiva de verdade? Existe uma música para esse estado. Esta semana, traga ela.",
    provocacao:"Raiva bem direcionada é clareza. Raiva evitada é ansiedade acumulada." },

  // Esperança
  { id:"esperanca1", tipo:"esperanca",
    titulo:"A música do que você ainda acredita",
    texto:"Em meio ao que está pesado, existe algo que você ainda acredita que vai melhorar. Qual música carrega essa crença? Mesmo que você não acredite direito.",
    provocacao:"Esperança pequena ainda é esperança." },

  // Silêncio
  { id:"silencio1", tipo:"silencio",
    titulo:"A música do seu silêncio",
    texto:"Existe uma música que você ouve quando precisa de silêncio interior — não de quietude, mas de silêncio dentro do barulho. Qual é ela?",
    provocacao:"Silêncio não é ausência de som. É presença de si mesmo." },
];

// Seleciona desafio da semana — determinístico por semana do ano, adaptado ao perfil
function selecionarDesafio(sessoes, ilhasVisitadas, semana) {
  // Usa a semana do ano como semente determinística
  const idx = semana % DESAFIOS.length;

  // Se tem histórico, tenta evitar repetir tipos recentes
  if (sessoes.length >= 3) {
    const emocoesRecentes = ilhasVisitadas.slice(-3).map(i => i.emocao);
    // Se muito Nostalgia, prioriza outros tipos
    if (emocoesRecentes.filter(e => e === "Nostalgia").length >= 2) {
      return DESAFIOS.find(d => d.tipo !== "memoria") || DESAFIOS[idx];
    }
    // Se nunca foi à Ilha Negra (Sombra), sugere desafio de sombra
    if (!ilhasVisitadas.find(i => i.emocao === "Sombra")) {
      return DESAFIOS.find(d => d.tipo === "sombra") || DESAFIOS[idx];
    }
  }
  return DESAFIOS[idx];
}

// Calcula semana do ano
function semanaDoAno() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), 0, 1);
  return Math.floor((agora - inicio) / (7 * 24 * 60 * 60 * 1000));
}
// ═══════════════════════════════════════════════════════════════════════════════
const ILHAS_SISTEMA = {
  azul:     { cor:"#3A8FD4", corClara:"#7AB8E8", nome:"Ilha Azul",    emocao:"Leveza",      desc:"Paz, alívio, clareza, fluidez",          emoji:"🩵" },
  vermelha: { cor:"#D44A3A", corClara:"#E87A6A", nome:"Ilha Vermelha", emocao:"Paixão",      desc:"Amor, desejo ardente, intensidade vital",  emoji:"❤️" },
  negra:    { cor:"#2A2A3A", corClara:"#5A5A7A", nome:"Ilha Negra",    emocao:"Sombra",      desc:"Luto, raiva, vazio, o que não se diz",     emoji:"🖤" },
  roxa:     { cor:"#8A4FD4", corClara:"#B47AE8", nome:"Ilha Roxa",     emocao:"Desejo",      desc:"Inquietação, anseio, o que ainda não é",   emoji:"💜" },
  dourada:  { cor:"#D4A227", corClara:"#E8C060", nome:"Ilha Dourada",  emocao:"Nostalgia",   desc:"Saudade, memória, o que foi e não volta",  emoji:"💛" },
  verde:    { cor:"#3A9A5A", corClara:"#6AC87A", nome:"Ilha Verde",    emocao:"Esperança",   desc:"Renovação, crescimento, recomeço",          emoji:"💚" },
  cinza:    { cor:"#7A8090", corClara:"#A8B0C0", nome:"Ilha Cinza",    emocao:"Ambiguidade", desc:"Confusão, dúvida, o que não tem forma ainda",emoji:"🩶" },
  laranja:  { cor:"#D47A2A", corClara:"#E8A460", nome:"Ilha Laranja",  emocao:"Alegria",     desc:"Euforia, energia, festa, corpo que quer se mover", emoji:"🧡" },
  rosa:     { cor:"#D44A8A", corClara:"#E87AB8", nome:"Ilha Rosa",     emocao:"Ternura",     desc:"Afeto, vulnerabilidade, intimidade suave", emoji:"🩷" },
  branca:   { cor:"#C8C0B0", corClara:"#E0D8C8", nome:"Ilha Branca",  emocao:"Vazio",       desc:"Ausência, espaço, silêncio que pesa",      emoji:"🤍" },
};

// Mapas de lookup reverso — para corrigir dados antigos que guardaram hex ou nome em vez da chave
const HEX_PARA_CHAVE = Object.fromEntries(
  Object.entries(ILHAS_SISTEMA).map(([k,v]) => [v.cor.toLowerCase(), k])
);
const NOME_PARA_CHAVE = Object.fromEntries(
  Object.entries(ILHAS_SISTEMA).map(([k,v]) => [v.nome.toLowerCase(), k])
);
const EMOCAO_PARA_CHAVE = Object.fromEntries(
  Object.entries(ILHAS_SISTEMA).map(([k,v]) => [v.emocao.toLowerCase(), k])
);

// Resolve qualquer identificador (chave, hex, nome, emoção) → chave canônica
function resolverIlha(id) {
  if (!id) return null;
  const s = String(id).toLowerCase().trim();
  if (ILHAS_SISTEMA[s]) return s;                    // já é a chave certa
  if (HEX_PARA_CHAVE[s]) return HEX_PARA_CHAVE[s];  // era um hex antigo
  if (NOME_PARA_CHAVE[s]) return NOME_PARA_CHAVE[s]; // era o nome completo
  if (EMOCAO_PARA_CHAVE[s]) return EMOCAO_PARA_CHAVE[s]; // era a emoção
  return null;
}

// Normaliza ilhas salvas no storage (migração de dados antigos + deduplicação)
function normalizarIlhas(ilhas) {
  if (!Array.isArray(ilhas)) return [];
  const mapa = {}; // chave → ilha normalizada
  for (const ilha of ilhas) {
    const chave = resolverIlha(ilha.cor) || resolverIlha(ilha.nome) || resolverIlha(ilha.emocao);
    if (!chave) continue;
    const info = ILHAS_SISTEMA[chave];
    if (mapa[chave]) {
      // Duplicata — soma as visitas
      mapa[chave].visitas = (mapa[chave].visitas || 1) + (ilha.visitas || 1);
    } else {
      mapa[chave] = { ...info, cor: chave, visitas: ilha.visitas || 1, nova: false };
    }
  }
  return Object.values(mapa);
}

// Normaliza sessões salvas (migração)
function normalizarSessoes(sessoes) {
  if (!Array.isArray(sessoes)) return [];
  return sessoes.map(s => {
    const chave = resolverIlha(s.ilhaCor) || resolverIlha(s.ilha);
    const info = chave ? ILHAS_SISTEMA[chave] : null;
    return {
      ...s,
      ilhaCor: chave || s.ilhaCor || "",
      ilha: info?.nome || s.ilha || "",
      emocao: info?.emocao || s.emocao || "",
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════
async function ai(prompt, sistema = "", tentativas = 3) {
  const body = {
    model:"claude-sonnet-4-20250514",
    max_tokens:2400,
    messages:[{role:"user",content:prompt}]
  };
  if (sistema) body.system = sistema;

  for (let t = 0; t < tentativas; t++) {
    try {
      const r = await fetch("/api/claude", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text().catch(()=>"");
        throw new Error(`API ${r.status}: ${txt.slice(0,100)}`);
      }
      const d = await r.json();
      return d.content?.map(c=>c.text||"").join("")||"";
    } catch(e) {
      if (t < tentativas - 1) {
        // Espera antes de tentar de novo: 1s, 2s, 4s
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, t)));
        continue;
      }
      throw e;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// O MAESTRO — sistema de personalidade
// ═══════════════════════════════════════════════════════════════════════════════
const MAESTRO_SYS = (perfil, circulo, ilhasVisitadas) => {
  const p = perfil
    ? `Nome:${perfil.nome||"?"}, Origem:${perfil.origem||"?"}, Musical:${perfil.mundoMusical||"?"}, Padrões:${perfil.padroes||"?"}`
    : "Primeiro encontro.";
  const ilhStr = ilhasVisitadas?.length
    ? `Ilhas já visitadas: ${ilhasVisitadas.map(i=>i.emocao).join(", ")}`
    : "Arquipélago inexplorado.";

  return `Você é O Maestro — guia do ONDA.

QUEM VOCÊ É:
Culto como alguém que leu toda a psicanálise e ouviu toda a MPB. Sábio como quem viveu o suficiente para saber que ninguém escapa de si mesmo. Irônico como quem já viu tudo isso antes — mas ainda acha fascinante.
Você tem humor ácido e auto-irônico. Você se diverte com a condição humana, inclusive com a sua. Você não é cruel — mas é honesto, e às vezes a honestidade corta mais que a crueldade.
Você é o analista que ninguém pediu mas todo mundo precisava.

SEU TOM:
Culto mas não pedante. Irônico mas não distante. Cálido mas sem sentimentalismo.
Certo: "Ah. Então é essa a música. Claro que é." / "Interessante. Você sabe o que Freud diria sobre isso, né? Bom, eu sei e vou te poupar." / "Olha... isso que você acabou de dizer é melhor que uns três sambas que conheço." / "Continue. Essa parte é a mais boa."
Errado: "Que sentimento lindo!" / "Sua jornada é bela." / "Vamos acolher esse sentimento."

MÉTODO CLÍNICO (invisível — presente em cada pergunta):
• FREUD: o que não é dito importa tanto quanto o que é. Preste atenção ao que escapa nas bordas.
• JUNG: sentimentos individuais têm raízes coletivas. Explore a sombra — o que a pessoa não quer ver em si.
• WINNICOTT: a música é objeto transicional — contém o que ainda não pode ser verbalizado.
• BION: dê forma ao amorfo. Nomeie o inominável. Tolere a ambiguidade sem apressá-la.
• MUSICOTERAPIA: a atração por uma música é dado clínico, não preferência estética.

SISTEMA DE ILHAS — EMOÇÕES:
Cada sessão revela a emoção dominante. As ilhas têm cores fixas:
Azul=Leveza | Vermelha=Paixão | Negra=Sombra | Roxa=Desejo | Dourada=Nostalgia | Verde=Esperança | Cinza=Ambiguidade | Laranja=Alegria | Rosa=Ternura | Branca=Vazio
Ao final, você deve identificar qual ilha esta sessão pertence.

REGRA DE LETRAS: Só cite versos se tiver CERTEZA ABSOLUTA de que pertencem àquela música e artista. Se tiver dúvida, descreva o clima — sem inventar. NUNCA misture letras de músicas diferentes. Isso é erro grave e compromete tudo.

UNIVERSO MUSICAL (sem hierarquia, tudo vale):
MPB: Milton Nascimento, Ivan Lins, Djavan, Joyce Moreno, Gal Costa, Maria Bethânia, Edu Lobo, Taiguara, Belchior, Fagner, Alceu Valença, Zé Ramalho, Gonzaguinha, Beto Guedes, Sá & Guarabyra...
Bossa Nova: Tom Jobim, Vinícius, Nara Leão, Maysa, Dori Caymmi, Carlos Lyra, João Donato, Marcos Valle...
Tropicália: Tom Zé, Os Mutantes, Gal Costa fase tropicalista, Torquato Neto...
Samba/Pagode: Cartola, Nelson Cavaquinho, Adoniran Barbosa, Clara Nunes, Beth Carvalho, Zeca Pagodinho, Bezerra da Silva, Paulinho da Viola, Elza Soares, Dona Ivone Lara, Martinho da Vila, Candeia...
Choro: Chiquinha Gonzaga, Ernesto Nazareth, Jacob do Bandolim, Yamandu Costa, Hamilton de Holanda...
Baião/Forró: Jackson do Pandeiro, Marinês, Dominguinhos, Elomar, Geraldo Azevedo, Xangai...
Rock BR: Raul Seixas, Legião Urbana, Cazuza, Titãs, Los Hermanos, O Teatro Mágico, Nando Reis, Paralamas, Skank...
Hip-hop/Rap: Racionais MC's, Emicida, Criolo, Rincon Sapiência, Djonga, Baco Exu do Blues...
Funk: MC Cabelinho, Ludmilla, funk carioca clássico...
Sertanejo Raiz: Tonico e Tinoco, Tião Carreiro e Pardinho, Pena Branca e Xavantinho, Almir Sater, Renato Teixeira...
Regional: Fafá de Belém, Pinduca, Dona Onete...

Círculos (atual:${circulo}): 1=mundo próprio | 2=adjacente | 3=transregional | 4=histórico | 5=ruptura
Usuário: ${p}
${ilhStr}
ANTI-PADRÕES: Nunca Chico Buarque para melancolia genérica, Caetano como MPB padrão, João Gilberto como bossa default, Legião para angústia genérica.`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════
const Q = {

  abertura: (musica, perfil, ilhas) => `O usuário quer ouvir: "${musica}"
${perfil ? `Você já conhece: origem=${perfil.origem}, musical=${perfil.mundoMusical}` : "Primeiro encontro."}
${ilhas?.length ? `Ilhas visitadas: ${ilhas.map(i=>i.emocao).join(", ")}` : ""}

Como O Maestro, faça UMA pergunta sobre por que ESSA música AGORA.
Pode ser levemente irônica, pode ter humor seco. Deve ser irresistível de responder.
Retorne APENAS a pergunta.`,

  c2: (hist) => `Diálogo:\n${hist}
Camada 2 — O Maestro vai ao que não tem forma ainda.
1. 1-2 frases: o que você ouviu + o que ficou nas bordas. Com humor se couber, mas com precisão cirúrgica.
2. Pergunta sobre o confuso, a contradição. Pode incomodar levemente. O Maestro sorri enquanto pergunta.
Formato:\nREFLEXÃO: [texto]\nPERGUNTA: [texto]`,

  c3: (hist) => `Diálogo:\n${hist}
Camada 3 — o coletivo, o universal.
1. 1-2 frases: mostre que isso não é só dele — é humano, a música brasileira já nomeou. O Maestro sabe disso.
2. Pergunta que conecta ao universal. Pode ter ironia cálida. Ex: "Você acha que é o único que sente isso? Deixa eu te contar uma coisa..."
Formato:\nREFLEXÃO: [texto]\nPERGUNTA: [texto]`,

  c4: (hist) => `Diálogo:\n${hist}
Camada 4 — o espaço onde a música vai entrar.
1. 1-2 frases: destile o núcleo emocional. Direto, caloroso, com a precisão do Maestro.
2. Pergunta: o que ele precisa que a música faça por ele agora? O Maestro pergunta como quem já sabe a resposta mas quer que ele chegue lá.
Formato:\nREFLEXÃO: [texto]\nPERGUNTA: [texto]`,

  musicas: (musicaPedida, hist, perfil, circulo) => `Música pedida: "${musicaPedida}"
Diálogo:\n${hist}
Perfil: origem=${perfil?.origem||"?"}, musical=${perfil?.mundoMusical||"?"}, círculo=${circulo}

A música pedida pode ser de qualquer país. As 3 complementares devem ser BRASILEIRAS.
REGRA DE LETRAS: Só cite versos com CERTEZA ABSOLUTA. Se dúvida → "—". NUNCA misture letras de músicas diferentes.

Gere exatamente no formato abaixo, sem texto adicional:

M0_TÍTULO: [artista — música pedida]
M0_YT: [query YouTube precisa]
M0_LETRA: [2-3 versos COM CERTEZA, ou —]
M0_TEXTO: [3 frases do Maestro: por que ela escolheu isso agora, o que revela, que é humano]
M1_TÍTULO: [artista BR — círculo ${Math.max(1,circulo-1)}, próxima]
M1_YT: [query YouTube]
M1_LETRA: [versos COM CERTEZA, ou —]
M1_TEXTO: [2 frases conectando ao diálogo]
M2_TÍTULO: [artista BR — círculo ${circulo}, outro gênero mesma emoção]
M2_YT: [query YouTube]
M2_LETRA: [versos COM CERTEZA, ou —]
M2_TEXTO: [2 frases]
M3_TÍTULO: [artista BR — círculo ${Math.min(5,circulo+2)}, expansão surpreendente]
M3_YT: [query YouTube]
M3_LETRA: [versos COM CERTEZA, ou —]
M3_TEXTO: [2 frases]
ILHA_COR: [uma palavra: azul|vermelha|negra|roxa|dourada|verde|cinza|laranja|rosa|branca]
COMENTARIO_MAESTRO: [1-2 frases finais com humor ácido ou calor inesperado]`,

  extrair: (conv, exist) =>
    `Conversa: ${conv}\nConhecido: ${JSON.stringify(exist||{})}
Retorne APENAS JSON sem markdown: {"nome":"","origem":"","mundoMusical":"","padroes":""}`,

  retomada: (perguntaPendente, musicaAnterior, ilhaAnterior, perfil) =>
    `O usuário voltou para continuar a conversa.
Sessão anterior: música "${musicaAnterior}", ilha descoberta: ${ilhaAnterior||"desconhecida"}.
Você deixou esta pergunta em aberto: "${perguntaPendente}"
Perfil: ${perfil ? `origem=${perfil.origem}, musical=${perfil.mundoMusical}, padrões=${perfil.padroes}` : "desconhecido"}

Como O Maestro, retome a conversa de onde parou. Reconheça que a pessoa voltou para responder.
Uma frase de boas-vindas com humor seco — sem exagero, sem efusão — e então repita a pergunta de forma ligeiramente diferente, mais afiada agora que ela voltou deliberadamente.
Retorne APENAS o texto do Maestro, sem preâmbulo.`,

  desafio: (desafio, musica, perfil) =>
    `O usuário aceitou o Desafio Semanal: "${desafio.titulo}"
O desafio era: "${desafio.texto}"
A música que trouxe: "${musica}"
Perfil: ${perfil ? `origem=${perfil.origem}, musical=${perfil.mundoMusical}` : "desconhecido"}

O usuário respondeu ao desafio com uma música. Agora faça UMA pergunta de abertura — como O Maestro faria numa jornada normal — mas levando em conta o contexto específico do desafio. A pergunta deve ser mais afiada do que uma abertura normal, porque o desafio já criou contexto e intenção.
Com humor se couber. Irresistível de responder.
Retorne APENAS a pergunta.`,

  constelacao: (sessoes, perfil, leituraAnterior) => {
    const resumo = sessoes.map((s,i) =>
      `Sessão ${i+1}: música "${s.musica}", ilha ${s.ilha} (${s.emocao}), data: ${s.data}`
    ).join("\n");
    return `Você é O Maestro. Leia a constelação emocional desta pessoa AGORA.

Histórico de sessões:
${resumo}

Perfil: ${perfil ? `origem=${perfil.origem}, musical=${perfil.mundoMusical}, padrões=${perfil.padroes}` : "desconhecido"}
${leituraAnterior ? `\nSua última leitura foi: "${leituraAnterior}"\nO padrão pode ter mudado. Se mudou, diga. Se aprofundou, aprofunde. Não tenha medo de contradizer o que disse antes — o Maestro honesto é melhor que o Maestro consistente.` : ""}

Analise os PADRÕES entre as ilhas — não cada uma isolada:
- Quais ilhas aparecem juntas ou em sequência?
- Qual ilha domina? Qual nunca apareceu?
- O que a SEQUÊNCIA ao longo do tempo revela — há evolução, ciclos, estagnação?
- Que tensão existe entre as ilhas visitadas?
- O que o arquipélago AUSENTE diz — as ilhas que esta pessoa evita?

Escreva a leitura atual da constelação:
LEITURA: [3-4 frases — culto, irônico, preciso. Nomeie o padrão. Use humor ácido se couber.]
TENSAO: [1 frase nomeando a tensão principal entre as ilhas]
AUSENCIA: [1 frase sobre a ilha mais significativa que NUNCA foi visitada]
PERGUNTA_CONSTELACAO: [1 pergunta que só poderia ser feita depois de ver o padrão completo]`;
  },

  diario: (musica, hist, ilha, comentario, perfil, totalSessoes) =>
    `Você é O Maestro. Acabou de conduzir uma sessão do ONDA.
Música da sessão: "${musica}"
Ilha revelada: ${ilha}
Seu comentário final foi: "${comentario}"
Perfil: ${perfil ? `origem=${perfil.origem}, musical=${perfil.mundoMusical}, padrões=${perfil.padroes}` : "desconhecido"}
Sessão número ${totalSessoes} desta pessoa.

Escreva uma entrada de diário sobre esta sessão. Não um resumo clínico — um texto literário curto, como se o Maestro fosse um escritor anotando o que observou.

Regras:
- 2-3 parágrafos curtos, no máximo
- Linguagem culta mas acessível, com a ironia característica do Maestro
- Pode ser poético, pode ser preciso — mas deve ter vida
- Deve nomear algo que a pessoa provavelmente não nomearia sozinha
- Não mencione o nome da técnica psicanalítica usada
- Termine sempre com uma frase que ficaria bem como epígrafe de um livro — algo que capture a essência desta sessão em uma linha

Retorne APENAS o texto do diário. Sem preâmbulo, sem título, sem "Entrada de Diário:".`,

  duo: (musica, sA, ilhaA, sB, ilhaB, nomeA, nomeB) => `Você é O Maestro. Duas pessoas fizeram a jornada do ONDA com a mesma música.

Música: "${musica}"

${nomeA||"Pessoa A"} chegou na ${ilhaA}.
Jornada de ${nomeA||"Pessoa A"}:
${sA}

${nomeB||"Pessoa B"} chegou na ${ilhaB}.
Jornada de ${nomeB||"Pessoa B"}:
${sB}

Faça a leitura comparativa das duas jornadas. Você tem acesso a algo raro: duas leituras diferentes da mesma música pela lente de duas vidas diferentes.

COMPARACAO: [2-3 frases — o que foi diferente nas escolhas, no que nomearam, na ilha que chegaram. Com humor e precisão do Maestro. O que a diferença revela sobre cada um.]
CONVERGENCIA: [1 frase — o que as duas jornadas têm em comum, mesmo que tenham chegado em ilhas diferentes]
PARA_A: [1 frase do Maestro endereçada diretamente a ${nomeA||"Pessoa A"} — algo que só pode ser dito depois de ver as duas jornadas lado a lado]
PARA_B: [1 frase do Maestro endereçada diretamente a ${nomeB||"Pessoa B"} — idem]
PERGUNTA_DUO: [1 pergunta que o Maestro faz para os dois responderem juntos — algo que a comparação tornou possível perguntar]`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE
// ═══════════════════════════════════════════════════════════════════════════════
function parseRP(r) {
  return {
    reflexao: r.match(/REFLEXÃO:\s*([\s\S]*?)(?=PERGUNTA:|$)/i)?.[1]?.trim()||"",
    pergunta:  r.match(/PERGUNTA:\s*([\s\S]*?)$/i)?.[1]?.trim()||"",
  };
}
function parseConstelacao(r) {
  return {
    leitura:   r.match(/LEITURA:\s*([\s\S]*?)(?=TENSAO:|$)/i)?.[1]?.trim()||"",
    tensao:    r.match(/TENSAO:\s*([\s\S]*?)(?=AUSENCIA:|$)/i)?.[1]?.trim()||"",
    ausencia:  r.match(/AUSENCIA:\s*([\s\S]*?)(?=PERGUNTA_CONSTELACAO:|$)/i)?.[1]?.trim()||"",
    pergunta:  r.match(/PERGUNTA_CONSTELACAO:\s*([\s\S]*?)$/i)?.[1]?.trim()||"",
    data:      new Date().toLocaleDateString("pt-BR"),
  };
}
function parseDuo(r) {
  return {
    comparacao:    r.match(/COMPARACAO:\s*([\s\S]*?)(?=CONVERGENCIA:|$)/i)?.[1]?.trim()||"",
    convergencia:  r.match(/CONVERGENCIA:\s*([\s\S]*?)(?=PARA_A:|$)/i)?.[1]?.trim()||"",
    paraA:         r.match(/PARA_A:\s*([\s\S]*?)(?=PARA_B:|$)/i)?.[1]?.trim()||"",
    paraB:         r.match(/PARA_B:\s*([\s\S]*?)(?=PERGUNTA_DUO:|$)/i)?.[1]?.trim()||"",
    perguntaDuo:   r.match(/PERGUNTA_DUO:\s*([\s\S]*?)$/i)?.[1]?.trim()||"",
  };
}

// Storage compartilhado para Sessão a Dois
const DUO_PREFIX = "onda_duo_";
const saveDuo = async (codigo, dados) => {
  try { await window.storage.set(`${DUO_PREFIX}${codigo}`, JSON.stringify(dados), true); } catch {}
};
const loadDuo = async (codigo) => {
  try {
    const r = await window.storage.get(`${DUO_PREFIX}${codigo}`, true);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
};
// Gera código de 6 caracteres alfanumérico
const gerarCodigo = () => Math.random().toString(36).slice(2,8).toUpperCase();
function parseMusicas(r) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const get = k => r.match(new RegExp(`${esc(k)}:\\s*([^\\n]+)`))?.[1]?.trim()||"";
  const blk = (k,n) => {
    const pat = n==="$"
      ? new RegExp(`${esc(k)}:\\s*([\\s\\S]*?)$`)
      : new RegExp(`${esc(k)}:\\s*([\\s\\S]*?)(?=${esc(n)}:|$)`);
    return r.match(pat)?.[1]?.trim()||"";
  };
  const ms = [
    {titulo:get("M0_TÍTULO"),yt:get("M0_YT"),letra:blk("M0_LETRA","M0_TEXTO"),texto:blk("M0_TEXTO","M1_TÍTULO")},
    {titulo:get("M1_TÍTULO"),yt:get("M1_YT"),letra:blk("M1_LETRA","M1_TEXTO"),texto:blk("M1_TEXTO","M2_TÍTULO")},
    {titulo:get("M2_TÍTULO"),yt:get("M2_YT"),letra:blk("M2_LETRA","M2_TEXTO"),texto:blk("M2_TEXTO","M3_TÍTULO")},
    {titulo:get("M3_TÍTULO"),yt:get("M3_YT"),letra:blk("M3_LETRA","M3_TEXTO"),texto:blk("M3_TEXTO","ILHA_COR")},
  ];
  const ilhaCor = get("ILHA_COR").toLowerCase().trim();
  const comentario = blk("COMENTARIO_MAESTRO","$");
  if (!ms[0].titulo && !ms[0].texto) return null;
  return { musicas:ms, ilhaCor, comentario };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#07090E", ocean:"#080D16", card:"#0F1520", border:"#243040",
  ouro:"#E8B830", dourado:"#D4961E", verde:"#3A9A4A", verdeclaro:"#5DC870",
  azul:"#4A90D4", roxo:"#9A6FD4", terra:"#C05030",
  creme:"#F4F0E0",       // texto principal — quase branco quente
  muted:"#A0A8B0",       // texto secundário — cinza claro legível
  faint:"#141C28",
  font:"'Playfair Display', Georgia, serif",
  corpo:"'Crimson Pro', Georgia, serif",
};
const COR_C = {1:C.dourado, 2:C.roxo, 3:C.azul, 4:C.verdeclaro};
const LABEL_C = {
  1:["Por que essa música?",     "A escolha revela o estado"],
  2:["O que ainda não tem nome", "O confuso, o contraditório"],
  3:["O que é de todos nós",     "Do pessoal ao universal"],
  4:["O que você precisa",       "Onde a música vai entrar"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ═══════════════════════════════════════════════════════════════════════════════
function TA({v,set,enter,ph}) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (
    <div style={{position:"relative"}}>
      <textarea value={v} onChange={e=>set(e.target.value)} placeholder={ph}
        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!isMobile){e.preventDefault();enter?.();}}}
        style={{width:"100%",background:"#05070C",border:`1px solid ${C.border}`,borderRadius:10,
          padding:"14px 18px",fontSize:17,fontFamily:C.corpo,color:C.creme,
          resize:"none",minHeight:100,outline:"none",lineHeight:1.65,
          transition:"border-color 0.2s",WebkitAppearance:"none",
          touchAction:"manipulation"}}/>
    </div>
  );
}

function Btn({cor=C.ouro,off,fn,ch,outline,sx={}}) {
  return (
    <button
      type="button"
      disabled={off}
      onClick={fn}
      style={{
        background:outline?"transparent":off?C.faint:cor,
        color:outline?C.creme:"#fff",
        border:outline?`1px solid ${C.border}`:"none",
        borderRadius:100,
        padding:outline?"10px 28px":"14px 36px",
        fontSize:13,letterSpacing:"0.22em",textTransform:"uppercase",
        cursor:off?"not-allowed":"pointer",fontFamily:C.corpo,
        boxShadow:off||outline?"none":`0 4px 22px ${cor}44`,
        transition:"all 0.25s",marginTop:outline?0:16,
        touchAction:"manipulation",
        WebkitTapHighlightColor:"transparent",
        minHeight:48, // toque mínimo recomendado para mobile
        ...sx,
      }}>{ch}</button>
  );
}

function Versos({texto,cor=C.ouro}) {
  if(!texto||texto.trim()==="—"||texto.trim()==="-") return null;
  return (
    <div style={{borderLeft:`3px solid ${cor}`,paddingLeft:18,margin:"14px 0",
      fontStyle:"italic",fontSize:16,lineHeight:2.0,color:C.creme,fontFamily:C.corpo,
      opacity:0.92}}>
      {texto.split("\n").map((l,i)=><div key={i}>{l||"\u00A0"}</div>)}
    </div>
  );
}

function YTBtn({query,titulo}) {
  const url=`https://www.youtube.com/results?search_query=${encodeURIComponent(query||titulo)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display:"inline-flex",alignItems:"center",gap:7,background:"#CC0000",
      color:"#fff",textDecoration:"none",borderRadius:6,padding:"6px 14px",
      fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",
      fontFamily:C.corpo,marginTop:10,transition:"opacity 0.2s",
      boxShadow:"0 2px 10px rgba(204,0,0,0.4)",
    }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}
    >▶ Ouvir no YouTube</a>
  );
}

function IndCamada({n}) {
  if(!n) return null;
  const [titulo,sub]=LABEL_C[n]||LABEL_C[1];
  const cor=COR_C[n]||C.ouro;
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",gap:5,marginBottom:7}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,
            background:i<n?COR_C[i]+"55":i===n?cor:C.faint,
            boxShadow:i===n?`0 0 8px ${cor}88`:"none",transition:"all 0.4s"}}/>
        ))}
      </div>
      <span style={{fontSize:9,letterSpacing:"0.35em",textTransform:"uppercase",color:cor,fontWeight:700,fontFamily:C.corpo}}>{titulo}</span>
      <span style={{fontSize:10,color:C.creme,opacity:0.6,fontStyle:"italic",fontFamily:C.corpo,marginLeft:8}}>— {sub}</span>
    </div>
  );
}

// Balão do Maestro
function BalaM({texto,delay=0}) {
  if(!texto) return null;
  return (
    <div style={{display:"flex",gap:12,marginBottom:22,animation:`up 0.5s ease ${delay}s both`}}>
      <div style={{flexShrink:0,width:42,height:42,borderRadius:"50%",
        background:`linear-gradient(135deg, #1A1A2E, #2A2A4E)`,
        border:`2px solid ${C.ouro}66`,display:"flex",alignItems:"center",
        justifyContent:"center",fontSize:18,boxShadow:`0 0 14px ${C.ouro}22`}}>
        🎼
      </div>
      <div style={{background:C.card,border:`1px solid ${C.ouro}22`,
        borderRadius:"4px 14px 14px 14px",padding:"12px 16px",flex:1}}>
        <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
          color:C.ouro,fontWeight:700,marginBottom:6,fontFamily:C.corpo}}>O MAESTRO</div>
        <p style={{fontSize:17,lineHeight:1.85,color:C.creme,margin:0,
          fontStyle:"italic",fontFamily:C.corpo}}>{texto}</p>
      </div>
    </div>
  );
}

// Card de música
function CardM({m,idx}) {
  const cores=[C.ouro,C.verdeclaro,C.azul,C.roxo];
  const rotulos=["✦ A sua música","⊙ Próxima ressonância","◎ Outro território","✧ Expansão inesperada"];
  const cor=cores[idx]||C.azul;
  const destaque=idx===0;
  return (
    <div style={{background:destaque?C.card:C.faint,
      border:`1px solid ${destaque?cor+"77":cor+"33"}`,
      borderLeft:`${destaque?5:4}px solid ${cor}`,borderRadius:14,
      padding:destaque?"26px 28px":"20px 24px",
      animation:`up 0.5s ease ${idx*0.1}s both`}}>
      <div style={{fontSize:9,letterSpacing:"0.45em",textTransform:"uppercase",
        color:cor,fontWeight:700,marginBottom:7,fontFamily:C.corpo}}>{rotulos[idx]}</div>
      <div style={{fontSize:destaque?20:17,fontStyle:"italic",color:C.creme,
        marginBottom:2,lineHeight:1.3,fontFamily:C.corpo}}>{m.titulo}</div>
      <YTBtn query={m.yt} titulo={m.titulo}/>
      <Versos texto={m.letra} cor={cor}/>
      <p style={{fontSize:destaque?15:14,lineHeight:1.85,
        color:C.creme,opacity:destaque?0.9:0.75,margin:0,fontFamily:C.corpo}}>{m.texto}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARQUIPÉLAGO
// ═══════════════════════════════════════════════════════════════════════════════
function Arquipelago({ilhasVisitadas, novaIlha, streak}) {
  const [hover,setHover]=useState(null);

  // Posições orgânicas para até 10 ilhas
  const POS=[
    {x:22,y:38},{x:52,y:22},{x:78,y:35},{x:65,y:62},{x:35,y:68},
    {x:12,y:62},{x:45,y:48},{x:82,y:62},{x:28,y:18},{x:68,y:18},
  ];

  // Constrói lista de ilhas — deduplicando corretamente com resolverIlha
  const todasChaves = new Set(
    (ilhasVisitadas||[]).map(i => resolverIlha(i.cor)).filter(Boolean)
  );
  const lista = (ilhasVisitadas||[]).map(i => ({
    ...i,
    cor: resolverIlha(i.cor) || i.cor, // normaliza a chave
  }));

  // Adiciona novaIlha só se não existir ainda
  if (novaIlha) {
    const chaveNova = resolverIlha(novaIlha.cor) || novaIlha.cor;
    if (!todasChaves.has(chaveNova)) {
      lista.push({ ...novaIlha, cor: chaveNova, nova: true });
    } else {
      // Já existe — marca como nova sem duplicar
      const idx = lista.findIndex(i => i.cor === chaveNova);
      if (idx >= 0) lista[idx] = { ...lista[idx], nova: true };
    }
  }

  // Ilhas não visitadas (em névoa)
  const cores_todas=Object.keys(ILHAS_SISTEMA);
  const visitadasCores=new Set(lista.map(i=>i.cor));

  return (
    <div style={{position:"relative",background:C.ocean,
      border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",
      width:"100%",paddingBottom:"55%",marginBottom:28,minHeight:180}}>

      {/* Gradiente oceânico */}
      <div style={{position:"absolute",inset:0,
        background:`radial-gradient(ellipse at 20% 80%, ${C.azul}12, transparent 50%),
                    radial-gradient(ellipse at 80% 20%, ${C.roxo}08, transparent 50%)`}}/>

      {/* Linhas de ondas sutis */}
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",
          left:"-10%",right:"-10%",
          top:`${25+i*25}%`,
          height:1,
          background:`linear-gradient(to right, transparent, ${C.azul}18, transparent)`,
          transform:`rotate(-${i*0.5}deg)`}}/>
      ))}

      {/* Streak */}
      {streak>0&&(
        <div style={{position:"absolute",top:12,right:12,zIndex:10,
          background:`linear-gradient(135deg, ${C.terra}CC, ${C.dourado}CC)`,
          backdropFilter:"blur(4px)",
          borderRadius:100,padding:"5px 12px",fontSize:11,color:"#fff",
          fontFamily:C.corpo,letterSpacing:"0.08em",
          boxShadow:`0 2px 10px ${C.terra}55`}}>
          🔥 {streak} {streak===1?"dia":"dias"}
        </div>
      )}

      {/* Ilhas em névoa (não visitadas) */}
      {cores_todas.filter(cor=>!visitadasCores.has(cor)).slice(0,4).map((cor,i)=>{
        const ilha=ILHAS_SISTEMA[cor];
        const ang=(i/4)*Math.PI*2;
        const x=50+Math.cos(ang)*35;
        const y=50+Math.sin(ang)*30;
        return (
          <div key={cor} style={{position:"absolute",left:`${x}%`,top:`${y}%`,
            transform:"translate(-50%,-50%)",opacity:0.15}}>
            <div style={{width:30,height:20,borderRadius:"60% 40% 50% 60%",
              background:ilha.cor,filter:"blur(2px)"}}/>
          </div>
        );
      })}

      {/* Ilhas visitadas */}
      {lista.length===0&&(
        <div style={{position:"absolute",inset:0,display:"flex",
          alignItems:"center",justifyContent:"center"}}>
          <p style={{fontSize:14,color:C.muted,fontStyle:"italic",
            fontFamily:C.corpo,textAlign:"center",padding:"0 32px",lineHeight:1.7}}>
            Seu arquipélago ainda está por descobrir.<br/>
            Cada sessão revela uma nova ilha.
          </p>
        </div>
      )}

      {lista.map((ilha,i)=>{
        const pos=POS[i%POS.length];
        const chave = resolverIlha(ilha.cor) || ilha.cor;
        const info=ILHAS_SISTEMA[chave]||{cor:"#7A8090",corClara:"#A8B0C0",nome:ilha.nome||ilha.cor,emocao:ilha.emocao||"?",emoji:"🏝️"};
        const tam=ilha.nova?68:(ilha.visitas||1)>2?60:48;
        const isH=hover===i;

        return (
          <div key={`${ilha.cor}-${i}`}
            style={{position:"absolute",left:`${pos.x}%`,top:`${pos.y}%`,
              transform:`translate(-50%,-50%) scale(${isH||ilha.nova?1.18:1})`,
              transition:"transform 0.3s ease",cursor:"pointer",zIndex:isH?20:10}}
            onMouseEnter={()=>setHover(i)}
            onMouseLeave={()=>setHover(null)}>

            {/* Reflexo */}
            <div style={{position:"absolute",top:"65%",left:"5%",width:"90%",height:"20%",
              background:`radial-gradient(ellipse, ${info.cor}18, transparent)`,
              filter:"blur(4px)"}}/>

            {/* Corpo da ilha */}
            <div style={{width:tam,height:tam*0.65,
              background:`linear-gradient(140deg, ${info.cor}CC, ${info.cor}66)`,
              borderRadius:"60% 55% 65% 50%/55% 60% 55% 65%",
              border:`1px solid ${info.corClara}44`,
              boxShadow:`0 4px 16px ${info.cor}44`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:14,
              animation:ilha.nova?"pulse 2s ease 3":"none"}}>
              {ilha.nova&&"✨"}
            </div>

            {/* Emoji */}
            <div style={{textAlign:"center",fontSize:14,marginTop:3}}>{info.emoji}</div>

            {/* Nome — sempre visível, legível */}
            <div style={{
              textAlign:"center",fontSize:11,color:"#fff",
              fontFamily:C.corpo,marginTop:2,letterSpacing:"0.03em",
              fontWeight:600,textShadow:`0 1px 4px ${info.cor}`,
              maxWidth:70,lineHeight:1.2,
            }}>
              {info.emocao}
            </div>

            {/* Tooltip */}
            {isH&&(
              <div style={{position:"absolute",bottom:"115%",left:"50%",
                transform:"translateX(-50%)",
                background:C.card,border:`1px solid ${info.cor}77`,
                borderRadius:10,padding:"10px 14px",whiteSpace:"nowrap",
                zIndex:30,animation:"up 0.2s ease both",
                boxShadow:`0 4px 20px ${info.cor}44`}}>
                <div style={{fontSize:13,color:info.corClara,fontWeight:700,
                  fontFamily:C.corpo,letterSpacing:"0.08em"}}>{info.nome}</div>
                <div style={{fontSize:12,color:C.creme,opacity:0.85,fontFamily:C.corpo,
                  marginTop:4,maxWidth:180,lineHeight:1.5}}>{info.desc}</div>
                {(ilha.visitas||1)>1&&(
                  <div style={{fontSize:11,color:info.corClara,opacity:0.75,marginTop:5,fontFamily:C.corpo}}>
                    visitada {ilha.visitas}x
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTELAÇÃO EMOCIONAL — componente visual
// ═══════════════════════════════════════════════════════════════════════════════

// Posições fixas para cada ilha no mapa estelar
const POSICOES_CONSTELACAO = {
  azul:     {x:50, y:15}, vermelha:{x:82, y:30}, negra:   {x:72, y:65},
  roxa:     {x:28, y:65}, dourada: {x:15, y:30}, verde:   {x:50, y:82},
  cinza:    {x:50, y:50}, laranja: {x:85, y:60}, rosa:    {x:15, y:60},
  branca:   {x:35, y:20},
};

function ConstelacaoVisual({ilhas, sessoes}) {
  const [hover, setHover] = useState(null);

  // Constrói pares de conexão a partir da sequência de sessões
  const conexoes = [];
  const forcaConexao = {};
  for (let i = 1; i < sessoes.length; i++) {
    const a = sessoes[i-1].ilhaCor;
    const b = sessoes[i].ilhaCor;
    if (a && b && a !== b) {
      const key = [a,b].sort().join("—");
      forcaConexao[key] = (forcaConexao[key]||0) + 1;
    }
  }
  Object.entries(forcaConexao).forEach(([key, forca]) => {
    const [a, b] = key.split("—");
    conexoes.push({a, b, forca});
  });

  const visitadasSet = new Set(ilhas.map(i => resolverIlha(i.cor)).filter(Boolean));
  const todasCores = Object.keys(ILHAS_SISTEMA);

  return (
    <div style={{position:"relative", width:"100%", paddingBottom:"90%"}}>
      <svg viewBox="0 0 100 110" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        {/* Fundo estrelado — pontos pequenos aleatórios */}
        {[...Array(40)].map((_,i) => (
          <circle key={i}
            cx={((i*37+11)%97)+1.5} cy={((i*53+7)%97)+1.5}
            r={i%5===0?0.4:0.2}
            fill="#FFFFFF" opacity={0.08+((i*13)%5)*0.03}/>
        ))}

        {/* Linhas de conexão */}
        {conexoes.map(({a,b,forca},i) => {
          const pa = POSICOES_CONSTELACAO[a];
          const pb = POSICOES_CONSTELACAO[b];
          const ia = ILHAS_SISTEMA[a];
          const ib = ILHAS_SISTEMA[b];
          if (!pa||!pb||!ia||!ib) return null;
          const espessura = Math.min(0.4 + forca*0.2, 1.2);
          const opacidade = Math.min(0.25 + forca*0.15, 0.7);
          // Cor gradiente — usa a cor da ilha de origem
          return (
            <line key={i}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={ia.corClara} strokeWidth={espessura}
              opacity={opacidade} strokeLinecap="round"
              strokeDasharray={forca>1?"":"2,2"}/>
          );
        })}

        {/* Nós — todas as ilhas */}
        {todasCores.map(cor => {
          const pos = POSICOES_CONSTELACAO[cor];
          const info = ILHAS_SISTEMA[cor];
          if (!pos||!info) return null;
          const visitada = visitadasSet.has(cor);
          const ilha = ilhas.find(i => resolverIlha(i.cor) === cor);
          const visitas = ilha?.visitas||0;
          const raio = visitada ? Math.min(2.5 + visitas*0.5, 5) : 1.2;
          const isH = hover===cor;

          return (
            <g key={cor}
              onMouseEnter={()=>setHover(cor)}
              onMouseLeave={()=>setHover(null)}
              style={{cursor:visitada?"pointer":"default"}}>

              {/* Halo ao hover */}
              {isH && <circle cx={pos.x} cy={pos.y} r={raio+3}
                fill={info.cor} opacity={0.15}/>}

              {/* Pulso para ilhas visitadas */}
              {visitada && (
                <circle cx={pos.x} cy={pos.y} r={raio+1.5}
                  fill="none" stroke={info.cor} strokeWidth={0.3}
                  opacity={0.3}/>
              )}

              {/* Nó principal */}
              <circle cx={pos.x} cy={pos.y} r={raio}
                fill={visitada ? info.cor : "#1A2535"}
                stroke={visitada ? info.corClara : "#2A3545"}
                strokeWidth={0.4}
                opacity={visitada ? 1 : 0.4}/>

              {/* Emoji/label */}
              {visitada && (
                <text x={pos.x} y={pos.y+0.5} textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={raio*0.9} fill="#fff" opacity={0.9}>
                  {info.emoji}
                </text>
              )}

              {/* Nome sempre visível abaixo do nó */}
              {visitada && (
                <text x={pos.x} y={pos.y+raio+3.5} textAnchor="middle"
                  fontSize={3.2} fill={info.corClara} fontFamily="sans-serif"
                  fontWeight="600">
                  {info.emocao}
                </text>
              )}

              {/* Nome hover — box destacado com detalhes */}
              {isH && visitada && (
                <g>
                  <rect x={pos.x-13} y={pos.y-raio-10} width={26} height={8}
                    rx={1.5} fill={C.card} opacity={0.96}/>
                  <text x={pos.x} y={pos.y-raio-6.5} textAnchor="middle"
                    fontSize={3.2} fill={info.corClara} fontFamily="sans-serif" fontWeight="600">
                    {info.nome}
                  </text>
                  {visitas>1 && (
                    <text x={pos.x} y={pos.y-raio-3.5} textAnchor="middle"
                      fontSize={2.5} fill={info.corClara} opacity={0.8} fontFamily="sans-serif">
                      visitada {visitas}×
                    </text>
                  )}
                </g>
              )}

              {/* Não visitadas — nome ao hover */}
              {!visitada && isH && (
                <g>
                  <rect x={pos.x-12} y={pos.y-raio-8} width={24} height={6}
                    rx={1} fill={C.card} opacity={0.9}/>
                  <text x={pos.x} y={pos.y-raio-5} textAnchor="middle"
                    fontSize={2.8} fill={C.muted} fontFamily="sans-serif">
                    {info.emocao}
                  </text>
                  <text x={pos.x} y={pos.y-raio-2.2} textAnchor="middle"
                    fontSize={2.2} fill={C.muted} opacity={0.6} fontFamily="sans-serif">
                    inexplorada
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Tela completa da Constelação
function TelaConstelacao({perfil, ilhas, sessoes, leituras, onNovaLeitura, onVoltar, autoGerar=false}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const minSessoes = 5;
  const temDados = sessoes.length >= minSessoes;
  const leituraAtual = leituras[0]||null; // só a leitura mais recente
  const gerou = useRef(false);

  const gerarLeitura = async () => {
    if (!temDados || carregando) return;
    setCarregando(true); setErro("");
    try {
      const leituraAnterior = leituraAtual?.leitura || null;
      const raw = await ai(
        Q.constelacao(sessoes, perfil, leituraAnterior),
        MAESTRO_SYS(perfil, 1, ilhas)
      );
      const nova = parseConstelacao(raw);
      onNovaLeitura(nova);
    } catch(e) {
      console.error(e);
      setErro("O Maestro não conseguiu ler a constelação agora. Tente de novo.");
    } finally { setCarregando(false); }
  };

  // Auto-gerar quando abrir pela primeira vez após 5ª sessão
  useEffect(() => {
    if (autoGerar && temDados && !gerou.current) {
      gerou.current = true;
      gerarLeitura();
    }
  }, []);

  return (
    <div style={{animation:"up 0.6s ease both"}}>
      <button onClick={onVoltar} style={{background:"none",border:"none",cursor:"pointer",
        color:C.muted,fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",
        padding:0,fontFamily:C.corpo,marginBottom:28}}>← Voltar</button>

      <div style={{textAlign:"center",marginBottom:32}}>
        <p style={{fontSize:9,letterSpacing:"0.6em",textTransform:"uppercase",
          color:C.roxo,marginBottom:8,fontFamily:C.corpo}}>✦ Constelação Emocional</p>
        <p style={{fontSize:14,color:C.muted,fontStyle:"italic",fontFamily:C.corpo,maxWidth:440,margin:"0 auto"}}>
          {temDados
            ? "O mapa dos seus padrões emocionais."
            : `Faça mais ${minSessoes - sessoes.length} ${minSessoes - sessoes.length===1?"sessão":"sessões"} para revelar sua constelação.`}
        </p>
      </div>

      {/* Mapa visual */}
      <ConstelacaoVisual ilhas={ilhas} sessoes={sessoes}/>

      {/* Legenda */}
      {sessoes.length >= 2 && (
        <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:24,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted,fontFamily:C.corpo}}>
            <div style={{width:20,height:1,borderTop:`1px dashed ${C.muted}`,opacity:0.6}}/>
            conexão única
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted,fontFamily:C.corpo}}>
            <div style={{width:20,height:2,background:C.muted,opacity:0.6,borderRadius:1}}/>
            conexão recorrente
          </div>
        </div>
      )}

      {/* Leitura atual — única, substituível */}
      {carregando && (
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0",justifyContent:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",
            background:`linear-gradient(135deg, #1A1A2E, #2A2A4E)`,
            border:`2px solid ${C.roxo}55`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:14}}>🎼</div>
          <p style={{fontStyle:"italic",color:C.muted,fontSize:15,margin:0,fontFamily:C.corpo}}>
            O Maestro está lendo os padrões…
          </p>
        </div>
      )}

      {!carregando && leituraAtual && (
        <div style={{background:C.card,border:`1px solid ${C.roxo}44`,
          borderLeft:`4px solid ${C.roxo}`,borderRadius:14,
          padding:"24px 28px",marginBottom:20,animation:"up 0.5s ease both"}}>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
              color:C.roxo,fontWeight:700,fontFamily:C.corpo}}>
              🎼 Leitura do Maestro — {leituraAtual.data}
            </div>
          </div>

          <p style={{fontSize:17,lineHeight:1.9,color:C.creme,margin:"0 0 18px",
            fontStyle:"italic",fontFamily:C.corpo}}>{leituraAtual.leitura}</p>

          {leituraAtual.tensao && (
            <div style={{borderLeft:`3px solid ${C.roxo}`,paddingLeft:14,marginBottom:12}}>
              <p style={{fontSize:14,color:C.creme,opacity:0.85,margin:0,
                fontFamily:C.corpo,fontStyle:"italic"}}>⚡ {leituraAtual.tensao}</p>
            </div>
          )}

          {leituraAtual.ausencia && (
            <div style={{borderLeft:`3px solid ${C.muted}`,paddingLeft:14,marginBottom:16}}>
              <p style={{fontSize:14,color:C.creme,opacity:0.7,margin:0,
                fontFamily:C.corpo,fontStyle:"italic"}}>◌ {leituraAtual.ausencia}</p>
            </div>
          )}

          {leituraAtual.pergunta && (
            <div style={{background:C.faint,borderRadius:10,padding:"14px 16px"}}>
              <p style={{fontSize:16,color:C.creme,margin:0,fontStyle:"italic",
                fontFamily:C.corpo,lineHeight:1.8}}>{leituraAtual.pergunta}</p>
            </div>
          )}
        </div>
      )}

      {!carregando && temDados && (
        <div style={{textAlign:"center",marginBottom:28}}>
          <Btn cor={C.roxo} off={carregando} fn={gerarLeitura}
            ch={leituraAtual ? "Reler a constelação →" : "O Maestro lê a constelação →"}
            sx={{marginTop:0}}/>
          <p style={{fontSize:11,color:C.muted,fontStyle:"italic",fontFamily:C.corpo,marginTop:8}}>
            A cada leitura o Maestro pode mudar de interpretação.
          </p>
          {erro && <p style={{fontSize:12,color:"#E08080",marginTop:8,fontStyle:"italic",fontFamily:C.corpo}}>⚠ {erro}</p>}
        </div>
      )}

      {/* Histórico de sessões */}
      {sessoes.length > 0 && (
        <div style={{marginTop:16}}>
          <p style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
            color:C.muted,marginBottom:12,fontFamily:C.corpo}}>Histórico de sessões</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[...sessoes].reverse().map((s,i) => {
              const info = ILHAS_SISTEMA[s.ilhaCor];
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"8px 14px",background:C.faint,borderRadius:8,
                  border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:16}}>{info?.emoji||"🎵"}</span>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,color:C.creme,margin:0,fontFamily:C.corpo,
                      fontStyle:"italic"}}>{s.musica}</p>
                    <p style={{fontSize:11,color:C.muted,margin:0,fontFamily:C.corpo}}>
                      {info?.nome||s.ilha} · {s.data}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// CARD DO DESAFIO SEMANAL
// ═══════════════════════════════════════════════════════════════════════════════
function CardDesafio({desafio, onAceitar, aceito}) {
  const CORES_TIPO = {
    sombra:"#5A5A7A", tempo:"#D4A227", secreto:"#8A4FD4",
    corpo:"#D44A3A", outro:"#3A9A5A", presente:"#3A8FD4",
    ruptura:"#D47A2A", memoria:"#D4A227", desejo:"#8A4FD4",
    raiva:"#D44A3A", esperanca:"#3A9A5A", silencio:"#7A8090",
  };
  const cor = CORES_TIPO[desafio.tipo] || "#8A4FD4";

  if (aceito) return (
    <div style={{background:C.faint,border:`1px solid ${C.border}`,
      borderLeft:`3px solid ${cor}`,borderRadius:12,padding:"14px 18px",
      marginBottom:24,opacity:0.7}}>
      <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
        color:cor,fontFamily:C.corpo,marginBottom:4,fontWeight:700}}>
        ✓ Desafio da semana — aceito
      </div>
      <p style={{fontSize:13,color:C.muted,fontStyle:"italic",
        fontFamily:C.corpo,margin:0}}>{desafio.titulo}</p>
    </div>
  );

  return (
    <div style={{background:C.card,border:`1px solid ${cor}44`,
      borderLeft:`4px solid ${cor}`,borderRadius:14,
      padding:"20px 22px",marginBottom:24,
      animation:"up 0.5s ease both"}}>
      <div style={{fontSize:8,letterSpacing:"0.5em",textTransform:"uppercase",
        color:cor,fontWeight:700,marginBottom:8,fontFamily:C.corpo}}>
        🎯 Desafio da semana
      </div>
      <div style={{fontFamily:C.font,fontStyle:"italic",fontSize:17,
        color:C.creme,lineHeight:1.3,marginBottom:12}}>{desafio.titulo}</div>
      <p style={{fontSize:15,lineHeight:1.8,color:C.creme,
        margin:"0 0 12px",fontFamily:C.corpo}}>{desafio.texto}</p>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",
        background:"rgba(0,0,0,0.2)",borderRadius:8,
        padding:"10px 12px",marginBottom:16}}>
        <span style={{fontSize:14,flexShrink:0}}>🎼</span>
        <p style={{fontSize:13,fontStyle:"italic",color:C.muted,
          margin:0,fontFamily:C.corpo,lineHeight:1.65}}>
          "{desafio.provocacao}"
        </p>
      </div>
      <button type="button" onClick={onAceitar} style={{
        width:"100%",background:cor,color:"#fff",border:"none",
        borderRadius:10,padding:"14px 20px",
        fontFamily:C.corpo,fontSize:13,letterSpacing:"0.18em",
        textTransform:"uppercase",cursor:"pointer",
        boxShadow:`0 4px 18px ${cor}44`,
        touchAction:"manipulation",WebkitTapHighlightColor:"transparent",
        minHeight:48,transition:"all 0.25s",
      }}>
        Aceitar o desafio →
      </button>
    </div>
  );
}

function Dialogo({perfil,nivel,ilhas,onResultado,onPerfil,retomada=null,desafioAtivo=null}) {
  const [passo,setPasso]=useState(retomada?"retomando":"m0");
  const [camada,setCamada]=useState(0);
  const [entrada,setEntrada]=useState("");
  const [ocupado,setOcupado]=useState(false);
  const [pergunta,setPergunta]=useState("");
  const [reflexao,setReflexao]=useState("");
  const [musicaPedida,setMusica]=useState(retomada?.musica||"");
  const [erro,setErro]=useState("");
  const hist=useRef(retomada?[`Sessão anterior sobre "${retomada.musica}". Ilha descoberta: ${retomada.ilha}.`]:[]);

  const log=(q,t)=>hist.current.push(`${q}: ${t}`);
  const h=()=>hist.current.join("\n");
  const S=()=>MAESTRO_SYS(perfil,nivel,ilhas);

  const extrair=()=>
    ai(Q.extrair(h(),perfil))
      .then(r=>{try{onPerfil(JSON.parse(r.replace(/```json|```/g,"").trim()));}catch{}})
      .catch(()=>{});

  // Se modo retomada, busca abertura do Maestro ao montar
  const rodouRetomada=useRef(false);
  useEffect(()=>{
    if(!retomada||rodouRetomada.current) return;
    rodouRetomada.current=true;
    (async()=>{
      try{
        const raw=await ai(Q.retomada(retomada.pergunta,retomada.musica,retomada.ilha,perfil),S());
        log("Maestro [Retomada]",raw.trim());
        setPergunta(raw.trim());setCamada(1);setPasso("c1");
      } catch {
        setPergunta(retomada.pergunta);setCamada(1);setPasso("c1");
      }
    })();
  },[]);

  const enviarMusica=async()=>{
    if(!entrada.trim()||ocupado) return;
    const mus=entrada.trim();
    setMusica(mus);setEntrada("");setOcupado(true);setPasso("carregando");setCamada(1);
    log("Pessoa escolheu",mus);
    // Se tem desafio ativo, usa prompt específico que considera o contexto do desafio
    const promptAbertura = desafioAtivo
      ? Q.desafio(desafioAtivo, mus, perfil)
      : Q.abertura(mus, perfil, ilhas);
    try {
      const raw=await ai(promptAbertura, S());
      log("Maestro [C1]",raw.trim());
      setPergunta(raw.trim());setCamada(1);setPasso("c1");
    } catch {
      const fb=desafioAtivo
        ? `"${mus}"... Interessante escolha para esse desafio. O que te levou a ela?`
        : `"${mus}"... Claro. Por que exatamente essa agora?`;
      log("Maestro [C1]",fb);
      setPergunta(fb);setCamada(1);setPasso("c1");
    } finally{setOcupado(false);}
  };

  const avancar=async(prox)=>{
    if(!entrada.trim()||ocupado) return;
    const resp=entrada.trim();
    const camadaAtual=camada;
    setEntrada("");setOcupado(true);setPasso("carregando");setErro("");
    log(`Pessoa [C${camadaAtual}]`,resp);

    // Extrair perfil em background — não bloqueia o fluxo principal
    setTimeout(()=>extrair(), 100);

    try {
      if(prox>4){
        let res=null,tentativas=0;
        while(!res&&tentativas<2){
          tentativas++;
          try {
            const raw=await ai(Q.musicas(musicaPedida,h(),perfil,nivel),S());
            res=parseMusicas(raw);
          } catch(apiErr) {
            console.error("API error tentativa",tentativas,apiErr);
          }
          if(!res&&tentativas<2) await new Promise(r=>setTimeout(r,1500));
        }
        if(res) {
          onResultado(musicaPedida,h(),res);
        } else {
          setErro("O Maestro ficou em silêncio. Tente de novo.");
          setCamada(camadaAtual);
          setPasso(`c${camadaAtual}`);
        }
      } else {
        const fn={2:Q.c2,3:Q.c3,4:Q.c4}[prox];
        const raw=await ai(fn(h()),S());
        const d=parseRP(raw);
        if(d.reflexao) log(`Maestro [C${prox}] Reflexão`,d.reflexao);
        log(`Maestro [C${prox}] Pergunta`,d.pergunta||"E o que mais você identifica?");
        setReflexao(d.reflexao||"");
        setPergunta(d.pergunta||"E o que mais você identifica?");
        setCamada(prox);setPasso(`c${prox}`);
      }
    } catch(e){
      console.error("avancar error:",e);
      const msg = e?.message?.includes("Failed to fetch")
        ? "Sem conexão. Verifique sua internet e tente de novo."
        : e?.message?.includes("API 5")
        ? "O Maestro está sobrecarregado. Aguarde um momento e tente de novo."
        : "Algo deu errado. Tente de novo.";
      setErro(msg);
      setCamada(camadaAtual);
      setPasso(`c${camadaAtual}`);
    } finally{setOcupado(false);}
  };

  const next={c1:2,c2:3,c3:4,c4:5};
  const cor=COR_C[camada]||C.ouro;
  const ph={m0:"Nome do artista e música, ou um verso que não sai da cabeça…",c1:"Fala o que vier…",c2:"Mesmo que não faça sentido ainda…",c3:"Como se fosse de todo mundo…",c4:"O que você precisa agora…"};

  return (
    <div>
      {passo==="retomando"&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"20px 0"}}>
          <div style={{width:32,height:32,borderRadius:"50%",
            background:`linear-gradient(135deg, #1A1A2E, #2A2A4E)`,
            border:`2px solid ${C.ouro}55`,display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:14}}>🎼</div>
          <p style={{fontStyle:"italic",color:C.muted,fontSize:15,margin:0,fontFamily:C.corpo}}>
            O Maestro está lembrando onde paramos…
          </p>
        </div>
      )}

      {passo==="m0"&&(
        <div style={{animation:"up 0.5s ease both"}}>
          <BalaM texto={desafioAtivo
            ? `Então… você aceitou o desafio. Qual música você trouxe?`
            : "Então... qual música você tava querendo ouvir? Me diz."
          }/>
          <TA v={entrada} set={setEntrada} enter={enviarMusica}
            ph={desafioAtivo
              ? "A música do seu desafio…"
              : ph.m0
            }/>
          <div style={{marginTop:16}}>
            <button
              type="button"
              disabled={!entrada.trim()}
              onClick={enviarMusica}
              style={{
                width:"100%",
                background:entrada.trim()?C.ouro:C.faint,
                color:"#fff",border:"none",
                borderRadius:14,padding:"18px 24px",
                fontSize:15,letterSpacing:"0.15em",textTransform:"uppercase",
                cursor:entrada.trim()?"pointer":"not-allowed",
                fontFamily:C.corpo,
                boxShadow:entrada.trim()?`0 4px 22px ${C.ouro}55`:"none",
                transition:"all 0.3s",
                touchAction:"manipulation",
                WebkitTapHighlightColor:"transparent",
                minHeight:56,
              }}>
              {desafioAtivo ? "Essa é a música do desafio →" : "Essa é a minha →"}
            </button>
          </div>
        </div>
      )}

      {passo==="carregando"&&(
        <div>
          {camada>0&&<IndCamada n={camada}/>}
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0"}}>
            <div style={{width:32,height:32,borderRadius:"50%",
              background:`linear-gradient(135deg, #1A1A2E, #2A2A4E)`,
              border:`2px solid ${C.ouro}55`,display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:14}}>🎼</div>
            <p style={{fontStyle:"italic",color:C.muted,fontSize:15,margin:0,fontFamily:C.corpo}}>
              {camada>=4?"O Maestro está compondo suas músicas…":"O Maestro está pensando…"}
            </p>
          </div>
        </div>
      )}

      {["c1","c2","c3","c4"].includes(passo)&&(
        <div style={{animation:"up 0.45s ease both"}}>
          <IndCamada n={camada}/>
          {musicaPedida&&(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.faint,
              border:`1px solid ${C.border}`,borderRadius:100,padding:"5px 14px",marginBottom:18,
              fontSize:13,color:C.muted,fontFamily:C.corpo}}>
              <span style={{color:C.verdeclaro}}>♪</span>{musicaPedida}
            </div>
          )}
          <BalaM texto={reflexao?`${reflexao}\n\n${pergunta}`:pergunta}/>
          <TA v={entrada} set={setEntrada} enter={()=>avancar(next[passo])} ph={ph[passo]||"Responde…"}/>
          {erro&&(
            <div style={{background:"#1A0808",border:"1px solid #E0505044",
              borderRadius:10,padding:"12px 16px",marginTop:10}}>
              <p style={{fontSize:13,color:"#E08080",margin:"0 0 10px",
                fontFamily:C.corpo,fontStyle:"italic"}}>⚠ {erro}</p>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <Btn cor="#C04040" fn={()=>{setErro("");avancar(next[passo]);}}
                  ch="Tentar de novo" sx={{marginTop:0,padding:"8px 20px",fontSize:11}}/>
                <button type="button" onClick={()=>setErro("")} style={{background:"none",border:"none",
                  color:C.muted,cursor:"pointer",fontFamily:C.corpo,fontSize:12,
                  textDecoration:"underline",touchAction:"manipulation"}}>fechar</button>
              </div>
            </div>
          )}
          {/* Botão grande e fixo — visível mesmo com teclado mobile aberto */}
          <div style={{marginTop:16,paddingBottom:8}}>
            <button
              type="button"
              disabled={!entrada.trim()}
              onClick={()=>{setErro("");avancar(next[passo]);}}
              style={{
                width:"100%",
                background:entrada.trim()?cor:C.faint,
                color:"#fff",border:"none",
                borderRadius:14,
                padding:"18px 24px",
                fontSize:15,letterSpacing:"0.15em",textTransform:"uppercase",
                cursor:entrada.trim()?"pointer":"not-allowed",
                fontFamily:C.corpo,
                boxShadow:entrada.trim()?`0 4px 22px ${cor}55`:"none",
                transition:"all 0.3s",
                touchAction:"manipulation",
                WebkitTapHighlightColor:"transparent",
                minHeight:56,
              }}>
              {passo==="c4"?"Ver minhas músicas →":"Continuar →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE v2 — sempre acessível como aba "Sobre o ONDA"
// ═══════════════════════════════════════════════════════════════════════════════
const WAVES_LANDING=[0.3,0.6,1,0.7,0.4,1,0.5,0.8,0.6,0.3,0.9,0.5,0.7,1,0.4,0.6,0.3,0.8,0.5,1];
const ILHAS_LAND=[
  {cor:"#3A8FD4",nome:"Leveza",emoji:"🩵",vis:true},
  {cor:"#D44A3A",nome:"Paixão",emoji:"❤️",vis:false},
  {cor:"#2A2A4A",nome:"Sombra",emoji:"🖤",vis:false},
  {cor:"#8A4FD4",nome:"Desejo",emoji:"💜",vis:true},
  {cor:"#D4A227",nome:"Nostalgia",emoji:"💛",vis:false},
  {cor:"#3A9A5A",nome:"Esperança",emoji:"💚",vis:true},
  {cor:"#7A8090",nome:"Ambiguidade",emoji:"🩶",vis:false},
  {cor:"#D47A2A",nome:"Alegria",emoji:"🧡",vis:false},
  {cor:"#D44A8A",nome:"Ternura",emoji:"🩷",vis:true},
  {cor:"#C8C0B0",nome:"Vazio",emoji:"🤍",vis:false},
];

// ═══════════════════════════════════════════════════════════════════════════════
// TELA DO DIÁRIO DO ARQUIPÉLAGO
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SESSÃO A DOIS
// ═══════════════════════════════════════════════════════════════════════════════
function TelaDuo({perfil, nivel, ilhas, onResultado, onPerfil, onVoltar}) {
  const [etapa, setEtapa] = useState("menu"); // menu | criar | aguardar | entrar | jornada | comparando | resultado
  const [codigo, setCodigo] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [meuNome, setMeuNome] = useState(perfil?.nome || "");
  const [dadosDuo, setDadosDuo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [checando, setChecando] = useState(false);
  const intervalRef = useRef(null);

  const limpar = () => { if(intervalRef.current) clearInterval(intervalRef.current); };

  // Cria sessão a dois
  const criarSessao = async () => {
    const cod = gerarCodigo();
    setCodigo(cod);
    const dados = {
      codigo: cod,
      criador: meuNome || "?",
      status: "aguardando", // aguardando | dupla_pronta | completo
      criadoEm: Date.now(),
      jornada_a: null,
      jornada_b: null,
      nome_a: meuNome || "Pessoa A",
      nome_b: null,
    };
    await saveDuo(cod, dados);
    setDadosDuo(dados);
    setEtapa("aguardar");
    // Polling para ver se o parceiro entrou
    intervalRef.current = setInterval(async () => {
      const d = await loadDuo(cod);
      if (d?.status === "dupla_pronta") {
        limpar();
        setDadosDuo(d);
        setEtapa("jornada");
      }
    }, 3000);
  };

  // Entra em sessão existente
  const entrarSessao = async () => {
    setErro(""); setChecando(true);
    const cod = codigoInput.trim().toUpperCase();
    const d = await loadDuo(cod);
    setChecando(false);
    if (!d) { setErro("Código não encontrado. Verifique e tente de novo."); return; }
    if (d.status !== "aguardando") { setErro("Esta sessão já está completa ou expirou."); return; }
    // Entra como pessoa B
    const atualizado = { ...d, status:"dupla_pronta", nome_b: meuNome||"Pessoa B" };
    await saveDuo(cod, atualizado);
    setCodigo(cod);
    setDadosDuo(atualizado);
    setEtapa("jornada");
    limpar();
  };

  // Salva jornada concluída e verifica se o parceiro já terminou
  const onJornadaCompleta = async (musica, hist, resultadoSessao) => {
    const sou_a = dadosDuo?.nome_a === (meuNome||"Pessoa A");
    const d = await loadDuo(codigo);
    if (!d) return;
    const minha_jornada = {
      musica, hist,
      ilha: ILHAS_SISTEMA[resolverIlha(resultadoSessao.ilhaCor)]?.nome || resultadoSessao.ilhaCor,
      ilhaCor: resolverIlha(resultadoSessao.ilhaCor),
      musicas: resultadoSessao.musicas,
      comentario: resultadoSessao.comentario,
    };
    const atualizado = sou_a
      ? { ...d, jornada_a: minha_jornada }
      : { ...d, jornada_b: minha_jornada };
    // Verifica se o parceiro já terminou
    const parceiro_terminou = sou_a ? !!d.jornada_b : !!d.jornada_a;
    if (parceiro_terminou) atualizado.status = "completo";
    await saveDuo(codigo, atualizado);
    setDadosDuo(atualizado);
    if (parceiro_terminou) {
      setEtapa("comparando");
      gerarComparacao(atualizado);
    } else {
      setEtapa("aguardando_parceiro");
      // Polling para ver quando o parceiro terminar
      intervalRef.current = setInterval(async () => {
        const d2 = await loadDuo(codigo);
        if (d2?.status === "completo") {
          limpar();
          setDadosDuo(d2);
          setEtapa("comparando");
          gerarComparacao(d2);
        }
      }, 4000);
    }
  };

  const gerarComparacao = async (d) => {
    try {
      const raw = await ai(
        Q.duo(
          d.jornada_a?.musica || d.jornada_b?.musica,
          d.jornada_a?.hist || d.jornada_a?.comentario || "",
          d.jornada_a?.ilha || "?",
          d.jornada_b?.hist || d.jornada_b?.comentario || "",
          d.jornada_b?.ilha || "?",
          d.nome_a, d.nome_b
        ),
        MAESTRO_SYS(perfil, nivel, ilhas)
      );
      setResultado(parseDuo(raw));
      setEtapa("resultado");
    } catch(e) {
      console.error(e);
      setErro("O Maestro não conseguiu comparar as jornadas. Tente de novo.");
      setEtapa("aguardando_parceiro");
    }
  };

  // Cleanup ao desmontar
  useEffect(() => () => limpar(), []);

  const btnStyle = (cor) => ({
    width:"100%", background:cor, color:"#fff", border:"none",
    borderRadius:12, padding:"16px 20px", fontFamily:C.corpo,
    fontSize:13, letterSpacing:"0.18em", textTransform:"uppercase",
    cursor:"pointer", boxShadow:`0 4px 18px ${cor}44`,
    touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
    minHeight:52, transition:"all 0.25s", marginBottom:10,
  });

  return (
    <div style={{animation:"up 0.5s ease both"}}>
      <button onClick={()=>{limpar();onVoltar();}} style={{background:"none",border:"none",
        cursor:"pointer",color:C.muted,fontSize:10,letterSpacing:"0.22em",
        textTransform:"uppercase",padding:0,fontFamily:C.corpo,marginBottom:28}}>
        ← Voltar
      </button>

      {/* ── MENU ── */}
      {etapa==="menu"&&(
        <div>
          <div style={{textAlign:"center",marginBottom:32}}>
            <p style={{fontSize:9,letterSpacing:"0.6em",textTransform:"uppercase",
              color:C.roxo,marginBottom:8,fontFamily:C.corpo}}>👥 Sessão a Dois</p>
            <h2 style={{fontFamily:C.font,fontStyle:"italic",fontSize:"clamp(22px,4vw,30px)",
              color:C.creme,marginBottom:10,lineHeight:1.3}}>
              A mesma música.<br/>Duas jornadas. Uma comparação.
            </h2>
            <p style={{fontSize:15,color:C.muted,fontStyle:"italic",fontFamily:C.corpo,
              maxWidth:420,margin:"0 auto",lineHeight:1.8}}>
              Você e outra pessoa fazem a jornada com a mesma música — separadamente.
              O Maestro lê as duas e compara o que foi revelado.
            </p>
          </div>

          {/* Nome */}
          <div style={{maxWidth:400,margin:"0 auto 24px"}}>
            <p style={{fontSize:12,color:C.muted,fontFamily:C.corpo,marginBottom:8,
              letterSpacing:"0.1em",textTransform:"uppercase"}}>Seu nome (opcional)</p>
            <input
              type="text" value={meuNome} placeholder="Como quer ser chamado?"
              onChange={e=>setMeuNome(e.target.value)}
              style={{width:"100%",background:"#05070C",border:`1px solid ${C.border}`,
                borderRadius:10,padding:"12px 16px",fontSize:16,fontFamily:C.corpo,
                color:C.creme,outline:"none",boxSizing:"border-box"}}/>
          </div>

          <div style={{maxWidth:400,margin:"0 auto"}}>
            <button type="button" onClick={()=>setEtapa("criar")} style={btnStyle(C.roxo)}>
              Criar sessão — convidar alguém
            </button>
            <button type="button" onClick={()=>setEtapa("entrar")} style={btnStyle(C.azul)}>
              Entrar com código de sessão
            </button>
          </div>
        </div>
      )}

      {/* ── CRIAR ── */}
      {etapa==="criar"&&(
        <div style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}>
          <BalaM texto="Bom. Você vai criar a sessão — e depois passar o código para quem vai embarcar com você. Confirma?"/>
          <div style={{display:"flex",gap:12,marginTop:24,flexWrap:"wrap"}}>
            <button type="button" onClick={criarSessao} style={{...btnStyle(C.roxo),flex:1,marginBottom:0}}>
              Criar sessão →
            </button>
            <button type="button" onClick={()=>setEtapa("menu")} style={{
              flex:1,background:"transparent",border:`1px solid ${C.border}`,
              borderRadius:12,padding:"16px",fontFamily:C.corpo,fontSize:13,
              color:C.muted,cursor:"pointer",minHeight:52}}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* ── AGUARDAR PARCEIRO ENTRAR ── */}
      {etapa==="aguardar"&&(
        <div style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}>
          <div style={{background:C.card,border:`1px solid ${C.roxo}44`,
            borderRadius:16,padding:"28px 24px",marginBottom:24}}>
            <p style={{fontSize:10,letterSpacing:"0.5em",textTransform:"uppercase",
              color:C.roxo,fontFamily:C.corpo,marginBottom:12}}>Código da sessão</p>
            <div style={{fontFamily:C.font,fontSize:"clamp(40px,10vw,64px)",
              color:C.creme,letterSpacing:"0.25em",margin:"0 0 12px"}}>{codigo}</div>
            <p style={{fontSize:14,color:C.muted,fontStyle:"italic",fontFamily:C.corpo}}>
              Mande este código para seu parceiro.<br/>
              Quando ele entrar, a jornada começa.
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.roxo,
              animation:"pulse 1.5s ease-in-out infinite"}}/>
            <p style={{fontSize:13,color:C.muted,fontStyle:"italic",fontFamily:C.corpo,margin:0}}>
              Aguardando parceiro…
            </p>
          </div>
        </div>
      )}

      {/* ── ENTRAR COM CÓDIGO ── */}
      {etapa==="entrar"&&(
        <div style={{maxWidth:400,margin:"0 auto"}}>
          <BalaM texto="Qual é o código da sessão que te mandaram?"/>
          <input
            type="text" value={codigoInput} placeholder="Ex: AB3X7K"
            onChange={e=>setCodigoInput(e.target.value.toUpperCase())}
            style={{width:"100%",background:"#05070C",border:`1px solid ${C.border}`,
              borderRadius:10,padding:"14px 18px",fontSize:22,fontFamily:C.font,
              color:C.creme,outline:"none",letterSpacing:"0.3em",textAlign:"center",
              marginBottom:16,boxSizing:"border-box"}}/>
          {erro&&<p style={{fontSize:13,color:"#E08080",fontStyle:"italic",
            fontFamily:C.corpo,marginBottom:12}}>⚠ {erro}</p>}
          <button type="button" disabled={!codigoInput.trim()||checando}
            onClick={entrarSessao} style={btnStyle(C.azul)}>
            {checando?"Verificando…":"Entrar na sessão →"}
          </button>
          <button type="button" onClick={()=>{setEtapa("menu");setErro("");}}
            style={{...btnStyle("transparent"),border:`1px solid ${C.border}`,
              color:C.muted,boxShadow:"none"}}>
            Voltar
          </button>
        </div>
      )}

      {/* ── JORNADA ── */}
      {etapa==="jornada"&&dadosDuo&&(
        <div>
          <div style={{background:`${C.roxo}18`,border:`1px solid ${C.roxo}33`,
            borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"center"}}>
            <p style={{fontSize:13,color:C.roxo,fontFamily:C.corpo,margin:0,fontStyle:"italic"}}>
              Sessão a dois com <strong style={{fontStyle:"normal"}}>
                {dadosDuo.nome_a===meuNome ? dadosDuo.nome_b : dadosDuo.nome_a}
              </strong> · código {codigo}
            </p>
          </div>
          <Dialogo
            perfil={perfil} nivel={nivel} ilhas={ilhas}
            onResultado={(mus,hist,res)=>onJornadaCompleta(mus,hist,res)}
            onPerfil={onPerfil}
          />
        </div>
      )}

      {/* ── AGUARDANDO PARCEIRO TERMINAR ── */}
      {etapa==="aguardando_parceiro"&&(
        <div style={{maxWidth:480,margin:"0 auto",textAlign:"center",padding:"40px 0"}}>
          <div style={{fontSize:32,marginBottom:16}}>🎵</div>
          <BalaM texto="Você terminou sua jornada. Aguarde — seu parceiro ainda está navegando."/>
          <div style={{display:"flex",alignItems:"center",gap:10,
            justifyContent:"center",marginTop:24}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.verde,
              animation:"pulse 1.5s ease-in-out infinite"}}/>
            <p style={{fontSize:13,color:C.muted,fontStyle:"italic",fontFamily:C.corpo,margin:0}}>
              O Maestro está esperando seu parceiro terminar…
            </p>
          </div>
          {erro&&(
            <div style={{marginTop:20}}>
              <p style={{fontSize:13,color:"#E08080",fontStyle:"italic",fontFamily:C.corpo}}>{erro}</p>
              <button type="button" onClick={()=>gerarComparacao(dadosDuo)}
                style={{...btnStyle(C.roxo),maxWidth:300,margin:"12px auto 0"}}>
                Tentar de novo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── COMPARANDO ── */}
      {etapa==="comparando"&&(
        <div style={{textAlign:"center",padding:"40px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
            <div style={{width:36,height:36,borderRadius:"50%",
              background:"linear-gradient(135deg,#1A1A2E,#2A2A4E)",
              border:`2px solid ${C.roxo}55`,display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:16}}>🎼</div>
            <p style={{fontStyle:"italic",color:C.muted,fontSize:15,margin:0,fontFamily:C.corpo}}>
              O Maestro está lendo as duas jornadas…
            </p>
          </div>
        </div>
      )}

      {/* ── RESULTADO ── */}
      {etapa==="resultado"&&resultado&&dadosDuo&&(
        <div style={{animation:"up 0.5s ease both"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <p style={{fontSize:9,letterSpacing:"0.5em",textTransform:"uppercase",
              color:C.roxo,fontFamily:C.corpo,marginBottom:8}}>✦ Leitura Comparativa</p>
            <p style={{fontSize:14,color:C.muted,fontStyle:"italic",
              fontFamily:C.corpo}}>{dadosDuo.jornada_a?.musica}</p>
          </div>

          {/* Ilhas lado a lado */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {[
              {nome:dadosDuo.nome_a,ilha:dadosDuo.jornada_a?.ilha,cor:dadosDuo.jornada_a?.ilhaCor},
              {nome:dadosDuo.nome_b,ilha:dadosDuo.jornada_b?.ilha,cor:dadosDuo.jornada_b?.ilhaCor},
            ].map((p,i)=>{
              const info = ILHAS_SISTEMA[p.cor] || {};
              return (
                <div key={i} style={{background:C.faint,
                  border:`1px solid ${info.cor||C.border}33`,
                  borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:6}}>{info.emoji||"🎵"}</div>
                  <div style={{fontSize:12,color:info.cor||C.muted,fontFamily:C.corpo,
                    fontWeight:700,letterSpacing:"0.06em",marginBottom:4}}>{p.ilha}</div>
                  <div style={{fontSize:13,color:C.muted,fontFamily:C.corpo,
                    fontStyle:"italic"}}>{p.nome}</div>
                </div>
              );
            })}
          </div>

          {/* Comparação do Maestro */}
          <BalaM texto={resultado.comparacao}/>

          {/* Convergência */}
          {resultado.convergencia&&(
            <div style={{background:C.faint,border:`1px solid ${C.verdeclaro}33`,
              borderLeft:`3px solid ${C.verdeclaro}`,borderRadius:10,
              padding:"14px 16px",marginBottom:16}}>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:C.verdeclaro,fontWeight:700,marginBottom:6,fontFamily:C.corpo}}>
                Em comum
              </div>
              <p style={{fontSize:14,color:C.creme,opacity:0.85,margin:0,
                fontStyle:"italic",fontFamily:C.corpo,lineHeight:1.7}}>
                {resultado.convergencia}
              </p>
            </div>
          )}

          {/* Para cada um */}
          {[
            {label:dadosDuo.nome_a, texto:resultado.paraA, cor:dadosDuo.jornada_a?.ilhaCor},
            {label:dadosDuo.nome_b, texto:resultado.paraB, cor:dadosDuo.jornada_b?.ilhaCor},
          ].map((p,i) => p.texto&&(
            <div key={i} style={{background:C.faint,
              border:`1px solid ${ILHAS_SISTEMA[p.cor]?.cor||C.border}33`,
              borderLeft:`3px solid ${ILHAS_SISTEMA[p.cor]?.cor||C.roxo}`,
              borderRadius:10,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:ILHAS_SISTEMA[p.cor]?.corClara||C.muted,fontWeight:700,
                marginBottom:6,fontFamily:C.corpo}}>Para {p.label}</div>
              <p style={{fontSize:14,color:C.creme,opacity:0.85,margin:0,
                fontStyle:"italic",fontFamily:C.corpo,lineHeight:1.7}}>{p.texto}</p>
            </div>
          ))}

          {/* Pergunta final */}
          {resultado.perguntaDuo&&(
            <div style={{background:C.card,border:`1px solid ${C.roxo}44`,
              borderRadius:12,padding:"18px 20px",marginTop:8,marginBottom:28}}>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:C.roxo,fontWeight:700,marginBottom:8,fontFamily:C.corpo}}>
                🎼 Pergunta para os dois
              </div>
              <p style={{fontSize:16,fontStyle:"italic",color:C.creme,
                lineHeight:1.8,margin:0,fontFamily:C.corpo}}>
                {resultado.perguntaDuo}
              </p>
            </div>
          )}

          <button type="button" onClick={()=>setEtapa("menu")}
            style={btnStyle(C.roxo)}>
            Nova sessão a dois →
          </button>
        </div>
      )}
    </div>
  );
}

function TelaDiario({diario, onVoltar}) {
  const [expandido, setExpandido] = useState(null);

  if (diario.length === 0) return (
    <div style={{animation:"up 0.5s ease both"}}>
      <button onClick={onVoltar} style={{background:"none",border:"none",
        cursor:"pointer",color:C.muted,fontSize:10,letterSpacing:"0.22em",
        textTransform:"uppercase",padding:0,fontFamily:C.corpo,marginBottom:28}}>
        ← Voltar
      </button>
      <div style={{textAlign:"center",padding:"60px 24px"}}>
        <div style={{fontSize:32,marginBottom:16}}>📖</div>
        <p style={{fontSize:9,letterSpacing:"0.5em",textTransform:"uppercase",
          color:C.ouro,marginBottom:12,fontFamily:C.corpo}}>Diário do Arquipélago</p>
        <p style={{fontSize:16,color:C.muted,fontStyle:"italic",
          fontFamily:C.corpo,lineHeight:1.8,maxWidth:360,margin:"0 auto"}}>
          Após cada jornada, O Maestro escreve uma entrada aqui —
          um texto literário sobre o que foi revelado.
          Complete sua primeira jornada para começar o diário.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{animation:"up 0.5s ease both"}}>
      <button onClick={onVoltar} style={{background:"none",border:"none",
        cursor:"pointer",color:C.muted,fontSize:10,letterSpacing:"0.22em",
        textTransform:"uppercase",padding:0,fontFamily:C.corpo,marginBottom:28}}>
        ← Voltar
      </button>

      <div style={{textAlign:"center",marginBottom:32}}>
        <p style={{fontSize:9,letterSpacing:"0.6em",textTransform:"uppercase",
          color:C.ouro,marginBottom:8,fontFamily:C.corpo}}>📖 Diário do Arquipélago</p>
        <p style={{fontSize:14,color:C.muted,fontStyle:"italic",
          fontFamily:C.corpo,maxWidth:400,margin:"0 auto"}}>
          O que o Maestro observou em cada jornada.
        </p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {diario.map((entrada, i) => {
          const isExp = expandido === entrada.id;
          const isRecente = i === 0;
          // Extrai a epígrafe — última frase do texto
          const frases = entrada.texto.split(/\n+/).filter(Boolean);
          const epigrafe = frases[frases.length - 1] || "";
          const corpo = frases.slice(0, -1).join("\n\n");

          return (
            <div key={entrada.id}
              onClick={() => setExpandido(isExp ? null : entrada.id)}
              style={{
                background: isRecente ? C.card : C.faint,
                border: `1px solid ${isRecente ? C.ouro+"33" : C.border}`,
                borderLeft: `4px solid ${entrada.ilhaCor || C.ouro}`,
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                transition: "all 0.3s",
                animation: `up 0.4s ease ${i*0.06}s both`,
              }}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",
                justifyContent:"space-between",gap:12,marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{entrada.ilhaEmoji}</span>
                  <div>
                    <div style={{fontSize:9,letterSpacing:"0.4em",
                      textTransform:"uppercase",color:entrada.ilhaCor||C.ouro,
                      fontWeight:700,fontFamily:C.corpo,marginBottom:2}}>
                      Sessão #{entrada.sessao} · {entrada.data}
                    </div>
                    <div style={{fontSize:13,color:C.muted,
                      fontStyle:"italic",fontFamily:C.corpo}}>
                      {entrada.musica} · {entrada.ilha}
                    </div>
                  </div>
                </div>
                <span style={{fontSize:12,color:C.muted,flexShrink:0,
                  marginTop:2}}>{isExp ? "▲" : "▼"}</span>
              </div>

              {/* Epígrafe — sempre visível */}
              <p style={{
                fontSize: 15,
                fontStyle: "italic",
                color: isRecente ? C.creme : C.creme,
                opacity: isRecente ? 0.9 : 0.65,
                fontFamily: C.font,
                lineHeight: 1.5,
                margin: 0,
                borderLeft: `2px solid ${entrada.ilhaCor||C.ouro}44`,
                paddingLeft: 12,
              }}>
                {epigrafe}
              </p>

              {/* Corpo — apenas expandido */}
              {isExp && corpo && (
                <div style={{marginTop:16,paddingTop:16,
                  borderTop:`1px solid ${C.border}`,
                  animation:"up 0.3s ease both"}}>
                  {corpo.split("\n\n").map((p, pi) => (
                    <p key={pi} style={{
                      fontSize: 15,
                      lineHeight: 1.9,
                      color: C.creme,
                      opacity: 0.85,
                      fontFamily: C.corpo,
                      margin: pi < corpo.split("\n\n").length - 1 ? "0 0 14px" : 0,
                    }}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {diario.length > 0 && (
        <p style={{textAlign:"center",fontSize:12,color:C.muted,
          fontStyle:"italic",fontFamily:C.corpo,marginTop:24}}>
          {diario.length} {diario.length===1?"entrada":"entradas"} no diário
        </p>
      )}
    </div>
  );
}

function OndaLanding({onEntrar, modoAba=false}) {
  const S = (d) => `up 0.5s ease ${d}s both`;
  const sec = {padding:"60px 28px 0", maxWidth:660, margin:"0 auto"};
  const tag = {fontSize:9,letterSpacing:"0.55em",textTransform:"uppercase",
    color:C.ouro,marginBottom:12,fontWeight:700,fontFamily:C.corpo};
  const htitle = {fontFamily:C.font,fontStyle:"italic",
    fontSize:"clamp(22px,3.5vw,30px)",color:C.creme,marginBottom:10,lineHeight:1.3};
  const sub = {fontSize:16,color:C.muted,lineHeight:1.8,
    marginBottom:32,fontStyle:"italic",fontFamily:C.corpo};

  return (
    <div style={{background:C.bg,color:C.creme,fontFamily:C.corpo}}>
      <style>{`
        @keyframes shimmerCTA{0%,100%{box-shadow:0 4px 24px rgba(232,184,48,0.15)}50%{box-shadow:0 4px 36px rgba(232,184,48,0.45)}}
        .lnd-cta:hover{background:rgba(232,184,48,0.1)!important}
        .lnd-pill:hover{background:rgba(255,255,255,0.07)!important}
        .lnd-etapa-num{transition:transform 0.2s} .lnd-etapa-num:hover{transform:scale(1.1)}
      `}</style>

      {/* ── HERO ── */}
      <div style={{minHeight:modoAba?"60vh":"100vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"60px 24px",
        position:"relative",overflow:"hidden",textAlign:"center"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:`radial-gradient(ellipse at 20% 20%,${C.azul}0A,transparent 55%),
                      radial-gradient(ellipse at 80% 80%,${C.roxo}08,transparent 50%)`}}/>
        <div style={{display:"flex",alignItems:"center",gap:3,height:28,marginBottom:26}}>
          {WAVES_LANDING.map((h,i)=>(
            <div key={i} style={{width:3,height:`${h*100}%`,borderRadius:2,
              background:`linear-gradient(to top,${C.verde},${C.ouro})`,opacity:0.7,
              animation:`ondas ${0.9+i*0.12}s ease-in-out infinite ${i*0.06}s`}}/>
          ))}
        </div>
        <p style={{...tag,marginBottom:18,animation:S(0.05)}}>✦ &nbsp; Música como Espelho da Alma</p>
        <h1 style={{fontFamily:C.font,fontSize:"clamp(72px,12vw,120px)",fontWeight:400,
          lineHeight:0.9,margin:"0 0 26px",letterSpacing:"0.05em",
          background:`linear-gradient(160deg,${C.ouro} 0%,${C.verdeclaro} 45%,${C.azul} 85%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:S(0.1)}}>ONDA</h1>
        <p style={{fontFamily:C.font,fontStyle:"italic",fontSize:"clamp(18px,3.5vw,26px)",
          fontWeight:400,color:C.creme,maxWidth:500,lineHeight:1.45,margin:"0 0 18px",
          animation:S(0.18)}}>
          Toda música que você ama guarda um segredo sobre você.
        </p>
        <div style={{width:36,height:1,background:C.ouro,opacity:0.4,margin:"0 auto 22px",animation:S(0.22)}}/>
        <p style={{fontSize:17,color:C.muted,maxWidth:380,lineHeight:1.85,
          fontStyle:"italic",animation:S(0.26)}}>
          Não sobre o artista.<br/>
          Sobre{" "}<span style={{color:C.creme,fontStyle:"normal"}}>você</span>
          {" "}— por que aquela letra, por que agora,<br/>por que essa e não outra.
        </p>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,background:C.card,
          border:`1px solid ${C.ouro}28`,borderRadius:"4px 14px 14px 14px",
          padding:"14px 18px",maxWidth:440,margin:"24px auto 32px",
          textAlign:"left",animation:S(0.32)}}>
          <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,
            background:"linear-gradient(135deg,#1A1A2E,#2A2A4E)",
            border:`1.5px solid ${C.ouro}44`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🎼</div>
          <div>
            <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
              color:C.ouro,fontWeight:700,marginBottom:5,fontFamily:C.corpo}}>O Maestro</div>
            <p style={{fontSize:15,fontStyle:"italic",color:C.creme,lineHeight:1.75,margin:0}}>
              "Seu Spotify sabe mais sobre você do que você mesmo. Venha — vamos resolver isso."
            </p>
          </div>
        </div>
        {!modoAba&&(
          <p style={{fontSize:11,color:C.muted,letterSpacing:"0.3em",
            textTransform:"uppercase",animation:S(0.38)}}>
            ↓ Como funciona
          </p>
        )}
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── A JORNADA ── */}
      <div style={{...sec,paddingBottom:60}}>
        <p style={tag}>✦ A Jornada</p>
        <h2 style={htitle}>4 perguntas. 4 respostas. 4 músicas.</h2>
        <p style={sub}>Cada sessão com O Maestro tem a mesma estrutura — simples por fora, precisa por dentro. Você escolhe uma música. Ele faz quatro perguntas que descem em camadas. E ao final entrega quatro músicas que refletem o que foi revelado.</p>

        {/* Etapas */}
        {[
          {n:"♪",cor:C.ouro,label:"Ponto de partida",titulo:"Você escolhe uma música",
            desc:"Qualquer música — brasileira, estrangeira, antiga, nova. A que não sai da cabeça agora. O Maestro escuta a escolha. Ela já diz muita coisa."},
          {n:"1",cor:"#D4A227",label:"Camada 1 — O que você sabe",titulo:'"Por que essa música agora?"',
            desc:"A pergunta mais simples — mas raramente respondida com honestidade. O Maestro escuta o que você consegue nomear."},
          {n:"2",cor:C.roxo,label:"Camada 2 — O que ainda não tem nome",titulo:"O confuso, o contraditório",
            desc:"O que está nas bordas — o sentimento que não cabe em palavras ainda. O Maestro ajuda a dar forma ao que não tem forma."},
          {n:"3",cor:C.azul,label:"Camada 3 — O que é de todos nós",titulo:"Do pessoal ao universal",
            desc:"O que você sente tem nome na música brasileira. O Maestro conecta seu momento ao que a humanidade já cantou antes."},
          {n:"4",cor:C.verdeclaro,label:"Camada 4 — O que você precisa",titulo:"Onde a música vai entrar",
            desc:"A pergunta final — o que você quer que a música faça por você agora. O espaço onde a sessão encontra a vida real."},
        ].map((e,i,arr)=>(
          <div key={i} style={{display:"flex",gap:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:48,flexShrink:0}}>
              <div className="lnd-etapa-num" style={{width:34,height:34,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:600,zIndex:2,
                background:`${e.cor}18`,color:e.cor,border:`1px solid ${e.cor}44`}}>
                {e.n}
              </div>
              {i<arr.length-1&&<div style={{flex:1,width:1,background:"rgba(255,255,255,0.07)",minHeight:16}}/>}
            </div>
            <div style={{padding:"0 0 24px 14px",flex:1}}>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:e.cor,fontWeight:700,marginBottom:4,fontFamily:C.corpo}}>{e.label}</div>
              <div style={{fontFamily:C.font,fontStyle:"italic",fontSize:17,
                color:C.creme,marginBottom:4}}>{e.titulo}</div>
              <div style={{fontSize:14,color:C.muted,lineHeight:1.7,fontStyle:"italic"}}>{e.desc}</div>
            </div>
          </div>
        ))}

        {/* Resultado — 4 músicas */}
        <div style={{display:"flex",gap:0,marginTop:8}}>
          <div style={{width:48,flexShrink:0,display:"flex",justifyContent:"center"}}>
            <div style={{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:13,background:`${C.ouro}18`,
              color:C.ouro,border:`1px solid ${C.ouro}44`}}>✦</div>
          </div>
          <div style={{padding:"0 0 0 14px",flex:1}}>
            <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
              color:C.ouro,fontWeight:700,marginBottom:4,fontFamily:C.corpo}}>Resultado</div>
            <div style={{fontFamily:C.font,fontStyle:"italic",fontSize:17,
              color:C.creme,marginBottom:8}}>Quatro músicas — um espelho</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {[
                {cor:C.ouro,tag:"✦ A sua música",nome:"A que você escolheu"},
                {cor:C.verdeclaro,tag:"⊙ Próxima ressonância",nome:"Perto do seu mundo"},
                {cor:C.azul,tag:"◎ Outro território",nome:"Mesma emoção, outro gênero"},
                {cor:C.roxo,tag:"✧ Expansão",nome:"Uma surpresa que faz sentido"},
              ].map((m,i)=>(
                <div key={i} style={{background:C.faint,border:`1px solid ${m.cor}22`,
                  borderLeft:`3px solid ${m.cor}`,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:9,letterSpacing:"0.3em",textTransform:"uppercase",
                    color:m.cor,fontWeight:700,marginBottom:4,fontFamily:C.corpo}}>{m.tag}</div>
                  <div style={{fontSize:13,fontStyle:"italic",color:C.creme,lineHeight:1.4}}>{m.nome}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── ARQUIPÉLAGO ── */}
      <div style={{background:C.ocean,...sec,paddingBottom:60}}>
        <p style={tag}>✦ O Arquipélago Emocional</p>
        <h2 style={htitle}>Cada jornada revela uma ilha</h2>
        <p style={sub}>Ao final de cada sessão, O Maestro identifica a emoção dominante e acende uma ilha no seu arquipélago. As ilhas crescem com visitas. O mapa acumula a sua história emocional ao longo do tempo.</p>

        {/* Mapa das ilhas */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,
          margin:"0 0 20px",padding:"0 4px"}}>
          {ILHAS_LAND.map((ilha,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
              <div style={{width:ilha.vis?38:24,height:ilha.vis?38:24,borderRadius:"50%",
                background:ilha.cor,opacity:ilha.vis?1:0.2,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,transition:"transform 0.3s",cursor:"default"}}>
                {ilha.vis?ilha.emoji:""}
              </div>
              <span style={{fontSize:10,color:ilha.vis?C.muted:"rgba(160,168,176,0.3)",
                textAlign:"center",lineHeight:1.3,fontFamily:C.corpo}}>{ilha.nome}</span>
            </div>
          ))}
        </div>

        {/* Constelação */}
        <div style={{background:C.card,border:`1px solid ${C.roxo}44`,
          borderLeft:`3px solid ${C.roxo}`,borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
            color:C.roxo,fontWeight:700,marginBottom:8,fontFamily:C.corpo}}>
            🎼 Constelação Emocional — desbloqueada após 5 jornadas
          </div>
          <p style={{fontSize:15,fontStyle:"italic",color:C.creme,lineHeight:1.8,margin:"0 0 10px"}}>
            "Você sempre vai da Ilha Roxa para a Ilha Cinza. Isso tem um nome — e não é coincidência."
          </p>
          <p style={{fontSize:13,color:C.muted,fontStyle:"italic",lineHeight:1.7,margin:0}}>
            Após 5 sessões, O Maestro analisa os padrões entre todas as suas ilhas — as conexões, as tensões, as ausências. Uma leitura que nenhuma sessão isolada poderia revelar. E se quiser, ele relê a qualquer momento com novos olhos.
          </p>
        </div>
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── DESAFIO SEMANAL ── */}
      <div style={{background:C.ocean,...sec,paddingBottom:60}}>
        <p style={tag}>✦ O Desafio Semanal</p>
        <h2 style={htitle}>Toda semana, uma provocação do Maestro</h2>
        <p style={sub}>O Maestro não espera você chegar em crise. Todo domingo ele lança um desafio com intenção — uma música para ouvir, uma emoção para explorar, um ângulo que você não considerou.</p>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {cor:"#5A5A7A",emoji:"🖤",titulo:"A música que você evita",
              desc:"Existe uma música que você passa rápido no Spotify fingindo que não viu. Esta semana, ouça ela."},
            {cor:"#D4A227",emoji:"⏳",titulo:"Você com 17 anos",
              desc:"Qual música a versão de você com 17 anos precisaria ouvir hoje? Essa pessoa ainda mora em você."},
            {cor:"#8A4FD4",emoji:"🤫",titulo:"A música que você não mostraria",
              desc:"O que a gente esconde diz mais do que o que a gente mostra. Freud concordaria."},
            {cor:"#3A9A5A",emoji:"💚",titulo:"A música do que você ainda acredita",
              desc:"Em meio ao que está pesado, existe algo que você ainda acredita que vai melhorar."},
          ].map((d,i)=>(
            <div key={i} style={{background:C.faint,border:`1px solid ${d.cor}22`,
              borderLeft:`3px solid ${d.cor}`,borderRadius:10,
              padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{d.emoji}</span>
              <div>
                <div style={{fontSize:13,color:d.cor,fontWeight:700,
                  fontFamily:C.corpo,letterSpacing:"0.05em",marginBottom:3}}>{d.titulo}</div>
                <div style={{fontSize:13,color:C.muted,fontStyle:"italic",
                  fontFamily:C.corpo,lineHeight:1.6}}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{fontSize:13,color:C.muted,fontStyle:"italic",
          textAlign:"center",marginTop:20,fontFamily:C.corpo,lineHeight:1.7}}>
          12 desafios diferentes, selecionados pelo Maestro com base no seu padrão emocional.
        </p>
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── SESSÃO A DOIS ── */}
      <div style={{...sec,paddingBottom:60}}>
        <p style={tag}>✦ Sessão a Dois</p>
        <h2 style={htitle}>A mesma música. Duas jornadas. Uma comparação.</h2>
        <p style={sub}>Você e outra pessoa fazem a jornada com a mesma música — separadamente, sem ver a resposta do outro. Depois o Maestro lê as duas e compara o que foi revelado.</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[
            {emoji:"🩵",nome:"Leveza",pessoa:"Pessoa A"},
            {emoji:"🖤",nome:"Sombra",pessoa:"Pessoa B"},
          ].map((p,i)=>(
            <div key={i} style={{background:C.faint,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:6}}>{p.emoji}</div>
              <div style={{fontSize:12,color:C.muted,fontFamily:C.corpo,
                marginBottom:4,letterSpacing:"0.06em"}}>{p.nome}</div>
              <div style={{fontSize:11,color:C.muted,opacity:0.6,
                fontStyle:"italic",fontFamily:C.corpo}}>{p.pessoa}</div>
            </div>
          ))}
        </div>

        <div style={{background:C.card,border:`1px solid ${C.roxo}33`,
          borderLeft:`3px solid ${C.roxo}`,borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
            color:C.roxo,fontWeight:700,marginBottom:8,fontFamily:C.corpo}}>🎼 O Maestro compara</div>
          <p style={{fontSize:15,fontStyle:"italic",color:C.creme,
            lineHeight:1.75,margin:0,fontFamily:C.corpo}}>
            "Vocês dois escolheram a mesma música. Chegaram em ilhas completamente diferentes. Isso é fascinante — e não é por acaso."
          </p>
        </div>

        <p style={{fontSize:13,color:C.muted,fontStyle:"italic",
          textAlign:"center",marginTop:16,fontFamily:C.corpo,lineHeight:1.7}}>
          Funciona com casais, amigos, irmãos — qualquer pessoa que você queira conhecer de um ângulo diferente.
        </p>
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── DIÁRIO DO ARQUIPÉLAGO ── */}
      <div style={{background:C.ocean,...sec,paddingBottom:60}}>
        <p style={tag}>✦ O Diário do Arquipélago</p>
        <h2 style={htitle}>O Maestro escreve sobre você</h2>
        <p style={sub}>Após cada jornada, o Maestro escreve uma entrada no seu diário — não um resumo clínico, mas um texto literário curto sobre o que foi revelado. Com o tempo, você tem um diário emocional escrito em linguagem musical.</p>

        {/* Exemplo de entrada do diário */}
        <div style={{background:C.card,border:`1px solid ${C.ouro}22`,
          borderLeft:`4px solid #D44A8A`,borderRadius:14,padding:"22px 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontSize:20}}>🩷</span>
            <div>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:"#D44A8A",fontWeight:700,fontFamily:C.corpo}}>Sessão #3 · Ilha Rosa · Ternura</div>
              <div style={{fontSize:12,color:C.muted,fontStyle:"italic",fontFamily:C.corpo}}>
                exemplo de entrada
              </div>
            </div>
          </div>
          <p style={{fontSize:15,lineHeight:1.9,color:C.creme,opacity:0.85,
            margin:"0 0 12px",fontFamily:C.corpo}}>
            Há uma diferença entre escolher uma música porque ela nos aquece e escolhê-la porque ela nos lembra que fomos aquecidos uma vez. Esta sessão foi sobre a segunda.
          </p>
          <p style={{fontSize:15,lineHeight:1.9,color:C.creme,opacity:0.75,
            margin:0,fontFamily:C.corpo,fontStyle:"italic",
            borderLeft:`2px solid #D44A8A44`,paddingLeft:12}}>
            Ternura não é fraqueza — é a forma mais precisa de coragem.
          </p>
        </div>

        <p style={{fontSize:13,color:C.muted,fontStyle:"italic",
          textAlign:"center",marginTop:16,fontFamily:C.corpo,lineHeight:1.7}}>
          Cada entrada termina com uma frase que funciona como epígrafe — a essência da sessão em uma linha.
        </p>
      </div>

      <div style={{height:1,background:"rgba(255,255,255,0.04)"}}/>

      {/* ── CTA FINAL ── */}
      <div style={{padding:"60px 28px",textAlign:"center"}}>
        <p style={{fontFamily:C.font,fontStyle:"italic",fontSize:"clamp(18px,3.5vw,26px)",
          color:C.creme,maxWidth:380,margin:"0 auto 28px",lineHeight:1.45}}>
          Qual música você queria ouvir agora?
        </p>
        <button className="lnd-cta" onClick={onEntrar} style={{
          background:"transparent",border:`1px solid ${C.ouro}80`,
          borderRadius:100,padding:"14px 48px",fontFamily:C.corpo,
          fontSize:13,letterSpacing:"0.25em",textTransform:"uppercase",
          color:C.ouro,cursor:"pointer",transition:"all 0.3s",marginBottom:14,
          animation:"shimmerCTA 2.5s ease 0.5s infinite",display:"inline-block"}}>
          {modoAba?"Começar uma nova jornada →":"Começar minha jornada →"}
        </button>
        <p style={{fontSize:13,color:C.muted,fontStyle:"italic",lineHeight:1.7}}>
          Pode ser revelador. Pode ser desconfortável.<br/>
          Com certeza vai ser interessante.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function Onda() {
  const [tela,setTela]=useState("carregando");
  const [perfil,setPerfil]=useState(null);
  const [nivel,setNivel]=useState(1);
  const [ilhasVisitadas,setIlhas]=useState([]);
  const [streak,setStreak]=useState(0);
  const [ultimaVisita,setUltima]=useState(null);

  const [perguntaPendente,setPerguntaPendente]=useState("");
  const [ultimaSessao,setUltimaSessao]=useState(null);
  const [modoRetomada,setModoRetomada]=useState(false);
  const [musicaPedida,setMusicaPedida]=useState("");
  const [musicas,setMusicas]=useState(null);
  const [novaIlha,setNovaIlha]=useState(null);
  const [comentario,setComentario]=useState("");
  const [sessoes,setSessoes]=useState([]);
  const [leituras,setLeituras]=useState([]);
  const [verConstelacao,setVerConstelacao]=useState(false);
  const [mostrarConstelacaoApos,setMostrarConstelacaoApos]=useState(false);
  const [verSobre,setVerSobre]=useState(false);
  const [desafioAceito,setDesafioAceito]=useState(false);
  const [diario,setDiario]=useState([]); // entradas do diário do arquipélago
  const [verDiario,setVerDiario]=useState(false);
  const [verDuo,setVerDuo]=useState(false);

  useEffect(()=>{
    (async()=>{
      const s=await load();
      if(s){
        const ilhasLimpas = normalizarIlhas(s.ilhas||[]);
        const sessoesLimpas = normalizarSessoes(s.sessoes||[]);
        setPerfil(s.perfil||null);
        setNivel(s.nivel||1);
        setIlhas(ilhasLimpas);
        setStreak(s.streak||0);
        setUltima(s.ultimaVisita||null);
        setPerguntaPendente(s.perguntaPendente||"");
        setUltimaSessao(s.ultimaSessao||null);
        setSessoes(sessoesLimpas);
        setLeituras(s.leituras||[]);
        // Desafio — verifica se já aceitou esta semana
        const semanaAtual = semanaDoAno();
        if (s.desafioSemana === semanaAtual) setDesafioAceito(s.desafioAceito||false);
        setDiario(s.diario||[]);
        const tinhaLixo = (s.ilhas||[]).length !== ilhasLimpas.length;
        if (tinhaLixo) save({...s, ilhas:ilhasLimpas, sessoes:sessoesLimpas});
        setTela("inicio"); // usuário que volta — vai direto ao arquipélago
      } else {
        setTela("landing"); // primeiro acesso — mostra landing page
      }
    })();
  },[]);

  const onPerfil=useCallback((upd)=>{
    setPerfil(prev=>{const m={...prev,...upd};save({perfil:m,nivel,ilhas:ilhasVisitadas,streak,ultimaVisita});return m;});
  },[nivel,ilhasVisitadas,streak,ultimaVisita]);

  const onResultado=(mus,hist,resultado)=>{
    setMusicaPedida(mus);
    setMusicas(resultado.musicas);
    setComentario(resultado.comentario);

    // Identifica a ilha — resolve qualquer formato (chave, hex, nome, emoção)
    const cor = resolverIlha(resultado.ilhaCor) || "cinza";
    const infoIlha = ILHAS_SISTEMA[cor];
    const ilha = infoIlha ? { cor, ...infoIlha } : null;
    setNovaIlha(ilha);

    // Atualiza ilhas visitadas — usa resolverIlha para comparar corretamente
    // independente de como a cor estava salva (hex antigo ou chave nova)
    let novasIlhas = [...ilhasVisitadas];
    if (ilha) {
      const idxExistente = novasIlhas.findIndex(i => resolverIlha(i.cor) === cor);
      if (idxExistente >= 0) {
        // Já existe — incrementa e normaliza
        novasIlhas[idxExistente] = {
          ...novasIlhas[idxExistente],
          ...ILHAS_SISTEMA[cor],
          cor,
          visitas: (novasIlhas[idxExistente].visitas || 1) + 1,
        };
      } else {
        novasIlhas.push({ ...ilha, visitas: 1 });
      }
    }

    // Streak
    const hoje=new Date().toDateString();
    let novoStreak=streak;
    if(ultimaVisita!==hoje){
      const ontem=new Date(Date.now()-86400000).toDateString();
      novoStreak=ultimaVisita===ontem?streak+1:1;
    }

    // Pergunta pendente — extrai a última frase interrogativa do comentário
    const comentarioTexto=resultado.comentario||"";
    const frases=comentarioTexto.split(/(?<=[.!?])\s+/);
    const pergunta=frases.find(f=>f.includes("?"))||"";
    setPerguntaPendente(pergunta);

    // Última sessão para retomada
    const sessao={musica:mus, ilha:ilha?.nome||"", ilhaCor:cor, comentario:comentarioTexto};
    setUltimaSessao(sessao);

    // Registra sessão no histórico da constelação
    const novaSessao = {
      musica: mus,
      ilha: ilha?.nome||cor||"",
      emocao: ilha?.emocao||"",
      ilhaCor: cor,
      data: new Date().toLocaleDateString("pt-BR"),
    };
    const novasSessoes = [...sessoes, novaSessao];
    setSessoes(novasSessoes);

    const nl=Math.min(5,nivel+1);
    setNivel(nl);setIlhas(novasIlhas);setStreak(novoStreak);setUltima(hoje);
    save({
      perfil, nivel:nl, ilhas:novasIlhas, streak:novoStreak, ultimaVisita:hoje,
      perguntaPendente:pergunta, ultimaSessao:sessao,
      sessoes:novasSessoes, leituras,
      desafioSemana:semanaDoAno(), desafioAceito,
      diario,
    });

    // Gera entrada do diário em background — não bloqueia o fluxo
    setTimeout(async () => {
      try {
        const nomeIlha = ilha?.nome || cor || "?";
        const raw = await ai(
          Q.diario(mus, hist, nomeIlha, comentarioTexto, perfil, novasSessoes.length),
          MAESTRO_SYS(perfil, nl, novasIlhas)
        );
        if (raw?.trim()) {
          const entrada = {
            id: Date.now(),
            data: new Date().toLocaleDateString("pt-BR"),
            dataISO: new Date().toISOString(),
            musica: mus,
            ilha: nomeIlha,
            ilhaCor: cor,
            ilhaEmoji: ilha?.emoji || "🎵",
            sessao: novasSessoes.length,
            texto: raw.trim(),
          };
          setDiario(prev => {
            const novas = [entrada, ...prev]; // mais recente primeiro
            save({
              perfil, nivel:nl, ilhas:novasIlhas, streak:novoStreak, ultimaVisita:hoje,
              perguntaPendente:pergunta, ultimaSessao:sessao,
              sessoes:novasSessoes, leituras,
              desafioSemana:semanaDoAno(), desafioAceito,
              diario:novas,
            });
            return novas;
          });
        }
      } catch(e) { console.error("Diário:", e); }
    }, 2000); // espera 2s para não competir com a transição de tela

    // Após a 5ª sessão (e múltiplos de 5), mostra constelação automaticamente no fluxo
    if (novasSessoes.length >= 5 && novasSessoes.length % 5 === 0) {
      setTela("musicas");
      setMostrarConstelacaoApos(true);
    } else {
      setTela("musicas");
    }
  };

  const onNovaLeitura = (leitura) => {
    // Substitui a leitura atual — o Maestro pode mudar de interpretação
    const novasLeituras = [leitura]; // sempre uma leitura viva, a mais recente
    setLeituras(novasLeituras);
    save({perfil,nivel,ilhas:ilhasVisitadas,streak,ultimaVisita,
      perguntaPendente,ultimaSessao,sessoes,leituras:novasLeituras});
  };

  const reiniciar=()=>{
    setMusicas(null);setNovaIlha(null);setMusicaPedida("");setComentario("");
    setModoRetomada(false);setVerConstelacao(false);setMostrarConstelacaoApos(false);
    setTela("inicio");
  };
  const novaJornada=()=>{
    setPerguntaPendente("");setUltimaSessao(null);
    reiniciar();
    save({perfil,nivel,ilhas:ilhasVisitadas,streak,ultimaVisita,
      perguntaPendente:"",ultimaSessao:null,sessoes,leituras});
  };
  const resetTotal=async()=>{
    setPerfil(null);setNivel(1);setIlhas([]);setStreak(0);setUltima(null);
    setPerguntaPendente("");setUltimaSessao(null);setModoRetomada(false);
    setSessoes([]);setLeituras([]);setVerConstelacao(false);setMostrarConstelacaoApos(false);
    setDesafioAceito(false);setDiario([]);setVerDiario(false);setVerDuo(false);
    setMusicas(null);setNovaIlha(null);setMusicaPedida("");setComentario("");
    try{await window.storage.delete(KEY);}catch{}
    setTela("landing"); // volta para a landing ao recomeçar do zero
  };

  if(tela==="carregando") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{fontFamily:C.corpo,color:C.muted,fontStyle:"italic"}}>Sintonizando…</p>
    </div>
  );

  if(tela==="landing") return <OndaLanding onEntrar={()=>setTela("inicio")}/>;

  // Barra de navegação permanente
  const telaAtiva = verDuo ? "duo" : verDiario ? "diario" : verSobre ? "sobre" : "jornada";

  const NavBar = () => (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      gap:3,marginBottom:32,
      background:C.faint,border:`1px solid ${C.border}`,
      borderRadius:100,padding:"4px",maxWidth:520,margin:"0 auto 36px",
    }}>
      {[
        {id:"jornada", label:"Jornada"},
        {id:"duo",     label:"A Dois"},
        {id:"diario",  label:`Diário${diario.length>0?` (${diario.length})`:""}`},
        {id:"sobre",   label:"Sobre"},
      ].map(tab=>{
        const ativo = telaAtiva === tab.id;
        return (
          <button key={tab.id} onClick={()=>{
            setVerDuo(tab.id==="duo");
            setVerDiario(tab.id==="diario");
            setVerSobre(tab.id==="sobre");
          }}
            style={{
              flex:1,padding:"8px 8px",borderRadius:100,border:"none",
              background:ativo?C.card:"transparent",
              color:ativo?C.creme:C.muted,
              fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",
              cursor:"pointer",fontFamily:C.corpo,
              transition:"all 0.25s",
              boxShadow:ativo?`0 2px 8px rgba(0,0,0,0.3)`:"none",
            }}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // Tela Sessão a Dois
  if(verDuo) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.corpo,color:C.creme,
      padding:"44px 24px 80px",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.3);opacity:1}}
        @keyframes ondas{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
      `}</style>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <NavBar/>
        <TelaDuo
          perfil={perfil} nivel={nivel} ilhas={ilhasVisitadas}
          onResultado={onResultado} onPerfil={onPerfil}
          onVoltar={()=>setVerDuo(false)}
        />
      </div>
    </div>
  );

  // Tela Diário
  if(verDiario) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.corpo,color:C.creme,
      padding:"44px 24px 80px",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <NavBar/>
        <TelaDiario diario={diario} onVoltar={()=>setVerDiario(false)}/>
      </div>
    </div>
  );

  // Tela "Sobre o ONDA" — landing sempre acessível
  if(verSobre) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.corpo,color:C.creme,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ondas{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
        @keyframes shimmerCTA{0%,100%{box-shadow:0 4px 24px rgba(232,184,48,0.15)}50%{box-shadow:0 4px 36px rgba(232,184,48,0.45)}}
        .lnd-cta:hover{background:rgba(232,184,48,0.1)!important}
      `}</style>
      <div style={{maxWidth:820,margin:"0 auto",padding:"32px 24px 0"}}>
        <NavBar/>
      </div>
      <OndaLanding modoAba={true} onEntrar={()=>{setVerSobre(false);setVerDiario(false);}}/>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.corpo,color:C.creme,
      padding:"44px 24px 100px",position:"relative",overflowX:"hidden",
      paddingBottom:"max(100px, env(safe-area-inset-bottom, 100px))"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.08);opacity:1}}
        @keyframes ondas{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
        @keyframes shimmer{0%,100%{box-shadow:0 4px 24px rgba(212,162,39,0.2)}50%{box-shadow:0 8px 36px rgba(212,162,39,0.5)}}
        textarea:focus{border-color:${C.verdeclaro}!important}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:${C.faint};border-radius:4px}
        ::placeholder{color:#3A5060}
        button:not(:disabled):hover{opacity:0.82;transform:translateY(-1px)}
        a:hover{opacity:0.8!important}
      `}</style>

      <div style={{position:"fixed",inset:0,
        background:`radial-gradient(ellipse at 25% 15%, ${C.azul}07, transparent 55%),
                    radial-gradient(ellipse at 75% 75%, ${C.roxo}05, transparent 50%)`,
        pointerEvents:"none"}}/>

      <div style={{maxWidth:820,margin:"0 auto",position:"relative"}}>

        <NavBar/>

        {/* CONSTELAÇÃO — acessível da tela inicial ou após 5ª sessão */}
        {(tela==="inicio"&&verConstelacao)||(tela==="musicas"&&verConstelacao)?(
          <TelaConstelacao
            perfil={perfil}
            ilhas={ilhasVisitadas}
            sessoes={sessoes}
            leituras={leituras}
            onNovaLeitura={onNovaLeitura}
            autoGerar={mostrarConstelacaoApos}
            onVoltar={()=>{setVerConstelacao(false);setMostrarConstelacaoApos(false);}}
          />
        ):null}

        {/* INÍCIO */}
        {tela==="inicio"&&!verConstelacao&&(
          <div style={{animation:"up 0.7s ease both"}}>

            {/* Header */}
            <div style={{textAlign:"center",marginBottom:40}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,height:28,marginBottom:22}}>
                {[0.3,0.6,1,0.7,0.4,1,0.5,0.8,0.6,0.3,0.9,0.5,0.7,1,0.4,0.6,0.3,0.8,0.5,1].map((hh,i)=>(
                  <div key={i} style={{width:3,height:`${hh*100}%`,
                    background:`linear-gradient(to top, ${C.verde}, ${C.ouro})`,
                    borderRadius:2,opacity:0.65,
                    animation:`ondas ${0.9+i*0.12}s ease-in-out infinite ${i*0.06}s`}}/>
                ))}
              </div>
              <p style={{fontSize:9,letterSpacing:"0.65em",textTransform:"uppercase",
                color:C.verdeclaro,marginBottom:10,fontFamily:C.corpo}}>
                ✦ &nbsp; Música como Espelho da Alma
              </p>
              <h1 style={{fontSize:"clamp(64px,12vw,120px)",fontWeight:400,lineHeight:0.9,
                margin:"0 0 14px",letterSpacing:"0.05em",fontFamily:C.font,
                background:`linear-gradient(160deg, ${C.ouro} 0%, ${C.verdeclaro} 45%, ${C.azul} 85%)`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ONDA</h1>
              <p style={{fontSize:13,color:C.muted,fontStyle:"italic",fontFamily:C.corpo}}>
                com O Maestro
              </p>
            </div>

            {/* Arquipélago */}
            <Arquipelago ilhasVisitadas={ilhasVisitadas} novaIlha={null} streak={streak}/>

            {/* Legenda das ilhas */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:28}}>
              {Object.entries(ILHAS_SISTEMA).map(([cor,ilha])=>{
                const visitada=ilhasVisitadas.find(i=>i.cor===cor);
                return(
                  <div key={cor} style={{display:"flex",alignItems:"center",gap:5,
                    background:visitada?`${ilha.cor}22`:C.faint,
                    border:`1px solid ${visitada?ilha.cor+"44":C.border}`,
                    borderRadius:100,padding:"3px 10px",transition:"all 0.3s"}}>
                    <div style={{width:9,height:9,borderRadius:"50%",background:visitada?ilha.cor:C.muted,flexShrink:0}}/>
                    <span style={{fontSize:12,color:visitada?ilha.cor:C.muted,
                      fontFamily:C.corpo,letterSpacing:"0.03em",fontWeight:visitada?600:400}}>{ilha.emocao}</span>
                  </div>
                );
              })}
            </div>

            {ilhasVisitadas.length>0&&(
              <p style={{textAlign:"center",fontSize:12,color:C.muted,fontStyle:"italic",
                marginBottom:16,fontFamily:C.corpo}}>
                {ilhasVisitadas.length} {ilhasVisitadas.length===1?"ilha descoberta":"ilhas descobertas"}
                {streak>1?` · 🔥 ${streak} dias seguidos`:""}
              </p>
            )}

            {/* Botão Constelação — disponível após 5 sessões */}
            {sessoes.length >= 1 && (
              <div style={{textAlign:"center",marginBottom:28}}>
                <button onClick={()=>sessoes.length>=5&&setVerConstelacao(true)} style={{
                  background:"transparent",
                  border:`1px solid ${sessoes.length>=5?C.roxo+"66":C.border}`,
                  borderRadius:100,padding:"8px 22px",
                  fontSize:11,letterSpacing:"0.22em",textTransform:"uppercase",
                  cursor:sessoes.length>=5?"pointer":"default",fontFamily:C.corpo,
                  color:sessoes.length>=5?C.roxo:C.muted,
                  transition:"all 0.3s",
                }}>
                  ✦ Constelação Emocional
                  {sessoes.length<5&&(
                    <span style={{fontSize:10,opacity:0.6,marginLeft:6}}>
                      · {5-sessoes.length} sess{5-sessoes.length===1?"ão":"ões"} para revelar
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Pergunta pendente ou nova jornada */}
            <div style={{maxWidth:540,margin:"0 auto"}}>

              {/* Desafio Semanal — aparece quando não há conversa pendente */}
              {!perguntaPendente&&!modoRetomada&&(()=>{
                const semana = semanaDoAno();
                const desafio = selecionarDesafio(sessoes, ilhasVisitadas, semana);
                return (
                  <CardDesafio
                    desafio={desafio}
                    aceito={desafioAceito}
                    onAceitar={()=>{
                      setDesafioAceito(true);
                      save({
                        perfil,nivel,ilhas:ilhasVisitadas,streak,ultimaVisita,
                        perguntaPendente,ultimaSessao,sessoes,leituras,
                        desafioSemana:semana,desafioAceito:true,
                      });
                    }}
                  />
                );
              })()}

              {perguntaPendente&&ultimaSessao&&!modoRetomada&&(
                <div style={{marginBottom:28,animation:"up 0.5s ease both"}}>
                  <div style={{background:C.card,border:`1px solid ${C.ouro}33`,
                    borderLeft:`4px solid ${C.ouro}`,borderRadius:14,
                    padding:"20px 22px",marginBottom:16}}>
                    <div style={{fontSize:8,letterSpacing:"0.45em",textTransform:"uppercase",
                      color:C.ouro,marginBottom:10,fontFamily:C.corpo}}>
                      🎼 O Maestro ficou esperando...
                    </div>
                    <p style={{fontSize:15,lineHeight:1.85,color:C.creme,margin:"0 0 16px",
                      fontStyle:"italic",fontFamily:C.corpo}}>
                      {perguntaPendente}
                    </p>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <Btn cor={C.ouro} fn={()=>setModoRetomada(true)}
                        ch="Continuar conversa →" sx={{marginTop:0,padding:"10px 22px"}}/>
                      <Btn outline fn={novaJornada}
                        ch="Nova jornada" sx={{marginTop:0}}/>
                    </div>
                  </div>
                </div>
              )}

              {/* Modo retomada */}
              {modoRetomada&&(
                <Dialogo
                  perfil={perfil} nivel={nivel} ilhas={ilhasVisitadas}
                  onResultado={onResultado} onPerfil={onPerfil}
                  retomada={{
                    pergunta:perguntaPendente,
                    musica:ultimaSessao?.musica||"",
                    ilha:ultimaSessao?.ilha||"",
                  }}
                />
              )}

              {/* Nova jornada — com desafio ativo se foi aceito */}
              {!perguntaPendente&&!modoRetomada&&(()=>{
                const semana = semanaDoAno();
                const desafio = desafioAceito
                  ? selecionarDesafio(sessoes, ilhasVisitadas, semana)
                  : null;
                return (
                  <Dialogo
                    perfil={perfil} nivel={nivel} ilhas={ilhasVisitadas}
                    onResultado={onResultado} onPerfil={onPerfil}
                    desafioAtivo={desafio}
                  />
                );
              })()}
            </div>

            {perfil&&(
              <div style={{textAlign:"center",marginTop:40}}>
                <Btn outline fn={resetTotal} ch="Recomeçar do zero"/>
              </div>
            )}

            {/* Painel de diagnóstico — sempre visível */}
            <div style={{marginTop:32,padding:"16px 20px",
              background:C.faint,border:`1px solid ${C.border}`,
              borderRadius:12,fontSize:12,fontFamily:C.corpo,color:C.muted}}>
              <div style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                marginBottom:10,color:C.muted}}>Diagnóstico</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
                <span>Sessões registradas: <strong style={{color:C.creme}}>{sessoes.length}</strong></span>
                <span>Ilhas no arquipélago: <strong style={{color:C.creme}}>{ilhasVisitadas.length}</strong></span>
                <span>Streak: <strong style={{color:C.creme}}>{streak} dias</strong></span>
                <span>Círculo: <strong style={{color:C.creme}}>{nivel}</strong></span>
              </div>
              {sessoes.length>0&&(
                <div style={{marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                  {[...sessoes].reverse().map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"3px 0",
                      fontSize:11,color:i===0?C.creme:C.muted}}>
                      <span style={{opacity:0.5}}>#{sessoes.length-i}</span>
                      <span style={{fontStyle:"italic",flex:1}}>{s.musica}</span>
                      <span>{ILHAS_SISTEMA[resolverIlha(s.ilhaCor)]?.emoji||"?"}</span>
                      <span>{ILHAS_SISTEMA[resolverIlha(s.ilhaCor)]?.emocao||s.ilhaCor||"—"}</span>
                      <span style={{opacity:0.5}}>{s.data}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MÚSICAS */}
        {tela==="musicas"&&musicas&&(
          <div style={{animation:"up 0.6s ease both"}}>
            <button onClick={reiniciar} style={{background:"none",border:"none",cursor:"pointer",
              color:C.muted,fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",
              padding:0,fontFamily:C.corpo,marginBottom:28}}>← Voltar</button>

            {/* Nova ilha */}
            {novaIlha&&(
              <div style={{background:`linear-gradient(135deg, ${novaIlha.cor}18, ${C.card})`,
                border:`1px solid ${novaIlha.cor}44`,borderRadius:16,
                padding:"20px 24px",marginBottom:24,textAlign:"center",
                animation:"up 0.5s ease both"}}>
                <div style={{fontSize:9,letterSpacing:"0.5em",textTransform:"uppercase",
                  color:novaIlha.cor,marginBottom:6,fontFamily:C.corpo}}>
                  ✦ {ilhasVisitadas.find(i=>i.cor===novaIlha.cor)?.visitas>1?"Você voltou à":"Nova ilha descoberta"}
                </div>
                <div style={{fontSize:24,marginBottom:4}}>{novaIlha.emoji}</div>
                <div style={{fontSize:20,fontStyle:"italic",color:C.creme,fontFamily:C.corpo}}>
                  {novaIlha.nome}
                </div>
                <p style={{fontSize:13,color:C.muted,margin:"6px 0 0",fontStyle:"italic",fontFamily:C.corpo}}>
                  {novaIlha.desc}
                </p>
              </div>
            )}

            {/* Arquipélago atualizado */}
            <Arquipelago
              ilhasVisitadas={ilhasVisitadas.filter(i=>!novaIlha||i.cor!==novaIlha.cor)}
              novaIlha={novaIlha}
              streak={streak}/>

            {/* Comentário do Maestro */}
            {comentario&&<BalaM texto={comentario} delay={0.2}/>}

            {/* Título */}
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:9,letterSpacing:"0.5em",textTransform:"uppercase",
                color:C.ouro,fontWeight:700,fontFamily:C.corpo}}>Suas Músicas</div>
            </div>

            {/* Música pedida */}
            {musicas[0]&&<div style={{marginBottom:12}}><CardM m={musicas[0]} idx={0}/></div>}

            {/* Divisor */}
            <div style={{display:"flex",alignItems:"center",gap:14,margin:"20px 0 16px"}}>
              <div style={{flex:1,height:1,background:`linear-gradient(to right, transparent, ${C.border})`}}/>
              <span style={{fontSize:9,letterSpacing:"0.4em",textTransform:"uppercase",
                color:C.muted,fontFamily:C.corpo}}>e o que ela abre</span>
              <div style={{flex:1,height:1,background:`linear-gradient(to left, transparent, ${C.border})`}}/>
            </div>

            {/* Complementares */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:40}}>
              {musicas.slice(1).map((m,i)=><CardM key={i} m={m} idx={i+1}/>)}
            </div>

            <div style={{textAlign:"center",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <Btn fn={()=>{reiniciar();setTimeout(()=>setModoRetomada(false),50);}}
                ch="Nova jornada →" cor={C.ouro}
                sx={{animation:"shimmer 2.5s ease infinite"}}/>
            </div>

            {/* Constelação — aparece automaticamente na 5ª sessão e múltiplos */}
            {mostrarConstelacaoApos && (
              <div style={{marginTop:32,padding:"20px 24px",
                background:`linear-gradient(135deg, ${C.roxo}18, ${C.card})`,
                border:`1px solid ${C.roxo}55`,borderRadius:16,
                textAlign:"center",animation:"up 0.7s ease 0.5s both"}}>
                <div style={{fontSize:24,marginBottom:8}}>✦</div>
                <div style={{fontSize:9,letterSpacing:"0.5em",textTransform:"uppercase",
                  color:C.roxo,marginBottom:10,fontFamily:C.corpo,fontWeight:700}}>
                  Constelação Emocional revelada
                </div>
                <p style={{fontSize:14,color:C.creme,opacity:0.85,fontStyle:"italic",
                  fontFamily:C.corpo,marginBottom:16,lineHeight:1.7}}>
                  Você completou {sessoes.length} sessões. O Maestro pode agora ler os padrões entre todas as suas ilhas.
                </p>
                <Btn cor={C.roxo} fn={()=>setVerConstelacao(true)}
                  ch="Ver minha constelação →" sx={{marginTop:0}}/>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
