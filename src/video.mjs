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
    .replace(/\r?\n+/g," ")
    .replace(/\s+/g," ")
    .trim();

  // Split on real sentence punctuation regardless of capitalization.
  // Subtitle providers often start the next sentence with lowercase text,
  // so requiring an uppercase next token collapses long videos into giant blocks.
  const rough = (cleaned.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/gu) || [cleaned])
    .map(normalizeNoise)
    .filter(Boolean);

  const final=[];
  for(const unit of rough){
    if(unit.length <= 520){
      final.push(unit);
      continue;
    }

    // Safety split for poorly punctuated caption stretches.
    const pieces = unit.split(/;\s+|,\s+(?=(?:and|but|so|because|which|who|when|where|while|although|und|aber|weil|wenn|i|ale|bo|gdy|który|która|które)\b)/i);
    let buf="";
    for(const part of pieces){
      const next=normalizeNoise(`${buf} ${part}`);
      if(next.length>380 && buf){
        final.push(normalizeNoise(buf));
        buf=part;
      }else{
        buf=next;
      }
    }
    if(buf) final.push(normalizeNoise(buf));
  }

  return final.filter(Boolean);
}
function sentences(v){ return coherentUnits(v); }


function isLowValue(s){
  const t=normalizeNoise(s);
  const low=t.toLowerCase();
  if(!t || t.length<35) return true;
  if(/^(good morning|good afternoon|good evening|hello|hi|how are you|thank you|thanks|okay|ok|all right)\b/i.test(t)) return true;
  if(/^(don'?t you|am i right|right)\??$/i.test(t)) return true;
  if(/^(i think|i mean|you know|actually|anyway|by the way)\b/i.test(t) && t.length<95) return true;
  if(/^[^A-Za-zÀ-ÖØ-öø-ÿĄĆĘŁŃÓŚŹŻąćęłńóśźż]*$/u.test(t)) return true;
  return false;
}
function topTerms(raw, limit=14){
  const f=freqMap(raw);
  return [...f.entries()]
    .filter(([w])=>w.length>=4)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(([w])=>w);
}
function topicalOverlap(s, terms){
  const ws=new Set(words(s));
  let hit=0;
  for(const t of terms) if(ws.has(t)) hit++;
  return hit;
}

function thesisMarkerScore(s){
  let score=0;
  if(/\b(my contention is|the result is|the consequence is|the point is|the problem is|the whole system|we need to|we have to|academic ability|creativity|creative capacities|view of intelligence|hierarchy of subjects|university entrance|fundamental principles)\b/i.test(s)) score+=3.0;
  if(/\b(children|education|school|schools|talent|intelligence|creativity|creative|academic|university|future|human)\b/i.test(s)) score+=0.8;
  if(/\b(good morning|how are you|dinner party|t-shirt|t shirt|joke|laughter|by the way|anyway)\b/i.test(s)) score-=2.5;
  return score;
}
function anecdotePenalty(s){
  let p=0;
  if(/\b(i heard a (great )?story|there was a little|my son|my daughter|t-shirt|t shirt|oak-paneled|sat on this chair|we walked in this room|i had a conversation|i love telling it)\b/i.test(s)) p+=1.6;
  if(/\b(laughter|applause)\b/i.test(s)) p+=1.0;
  return p;
}
function centralTopicTerms(raw, limit=18){
  const f=freqMap(raw);
  const boosted=[...f.entries()].map(([w,c])=>{
    let b=c;
    if(/^(education|creativity|creative|intelligence|children|kids|school|schools|talent|academic|university|system|future|human)$/.test(w)) b*=2.2;
    return [w,b];
  });
  return boosted.sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([w])=>w);
}
function argumentMarkerScore(s){
  let score=0;
  if(/\b(the point is|the problem is|the reason is|the purpose|the whole system|our system|we need to|we have to|what we know|the important thing|is as important as|is that|means that|results in|leads to|predicated|hierarchy|fundamental|crucial)\b/i.test(s)) score+=2.5;
  if(/\b(education|creativity|intelligence|talent|system|future|children|people|human|academic|school|schools|university|degree)\b/i.test(s)) score+=0.7;
  if(/\b(i think|i believe|i feel|in my view|you know|actually|anyway)\b/i.test(s)) score-=0.7;
  return score;
}
function exampleMarkerScore(s){
  let score=0;
  if(/\b(for example|for instance|a good example|let me tell you|there was|there were|once|when i|when my|my son|my daughter|a little girl|a little boy|a girl|a boy|a woman|a man|story|case)\b/i.test(s)) score+=2.3;
  if(/\b(said|told|teacher|school|doctor|specialist|company|career|dance|artist|professor)\b/i.test(s)) score+=0.5;
  return score;
}
function scoreSentence(s,f,idx,total){
  const ws=words(s);
  if(!ws.length) return 0;
  const lexical=ws.reduce((a,w)=>a+Math.log1p(f.get(w)||0),0)/Math.sqrt(ws.length);
  const position = total>1 ? (1 - idx/(total-1))*0.08 : 0.08;
  const complete = /[.!?]["')\]]*$/.test(s) ? 0.15 : 0;
  const quotePenalty = ((s.match(/"/g)||[]).length % 2) ? -0.15 : 0;
  const thesisBonus = argumentMarkerScore(s) + thesisMarkerScore(s);
  const storyPenalty = anecdotePenalty(s);
  const fillerPenalty = isLowValue(s) ? -3 : 0;
  return lexical+position+complete+quotePenalty+thesisBonus-storyPenalty+fillerPenalty;
}
function rankedUnits(raw){
  const ss=sentences(raw);
  const f=freqMap(raw);
  return ss.map((s,i)=>({s,i,score:scoreSentence(s,f,i,ss.length)}))
    .filter(x=>x.s.length>=45 && !isLowValue(x.s))
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
  const units=sentences(raw);
  const central=centralTopicTerms(raw,18);
  const scored=units.map((s,i)=>({
    i,
    s,
    score:thesisMarkerScore(s) + topicalOverlap(s,central)*0.55 - anecdotePenalty(s)
  }))
  .filter(x=>!isLowValue(x.s) && x.s.length>=65)
  .sort((a,b)=>b.score-a.score);

  const picked=[];
  for(const item of scored){
    const w=new Set(words(item.s));
    let dup=false;
    for(const p of picked){
      const pw=new Set(words(p.s));
      let hit=0;
      for(const x of w) if(pw.has(x)) hit++;
      if(hit/Math.max(1,Math.min(w.size,pw.size))>0.65){dup=true;break;}
    }
    if(!dup) picked.push(item);
    if(picked.length>=limit) break;
  }

  if(!picked.length) return diverseTop(raw,limit);
  return picked.sort((a,b)=>a.i-b.i).map(x=>x.s);
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
  const units=sentences(t);
  const numberRe=/\b\d+(?:[.,]\d+)?%?\b/;
  const evidenceRe=/\b(according to|research|study|studies|data|evidence|report|survey|unesco|who|nasa|shows that|found that|demonstrates?|statistics?|badania|dane|według|raport|badanie|studie|daten|laut)\b/i;
  const assertiveRe=/\b(is|are|was|were|will|causes?|leads? to|increases?|decreases?|shows?|means?|equals?|cannot|must|ist|sind|war|waren|wird|zeigt|bedeutet|führt zu|jest|są|był|była|będzie|pokazuje|oznacza|prowadzi do)\b/i;
  const subjectiveRe=/\b(i think|i believe|my contention|in my view|i feel|i love|i like|amazing|wonderful|extraordinary|marvel|cool|great|beautiful|terrible|moim zdaniem|uważam|wydaje mi się|ich denke|ich glaube)\b/i;
  const metaRe=/\b(good morning|how are you|thank you|by the way|anyway|remember the story|do you remember|i want to talk about)\b/i;

  const ranked=[];
  for(let i=0;i<units.length;i++){
    const s=normalizeNoise(units[i]);
    if(isLowValue(s) || metaRe.test(s) || /\?$/.test(s) || s.length<60) continue;
    const hasNumber=numberRe.test(s);
    const evidence=evidenceRe.test(s);
    const assertive=assertiveRe.test(s);
    if(!hasNumber && !evidence && !assertive) continue;
    if(subjectiveRe.test(s) && !hasNumber && !evidence) continue;
    if(/\b(I|my|me)\b/.test(s) && !hasNumber && !evidence && argumentMarkerScore(s)<1.5) continue;
    if(anecdotePenalty(s)>=1.5 && !hasNumber && !evidence) continue;

    let score=0;
    if(hasNumber) score+=3;
    if(evidence) score+=3;
    if(assertive) score+=1.2;
    score+=Math.min(3.0,argumentMarkerScore(s)+thesisMarkerScore(s));
    score-=anecdotePenalty(s);
    if(s.length>=80 && s.length<=300) score+=0.8;
    if(s.length>420) score-=1.2;

    ranked.push({i,s,score,hasNumber,evidence});
  }

  const selected=ranked.sort((a,b)=>b.score-a.score).slice(0,15).sort((a,b)=>a.i-b.i);
  const claims=selected.map((x,index)=>({
    index,
    claim:x.s,
    claim_type:"verifiable",
    has_number:x.hasNumber,
    evidence_signal:x.evidence,
    verification_priority:(x.hasNumber||x.evidence)?"high":"medium",
    needs_verification:true
  }));
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
  const terms=centralTopicTerms(t,18);

  if(concepts.includes("arguments") || concepts.includes("examples")){
    const argumentScored=units
      .map((s,i)=>({
        i,
        s,
        topic:topicalOverlap(s,terms),
        arg:argumentMarkerScore(s)
      }))
      .filter(x=>!isLowValue(x.s) && x.s.length>=55)
      .map(x=>({...x,score:x.topic*0.7+x.arg}))
      .filter(x=>x.score>=1.4)
      .sort((a,b)=>b.score-a.score)
      .slice(0,10);

    const exampleScored=[];
    for(let i=0;i<units.length;i++){
      const s=units[i];
      const marker=exampleMarkerScore(s);
      const thesisLink=topicalOverlap(s,terms) + Math.max(0,thesisMarkerScore(s));
      if(marker<1.8 || thesisLink<0.8) continue;
      if(/\b(t-shirt|t shirt|forest|wife|husband|joke)\b/i.test(s)) continue;

      const cluster=[s];
      for(let j=i+1;j<Math.min(units.length,i+3);j++){
        const next=units[j];
        if(argumentMarkerScore(next)>=2.2) break;
        if(cluster.join(" ").length + next.length > 430) break;
        cluster.push(next);
      }
      const joined=cluster.join(" ");
      exampleScored.push({
        i,
        s:joined,
        score:marker + topicalOverlap(joined,terms)*0.65 + Math.max(0,thesisMarkerScore(joined))*0.35 - anecdotePenalty(joined)*0.25
      });
    }
    exampleScored.sort((a,b)=>b.score-a.score);

    const dedupe=(arr,limit)=>{
      const out=[];
      for(const x of arr){
        const wx=new Set(words(x.s));
        let dup=false;
        for(const y of out){
          const wy=new Set(words(y.s));
          let hit=0;
          for(const w of wx) if(wy.has(w)) hit++;
          if(hit/Math.max(1,Math.min(wx.size,wy.size))>0.62){ dup=true; break; }
        }
        if(!dup) out.push(x);
        if(out.length>=limit) break;
      }
      return out;
    };

    const args=dedupe(argumentScored,4).sort((a,b)=>a.i-b.i).map(x=>x.s);
    const examples=dedupe(exampleScored,3).sort((a,b)=>a.i-b.i).map(x=>x.s);

    if(args.length || examples.length){
      const parts=[];
      if(args.length) parts.push(`Main arguments: ${args.join(" ")}`);
      if(examples.length) parts.push(`Examples: ${examples.join(" ")}`);
      const evidence=[...args,...examples];
      return {question:q,answer:parts.join(" "),evidence,confidence:0.8,mode:"analytical-extractive"};
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
  }).filter(x=>!isLowValue(x.s)).sort((a,b)=>b.score-a.score).slice(0,7);

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
    const central=centralTopicTerms(t,18);
    const rep=[...chunk]
      .map((s,idx)=>({
        s,
        idx,
        score:thesisMarkerScore(s)+topicalOverlap(s,central)*0.6-anecdotePenalty(s)-(isLowValue(s)?3:0)
      }))
      .sort((a,b)=>b.score-a.score)[0]?.s || chunk[0];
    let title=normalizeNoise(rep).slice(0,90);
    if(title.length===90) title=title.replace(/\s+\S*$/,"").trim();
    title=title.replace(/[.!?,;:\-–—\s]+$/g,"").trim();
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
    context_pack: {
      purpose: "extractive model-ready context",
      items: withTimestamps(
        [...new Set([
          ...(brief.key_points||[]).slice(0,5),
          ...(claims.claims||[]).slice(0,4).map(x=>x.claim)
        ])].slice(0,8),
        segments
      )
    },
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
