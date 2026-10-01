const SENSOR_WEIGHT = {
  gpr_low: 0.82,
  gpr_high: 0.88,
  em_active: 0.92,
  em_passive: 0.72,
  records: 0.45,
  local_knowledge: 0.35,
  visual: 0.40
};

const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));

function distance(a,b){
  return Math.hypot(Number(a.x)-Number(b.x), Number(a.y)-Number(b.y));
}

function compatible(a,b,{xyTolerance=1.25,depthTolerance=1.75}={}){
  if(distance(a,b)>xyTolerance) return false;
  const ad=Number(a.depth_m), bd=Number(b.depth_m);
  if(Number.isFinite(ad)&&Number.isFinite(bd)&&Math.abs(ad-bd)>depthTolerance) return false;
  const at=a.utility_type&&String(a.utility_type).toLowerCase();
  const bt=b.utility_type&&String(b.utility_type).toLowerCase();
  if(at&&bt&&at!=="unknown"&&bt!=="unknown"&&at!==bt) return false;
  return true;
}

function weightedAverage(items,key){
  let n=0,d=0;
  for(const o of items){
    const v=Number(o[key]);
    if(!Number.isFinite(v)) continue;
    const w=(SENSOR_WEIGHT[o.sensor]||0.5)*clamp(Number(o.confidence ?? 0.5));
    n+=v*w; d+=w;
  }
  return d? n/d : null;
}

function spread(items,key,center){
  if(center==null) return 0;
  const vals=items.map(o=>Number(o[key])).filter(Number.isFinite);
  if(vals.length<2) return 0;
  return Math.sqrt(vals.reduce((s,v)=>s+(v-center)**2,0)/vals.length);
}

function fuseCluster(items){
  const x=weightedAverage(items,"x");
  const y=weightedAverage(items,"y");
  const depth=weightedAverage(items,"depth_m");
  const sensors=[...new Set(items.map(o=>o.sensor))];
  const types=items.map(o=>o.utility_type).filter(Boolean).map(String);
  const typeCounts=Object.create(null);
  for(const t of types) typeCounts[t]=(typeCounts[t]||0)+1;
  const utilityType=Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"unknown";

  let miss=1;
  for(const o of items){
    const effective=clamp(Number(o.confidence ?? 0.5))*(SENSOR_WEIGHT[o.sensor]||0.5);
    miss*=1-clamp(effective);
  }
  const diversityBonus=Math.min(0.15, Math.max(0,sensors.length-1)*0.05);
  const xySpread=Math.hypot(spread(items,"x",x),spread(items,"y",y));
  const depthSpread=spread(items,"depth_m",depth);
  const disagreementPenalty=Math.min(0.25, xySpread*0.08 + depthSpread*0.04);
  const confidence=clamp((1-miss)+diversityBonus-disagreementPenalty);

  const evidenceQuality =
    confidence>=0.82 && sensors.length>=2 ? "high" :
    confidence>=0.62 ? "medium" : "low";

  return {
    utility_type: utilityType,
    x, y, depth_m: depth,
    confidence: Number(confidence.toFixed(3)),
    evidence_quality: evidenceQuality,
    sensor_diversity: sensors.length,
    sensors,
    observation_count: items.length,
    uncertainty_m: Number(Math.max(0.25,xySpread).toFixed(2)),
    depth_uncertainty_m: Number(Math.max(0.25,depthSpread).toFixed(2)),
    excavation_status: evidenceQuality==="high" ? "mapped_with_caution" : "hold_for_verification",
    evidence_ids: items.map(o=>o.id).filter(Boolean)
  };
}

export function fuseObservations(observations, options={}){
  if(!Array.isArray(observations)) throw new TypeError("observations must be an array");
  const obs=observations.filter(o=>o&&Number.isFinite(Number(o.x))&&Number.isFinite(Number(o.y)));
  const parent=obs.map((_,i)=>i);
  const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};

  for(let i=0;i<obs.length;i++){
    for(let j=i+1;j<obs.length;j++){
      if(compatible(obs[i],obs[j],options)) union(i,j);
    }
  }

  const groups=new Map();
  obs.forEach((o,i)=>{
    const r=find(i);
    if(!groups.has(r)) groups.set(r,[]);
    groups.get(r).push(o);
  });

  const features=[...groups.values()].map((items,index)=>{
    const f=fuseCluster(items);
    return {
      type:"Feature",
      id:`utility-${index+1}`,
      geometry:{type:"Point",coordinates:[Number(f.x.toFixed(3)),Number(f.y.toFixed(3))]},
      properties:{
        utility_type:f.utility_type,
        depth_m:f.depth_m==null?null:Number(f.depth_m.toFixed(2)),
        confidence:f.confidence,
        evidence_quality:f.evidence_quality,
        sensor_diversity:f.sensor_diversity,
        sensors:f.sensors,
        observation_count:f.observation_count,
        uncertainty_m:f.uncertainty_m,
        depth_uncertainty_m:f.depth_uncertainty_m,
        excavation_status:f.excavation_status,
        evidence_ids:f.evidence_ids
      }
    };
  });

  return {
    type:"FeatureCollection",
    generated_at:new Date().toISOString(),
    safety_note:"Decision-support only. Do not excavate solely from this output; verify using approved local utility-locating and safety procedures.",
    features
  };
}

export function summarize(collection){
  const features=collection?.features||[];
  return {
    mapped_features:features.length,
    high_confidence:features.filter(f=>f.properties.evidence_quality==="high").length,
    hold_for_verification:features.filter(f=>f.properties.excavation_status==="hold_for_verification").length,
    average_confidence:features.length?Number((features.reduce((s,f)=>s+f.properties.confidence,0)/features.length).toFixed(3)):0
  };
}
