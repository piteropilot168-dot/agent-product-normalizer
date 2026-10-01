import fs from "node:fs";
import { fuseObservations, summarize } from "./mapper.mjs";
const input=process.argv[2]||new URL("./sample-observations.json",import.meta.url);
const raw=fs.readFileSync(input,"utf8");
const result=fuseObservations(JSON.parse(raw));
console.log(JSON.stringify({summary:summarize(result),geojson:result},null,2));
