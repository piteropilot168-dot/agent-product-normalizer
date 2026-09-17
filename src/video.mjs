import { InputError } from "./safe-fetch.mjs";

const MAX_TRANSCRIPT = 120_000;
const STOP = new Set("the a an and or but if then to of in on for with from by at as is are was were be been being it this that these those i you we they he she them his her our your my their do does did have has had can could should would may might will just very really about into over under than so not no yes".split(/\s+/));

function text(v, name="transcript", max=MAX_TRANSCRIPT) {
  if (typeof v !== "string" || !v.trim()) throw new InputError(`${name} is required and must be non-empty`);
  if (v.length > max) throw new InputError(`${name} must be at most ${max} characters`);
  return v.trim();
}
function sentences(v) { return text(v).replace(/\r/g,"\n").split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean); }
function words(s){ return (String(s).toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(w=>!STOP.has(w)); }
function freqMap(all){ const m=new Map(); for(const w of words(all)) m.set(w,(m.get(w)||0)+1); return m; }
function scoreSentence(s,f){ const ws=words(s); if(!ws.length) return 0; return ws.reduce((a,w)=>a+(f.get(w)||0),0)/Math.sqrt(ws.length); }
function topSentences(raw, limit=8){ const ss=sentences(raw); const f=freqMap(raw); return ss.map((s,i)=>({s,i,score:scoreSentence(s,f)})).sort((a,b)=>b.score-a.score).slice(0,limit).sort((a,b)=>a.i-b.i).map(x=>x.s); }
function uniq(xs){ return [...new Set(xs.map(x=>String(x).trim()).filter(Boolean))]; }

export function videoBrief(raw){
  const t=text(raw); const ss=sentences(t); const key=topSentences(t,8);
  return { summary:key.slice(0,5).join(" "), key_points:key.slice(0,8), stats:{chars:t.length,sentences:ss.length,estimated_words:(t.match(/\S+/g)||[]).length} };
}
export function videoKeyPoints(raw, limit=10){ const t=text(raw); const n=Math.max(3,Math.min(20,Number(limit)||10)); return {count:Math.min(n,sentences(t).length), points:topSentences(t,n)}; }
export function videoClaims(raw){
  const t=text(raw); const claimRe=/\b(is|are|was|were|will|can|cannot|causes?|leads? to|increases?|decreases?|proves?|shows?|means?|equals?|must|should)\b/i;
  const numberRe=/\b\d+(?:[.,]\d+)?%?\b/;
  const claims=sentences(t).filter(s=>claimRe.test(s)||numberRe.test(s)).slice(0,30).map((claim,index)=>({index,claim,has_number:numberRe.test(claim),needs_verification:true}));
  return {count:claims.length,claims};
}
export function videoActionItems(raw){
  const action=/\b(need to|must|should|next|todo|action|try|check|verify|send|build|create|buy|sell|contact|remember|make sure|trzeba|należy|sprawdź|wyślij|zrób|stwórz|skontaktuj)\b/i;
  const items=sentences(raw).filter(s=>action.test(s)).slice(0,30);
  return {count:items.length,action_items:items};
}
export function videoAnswerQuestion(raw, rawQuestion){
  const t=text(raw); const q=text(rawQuestion,"question",4000); const qWords=new Set(words(q));
  const ranked=sentences(t).map((s,i)=>{const sw=words(s); const overlap=sw.filter(w=>qWords.has(w)).length; return {i,s,score:overlap/(Math.sqrt(sw.length||1))};}).sort((a,b)=>b.score-a.score).slice(0,5);
  const evidence=ranked.filter(x=>x.score>0).map(x=>x.s);
  return {question:q,answer:evidence.length?evidence.slice(0,3).join(" "):"No directly relevant passage found in the supplied transcript.",evidence:evidence.slice(0,5),confidence:evidence.length?Number(Math.min(0.95,0.45+ranked[0].score*0.25).toFixed(2)):0.15};
}
export function videoChapters(raw, target=8){
  const t=text(raw); const ss=sentences(t); const n=Math.max(3,Math.min(20,Number(target)||8)); const size=Math.max(1,Math.ceil(ss.length/n)); const chapters=[];
  for(let i=0;i<ss.length;i+=size){ const chunk=ss.slice(i,i+size); if(!chunk.length) continue; const top=topSentences(chunk.join(" "),1)[0]||chunk[0]; chapters.push({chapter:chapters.length+1,title:top.slice(0,100),summary:top,start_sentence:i}); }
  return {count:chapters.length,chapters};
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


export function videoAnalyze(raw, { question = "", keyPointLimit = 10, chapterTarget = 8 } = {}) {
  const transcript = text(raw);
  const result = {
    brief: videoBrief(transcript),
    key_points: videoKeyPoints(transcript, keyPointLimit),
    chapters: videoChapters(transcript, chapterTarget),
    claims: videoClaims(transcript),
    action_items: videoActionItems(transcript),
  };
  if (typeof question === "string" && question.trim()) result.answer = videoAnswerQuestion(transcript, question);
  return result;
}
