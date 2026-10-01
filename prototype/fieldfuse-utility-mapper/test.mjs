import assert from "node:assert/strict";
import { fuseObservations, summarize } from "./mapper.mjs";

const observations=[
  {id:"a",sensor:"gpr_low",x:10,y:10,depth_m:3.8,utility_type:"sewer",confidence:0.82},
  {id:"b",sensor:"records",x:10.4,y:10.2,depth_m:3.5,utility_type:"sewer",confidence:0.70},
  {id:"c",sensor:"gpr_high",x:30,y:5,depth_m:1.4,utility_type:"water",confidence:0.60},
  {id:"d",sensor:"local_knowledge",x:50,y:50,depth_m:2.0,utility_type:"telecom",confidence:0.35},
  {id:"e",sensor:"gpr_high",x:70,y:10,depth_m:0.9,utility_type:"power",confidence:0.88},
  {id:"f",sensor:"em_active",x:70.2,y:10.1,depth_m:1.0,utility_type:"power",confidence:0.94}
];

const out=fuseObservations(observations);
assert.equal(out.type,"FeatureCollection");
assert.equal(out.features.length,4);

const sewer=out.features.find(f=>f.properties.utility_type==="sewer");
assert.equal(sewer.properties.instrument_diversity,1);
assert.equal(sewer.properties.excavation_status,"hold_for_verification");

const water=out.features.find(f=>f.properties.utility_type==="water");
assert.equal(water.properties.excavation_status,"hold_for_verification");

const power=out.features.find(f=>f.properties.utility_type==="power");
assert.equal(power.properties.instrument_diversity,2);
assert.ok(power.properties.confidence>=0.82);
assert.equal(power.properties.excavation_status,"mapped_with_caution");

const s=summarize(out);
assert.equal(s.mapped_features,4);
assert.ok(s.high_confidence>=1);
assert.ok(s.hold_for_verification>=3);
console.log(JSON.stringify({ok:true,summary:s},null,2));
