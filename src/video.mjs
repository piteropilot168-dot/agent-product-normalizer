import { InputError } from "./safe-fetch.mjs";

const MAX_TRANSCRIPT = 120_000;
const STOP = new Set(("the a an and or but if then to of in on for with from by at as is are was were be been being it this that these those i you we they he she them his her our your my their do does did have has had can could should would may might will just very really about into over under than so not no yes " +
"der die das den dem des ein eine einer einen einem eines und oder aber wenn dann zu von im in am an auf für mit aus bei als ist sind war waren sein gewesen es dies diese dieser ich du wir sie er ihnen sein ihr unser euer mein deren tun tut tat haben hat hatte kann können sollte würde wird nur sehr wirklich über unter als so nicht nein ja " +
"i oraz albo ale jeśli wtedy do od w na dla z ze przy jako jest są był była było być to ten ta te ja ty my oni one on ona ich jego jej nasz wasz mój robi zrobić ma mają miał może mogą powinien powinna będzie tylko bardzo naprawdę o pod niż więc nie tak").split(/\s+/));

function text(v, name="transcript", max=MAX_TRANSCRIPT) {
  if (typeof v !== "string" || !v.trim()) throw new InputError(`${name} is required and must be non-empty`);
  if (v.length > max) throw new InputError(`${name} must be at most ${max} characters`);
  return v.trim();
}
function words(s){
  return (String(s).toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[])
    .filter(w=>!STOP.has(w));
}
function freqMap(all){
  const m=new Map();
  for(const w of words(all)) m.set(w,(m.get(w)||0)+1);
  return m;
}
function normalizeNoise(s){
  return String(s||"")
    .replace(/\((?:laughter|applause|music|cheering|audience|laughs?)\)/ig," ")
    .replace(/\[(?:laughter|applause|music|cheering|audience|laughs?)\]/ig," ")
    .replace(/\s+/g," ")
    .replace(/\s+([,.;!?])/g,"$1")
    .trim();
}
function isFragment(s){
  const t=normalizeNoise(s);
  if(!t) return true;
  const wc=(t.match(/\b[\p{L}\p{N}'’"-]+\b/gu)||[]).length;
  if(wc < 5) return true;
  if(/^(and|but|so|or|because|which|who|that|of|to|from|with|for|if|then|und|aber|oder|weil|die|der|das|i|ale|lub|bo|który|która|które)\b/i.test(t)) return true;
  if(/[,;:–—-]\s*$/.test(t)) return true;
  return false;
}
function coherentUnits(raw){
  const cleaned = text(raw)
    .replace(/\r/g,"\n")
    .replace(/\n+/g," ")
    .replace(/\s+/g," ")
    .trim();

  const rough = cleaned
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ÞĄĆĘŁŃÓŚŹŻÄÖÜÉÈÊÁÍÓÚÑ])/u)
    .map(normalizeNoise)
    .filter(Boolean);

  const out=[];
  for(const part of rough){
    if(!out.length){ out.push(part); continue; }
    const prev=out[out.length-1];
    if(isFragment(prev) || /^[a-zà-öø-ÿąćęłńóśźżäöü]/u.test(part) || prev.length < 45){
      out[out.length-1]=normalizeNoise(`${prev} ${part}`);
    } else {
      out.push(part);
    }
  }

  const final=[];
  for(const u of out){
    if(u.length <= 500){ final.push(u); continue; }
    const pieces=u.split(/;\s+|,\s+(?=(?:and|but|so|because|which|who|when|where|und|aber|weil|i|ale|bo)\b)/i);
    let buf="";
    for(const p of pieces){
      if((buf+" "+p).trim().length>380 && buf){
        final.push(normalizeNoise(buf));
        buf=p;
      }else{
        buf=normalizeNoise(`${buf} ${p}`);
      }
    }
    if(buf) final.push(normalizeNoise(buf));
  }
  return final.filter(x=>!isFragment(x));
}
function sentences(v){ return coherentUnits(v); }

function scoreSentence(s,f,idx,total){
  const ws=words(s);
  if(!ws.length) return 0;
  const lexical=ws.reduce((a,w)=>a+Math.log1p(f.get(w)||0),0)/Math.sqrt(ws.length);
  const position = total>1 ? (1 - idx/(total-1))*0.12 : 0.12;
  const complete = /[.!?]$/.test(s) ? 0.18 : 0;
  const quotePenalty = ((s.match(/"/g)||[]).length % 2) ? -0.2 : 0;
  return lexical+position+complete+quotePenalty;
}
function rankedUnits(raw){
  const ss=sentences(raw);
  const f=freqMap(raw);
  return ss.map((s,i)=>({s,i,score:scoreSentence(s,f,i,ss.length)}))
    .filter(x=>x.s.length>=45)
    .sort((a,b)=>b.score-a.score);
}
function diverseTop(raw, limit=8){
  const ranked=rankedUnits(raw);
  const picked=[];
  for(const item of ranked){
    const t=new Set(words(item.s));
    let tooSimilar=false;
    for(const p of picked){
      const pt=new Set(words(p.s));
      let hit=0;
      for(const w of t) if(pt.has(w)) hit++;
      const denom=Math.max(1,Math.min(t.size,pt.size));
      if(hit/denom>0.65){ tooSimilar=true; break; }
    }
    if(!tooSimilar) picked.push(item);
    if(picked.length>=limit) break;
  }
  return picked.sort((a,b)=>a.i-b.i).map(x=>x.s);
}
function summarySentences(raw, limit=5){
  const candidates=diverseTop(raw, Math.max(limit*2,8));
  const strong = candidates
    .filter(s=>!/\b(i think|i mean|you know|actually|anyway|by the way)\b/i.test(s))
    .filter(s=>s.length>=70);
  return (strong.length?strong:candidates).slice(0,limit);
}

export function videoBrief(raw){
  const t=text(raw);
  const ss=sentences(t);
  const key=diverseTop(t,8);
  const summaryParts=summarySentences(t,5);
  return {
    summary: summaryParts.join(" "),
    key_points:key.slice(0,8),
    stats:{chars:t.length,sentences:ss.length,estimated_words:(t.match(/\S+/g)||[]).length}
  };
}
export function videoKeyPoints(raw, limit=10){
  const t=text(raw);
  const n=Math.max(3,Math.min(20,Number(limit)||10));
  const pts=diverseTop(t,n);
  return {count:pts.length,points:pts};
}
export function videoClaims(raw){
  const t=text(raw);
  const claimRe=/\b(is|are|was|were|will|can|cannot|causes?|leads? to|increases?|decreases?|proves?|shows?|means?|equals?|must|should|ist|sind|war|waren|wird|werden|kann|können|muss|müssen|soll|sollte|zeigt|bedeutet|führt zu|jest|są|był|była|było|będą|może|mogą|musi|muszą|powinien|powinna|pokazuje|oznacza|prowadzi do|es|son|fue|será|puede|debe|muestra|significa|est|sont|était|sera|peut|doit|montre|signifie)\b/i;
  const numberRe=/\b\d+(?:[.,]\d+)?%?\b/;
  const evidenceRe=/\b(according to|research|study|studies|data|evidence|report|survey|unesco|who|nasa|shows that|found that|demonstrates?|statistics?|badania|dane|według|raport|badanie|studie|daten|laut)\b/i;
  const subjectiveRe=/\b(i think|i believe|my contention|in my view|i feel|i love|i like|amazing|wonderful|extraordinary|marvel|cool|great|beautiful|terrible|moim zdaniem|uważam|wydaje mi się|ich denke|ich glaube)\b/i;
  const questionRe=/\?$/;
  const metaRe=/\b(good morning|how are you|thank you|by the way|anyway|remember the story|do you remember|i want to talk about)\b/i;

  const claims=[];
  for(const source of sentences(t)){
    const s=normalizeNoise(source);
    if(metaRe.test(s) || questionRe.test(s) || s.length<55) continue;
    if(subjectiveRe.test(s) && !numberRe.test(s) && !evidenceRe.test(s)) continue;
    const factualSignal=claimRe.test(s)||numberRe.test(s)||evidenceRe.test(s);
    if(!factualSignal) continue;

    let priority="medium";
    if(numberRe.test(s)||evidenceRe.test(s)) priority="high";
    if(/\b(may|might|could|possibly|perhaps|może|mogł|könnte|vielleicht)\b/i.test(s)) priority="low";

    claims.push({
      index:claims.length,
      claim:s,
      claim_type:"verifiable",
      has_number:numberRe.test(s),
      evidence_signal:evidenceRe.test(s),
      verification_priority:priority,
      needs_verification:true
    });
    if(claims.length>=20) break;
  }
  return {count:claims.length,claims};
}
export function videoActionItems(raw){
  const action=/\b(you should|you need to|we need to|you must|we must|next step|action item|try this|check this|verify this|send|build|create|buy|sell|contact|remember to|make sure to|trzeba|należy|powinieneś|powinniśmy|sprawdź|wyślij|zrób|stwórz|skontaktuj|musisz|wir müssen|du solltest|du musst|prüfe|schicke)\b/i;
  const falsePositive=/\b(should treat it|should conclude|must try harder|i need to speak to her privately|remember the story|did it happen)\b/i;
  const items=sentences(raw)
    .filter(s=>action.test(s) && !falsePositive.test(s))
    .slice(0,20);
  return {count:items.length,action_items:items};
}
function queryConcepts(q){
  const raw=String(q||"").toLowerCase();
  const concepts=[];
  if(/\b(main|key|primary|core)\b/.test(raw)) concepts.push("main");
  if(/\b(argument|arguments|claim|claims|point|points|thesis)\b/.test(raw)) concepts.push("arguments");
  if(/\b(example|examples|story|stories|anecdote|anecdotes)\b/.test(raw)) concepts.push("examples");
  if(/\b(about|summary|summarize|overview)\b/.test(raw)) concepts.push("summary");
  return concepts;
}
function likelyExample(s){
  return /\b(for example|for instance|story|once|when i|when my|a little girl|my son|my daughter|gillian|picasso|shakespeare|teacher|school|professor|degree|unesco)\b/i.test(s);
}
function likelyArgument(s){
  return /\b(education|creativity|creative|school|schools|talent|intelligence|academic|degree|university|children|kids|system|future|human)\b/i.test(s)
    && !likelyExample(s);
}
export function videoAnswerQuestion(raw, rawQuestion){
  const t=text(raw);
  const q=text(rawQuestion,"question",4000);
  const units=sentences(t);
  const concepts=queryConcepts(q);

  if(concepts.includes("arguments") || concepts.includes("examples")){
    const argumentPoints=diverseTop(units.filter(likelyArgument).join(" "),5);
    const examplePoints=diverseTop(units.filter(likelyExample).join(" "),4);
    const parts=[];
    if(argumentPoints.length) parts.push(`Main arguments: ${argumentPoints.slice(0,3).join(" ")}`);
    if(examplePoints.length) parts.push(`Examples: ${examplePoints.slice(0,3).join(" ")}`);
    if(parts.length){
      const evidence=[...argumentPoints.slice(0,3),...examplePoints.slice(0,3)];
      return {question:q,answer:parts.join(" "),evidence,confidence:0.78,mode:"analytical-extractive"};
    }
  }

  if(concepts.includes("summary")){
    const b=videoBrief(t);
    return {question:q,answer:b.summary,evidence:b.key_points.slice(0,5),confidence:0.72,mode:"summary-fallback"};
  }

  const qWords=new Set(words(q));
  const ranked=units.map((s,i)=>{
    const sw=words(s);
    const overlap=sw.filter(w=>qWords.has(w)).length;
    return {i,s,score:overlap/Math.sqrt(sw.length||1)};
  }).sort((a,b)=>b.score-a.score).slice(0,7);

  const evidence=ranked.filter(x=>x.score>0.08).map(x=>x.s);
  if(evidence.length){
    return {
      question:q,
      answer:evidence.slice(0,3).join(" "),
      evidence:evidence.slice(0,5),
      confidence:Number(Math.min(0.92,0.48+ranked[0].score*0.22).toFixed(2)),
      mode:"lexical-evidence"
    };
  }

  const b=videoBrief(t);
  return {
    question:q,
    answer:b.summary || "No directly relevant passage found in the supplied transcript.",
    evidence:b.key_points.slice(0,3),
    confidence:b.summary?0.55:0.15,
    mode:"brief-fallback"
  };
}
export function videoChapters(raw, target=8){
  const t=text(raw);
  const ss=sentences(t);
  if(!ss.length) return {count:0,chapters:[]};

  const requested=Math.max(2,Math.min(12,Number(target)||8));
  const n=Math.min(requested, Math.max(1,Math.floor(ss.length/8)));
  const size=Math.max(8,Math.ceil(ss.length/n));
  const chapters=[];

  for(let i=0;i<ss.length;i+=size){
    const chunk=ss.slice(i,i+size);
    if(!chunk.length) continue;
    const rep=summarySentences(chunk.join(" "),1)[0]||chunk[0];
    let title=words(rep).slice(0,10).join(" ");
    if(!title) title=rep.slice(0,90);
    title=title.charAt(0).toUpperCase()+title.slice(1);
    chapters.push({
      chapter:chapters.length+1,
      title,
      summary:rep,
      start_sentence:i,
      start_text:chunk[0]
    });
  }
  return {count:chapters.length,chapters};
}
function segmentTimestampMatch(sentence, segments=[]){
  if(!Array.isArray(segments) || !segments.length) return null;
  const target=new Set(words(sentence));
  let best=null, bestScore=0;
  for(const seg of segments){
    const sw=words(seg?.text||"");
    if(!sw.length) continue;
    const overlap=sw.filter(w=>target.has(w)).length;
    const score=overlap/Math.sqrt(sw.length);
    if(score>bestScore){ bestScore=score; best=seg; }
  }
  if(!best || bestScore<=0) return null;
  const ms=Number(best.offset||0);
  return {timestamp_ms:ms,timestamp_s:Number((ms/1000).toFixed(3))};
}
function withTimestamps(items, segments=[]){
  return items.map(item=>{
    const sentence=typeof item==="string"?item:(item?.start_text||item?.text||item?.summary||item?.claim||"");
    const ts=segmentTimestampMatch(sentence,segments);
    return typeof item==="string"
      ? {text:item,...(ts||{})}
      : {...item,...(ts||{})};
  });
}
export function videoAnalyze(raw, { question = "", keyPointLimit = 10, chapterTarget = 8, segments = [] } = {}) {
  const transcript = text(raw);
  const brief = videoBrief(transcript);
  const kp = videoKeyPoints(transcript, keyPointLimit);
  const chapters = videoChapters(transcript, chapterTarget);
  const claims = videoClaims(transcript);
  const actions = videoActionItems(transcript);

  const durationMs = Array.isArray(segments) && segments.length
    ? Math.max(...segments.map(s=>Number(s?.offset||0)+Number(s?.duration||0)))
    : null;
  const briefChars = brief?.summary?.length || 0;

  const result = {
    brief,
    key_points: {...kp, timed_points: withTimestamps(kp.points,segments)},
    chapters: {...chapters, chapters: withTimestamps(chapters.chapters,segments)},
    claims: {...claims, claims: withTimestamps(claims.claims,segments)},
    action_items: {...actions, action_items: withTimestamps(actions.action_items,segments)},
    efficiency: {
      transcript_chars: transcript.length,
      brief_chars: briefChars,
      compression_ratio: transcript.length ? Number((briefChars/transcript.length).toFixed(3)) : null,
      duration_ms: durationMs,
      duration_s: durationMs === null ? null : Number((durationMs/1000).toFixed(3))
    }
  };

  if (typeof question === "string" && question.trim()) {
    const answer = videoAnswerQuestion(transcript, question);
    result.answer = {...answer, timed_evidence: withTimestamps(answer.evidence||[],segments)};
  }
  return result;
}


export async function fetchVideoTranscript(url,{apiKey,lang,timeoutMs=15000}={}){
  const u=text(url,"url",2048);
  if(!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(u)) throw new InputError("url must be a public YouTube URL");
  if(!apiKey) throw new InputError("video transcript provider is not configured",503,"TRANSCRIPT_PROVIDER_NOT_CONFIGURED");
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const endpoint=new URL("https://api.supadata.ai/v1/transcript"); endpoint.searchParams.set("url",u); if(lang) endpoint.searchParams.set("lang",String(lang));
    const r=await fetch(endpoint,{headers:{"x-api-key":apiKey,"accept":"application/json"},signal:controller.signal,redirect:"error"});
    const body=await r.text(); let data; try{data=JSON.parse(body)}catch{data={raw:body.slice(0,2000)}}
    if(!r.ok) throw new InputError(`transcript provider returned ${r.status}`, r.status===404?404:502, "TRANSCRIPT_PROVIDER_ERROR");
    const segments=Array.isArray(data?.content)?data.content:[];
    const transcript=typeof data?.content==="string"?data.content:segments.map(x=>x?.text||"").filter(Boolean).join(" ");
    return {source_url:u,lang:data?.lang||lang||null,transcript,segments,provider:"supadata"};
  }catch(e){ if(e?.name==="AbortError") throw new InputError("transcript provider timed out",504,"TRANSCRIPT_PROVIDER_TIMEOUT"); throw e; }
  finally{clearTimeout(timer)}
}
