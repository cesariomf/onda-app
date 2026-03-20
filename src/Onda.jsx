import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════
const KEY = "onda_v6";
const load = async () => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = async (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════════
// ILHAS — sistema fixo de cores e emoções
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
async function ai(prompt, sistema = "") {
  const body = { model:"claude-sonnet-4-20250514", max_tokens:2400, messages:[{role:"user",content:prompt}] };
  if (sistema) body.system = sistema;
  const r = await fetch("/api/claude", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const d = await r.json();
  return d.content?.map(c=>c.text||"").join("")||"";
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
  return (
    <textarea value={v} onChange={e=>set(e.target.value)} placeholder={ph}
      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enter?.();}}}
      style={{width:"100%",background:"#05070C",border:`1px solid ${C.border}`,borderRadius:10,
        padding:"14px 18px",fontSize:17,fontFamily:C.corpo,color:C.creme,
        resize:"vertical",minHeight:90,outline:"none",lineHeight:1.65,transition:"border-color 0.2s"}}/>
  );
}

function Btn({cor=C.ouro,off,fn,ch,outline,sx={}}) {
  return (
    <button disabled={off} onClick={fn} style={{
      background:outline?"transparent":off?C.faint:cor,
      color:outline?C.creme:"#fff",border:outline?`1px solid ${C.border}`:"none",
      borderRadius:100,padding:outline?"9px 24px":"12px 34px",
      fontSize:12,letterSpacing:"0.25em",textTransform:"uppercase",
      cursor:off?"not-allowed":"pointer",fontFamily:C.corpo,
      boxShadow:off||outline?"none":`0 4px 22px ${cor}44`,
      transition:"all 0.25s",marginTop:outline?0:16,...sx,
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
function Dialogo({perfil,nivel,ilhas,onResultado,onPerfil,retomada=null}) {
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
    try {
      const raw=await ai(Q.abertura(mus,perfil,ilhas),S());
      log("Maestro [C1]",raw.trim());
      setPergunta(raw.trim());setCamada(1);setPasso("c1");
    } catch {
      const fb=`"${mus}"... Claro. Por que exatamente essa agora?`;
      log("Maestro [C1]",fb);
      setPergunta(fb);setCamada(1);setPasso("c1");
    } finally{setOcupado(false);}
  };

  const avancar=async(prox)=>{
    if(!entrada.trim()||ocupado) return;
    const resp=entrada.trim();
    const camadaAtual=camada; // snapshot antes de qualquer mudança
    setEntrada("");setOcupado(true);setPasso("carregando");
    log(`Pessoa [C${camadaAtual}]`,resp);
    extrair();
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
          if(!res&&tentativas<2) await new Promise(r=>setTimeout(r,1200));
        }
        if(res) {
          onResultado(musicaPedida,h(),res);
        } else {
          setErro("O Maestro ficou em silêncio. Tente de novo.");
          setCamada(camadaAtual); // restaura camada correta
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
      setErro("Algo deu errado. Tente de novo.");
      setCamada(camadaAtual); // restaura camada correta
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
          <BalaM texto="Então... qual música você tava querendo ouvir? Me diz." />
          <TA v={entrada} set={setEntrada} enter={enviarMusica} ph={ph.m0}/>
          <div style={{textAlign:"center"}}>
            <Btn off={!entrada.trim()} fn={enviarMusica} cor={C.ouro} ch="Essa é a minha →"/>
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
                <button onClick={()=>setErro("")} style={{background:"none",border:"none",
                  color:C.muted,cursor:"pointer",fontFamily:C.corpo,fontSize:12,
                  textDecoration:"underline"}}>fechar</button>
              </div>
            </div>
          )}
          <Btn off={!entrada.trim()} cor={cor} fn={()=>{setErro("");avancar(next[passo]);}}
            ch={passo==="c4"?"Ver minhas músicas →":"Continuar →"}/>
        </div>
      )}
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
        // Re-salva dados limpos se havia duplicatas
        const tinhaLixo = (s.ilhas||[]).length !== ilhasLimpas.length;
        if (tinhaLixo) {
          save({...s, ilhas:ilhasLimpas, sessoes:sessoesLimpas});
        }
      }
      setTela("inicio");
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
    });

    // Após a 5ª sessão (e múltiplos de 5), mostra constelação automaticamente no fluxo
    if (novasSessoes.length >= 5 && novasSessoes.length % 5 === 0) {
      setTela("musicas"); // vai para músicas primeiro
      setMostrarConstelacaoApos(true); // flag para abrir constelação depois
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
    reiniciar();
    try{localStorage.removeItem(KEY);}catch{}
  };

  if(tela==="carregando") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{fontFamily:C.corpo,color:C.muted,fontStyle:"italic"}}>Sintonizando…</p>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.corpo,color:C.creme,
      padding:"44px 24px 80px",position:"relative",overflowX:"hidden"}}>
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
              {perguntaPendente&&ultimaSessao&&!modoRetomada&&(
                <div style={{marginBottom:28,animation:"up 0.5s ease both"}}>
                  {/* Card da pergunta pendente */}
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

              {/* Nova jornada normal */}
              {!perguntaPendente&&!modoRetomada&&(
                <Dialogo perfil={perfil} nivel={nivel} ilhas={ilhasVisitadas}
                  onResultado={onResultado} onPerfil={onPerfil}/>
              )}
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
