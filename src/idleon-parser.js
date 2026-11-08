// Conservative schema inspection for Idleon Toolbox JSON.
// Reports exact paths and raw values; it does not guess game meanings.
export function inspectIdleonSave(root) {
  if (!root || typeof root !== "object" || Array.isArray(root)) throw new TypeError("Expected a JSON object at the document root.");
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
  const divinity = data && Array.isArray(data.Divinity) ? data.Divinity : null;
  const candidateDataKeys = data ? Object.keys(data).filter(key => /divin|coral|reef|sing|spiral|god.?rank/i.test(key)) : [];
  const matchingPaths = [], seen = new WeakSet();
  function visit(value, path) {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, path + "[" + index + "]")); return; }
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? path + "." + key : key;
      if (/divin|coral|reef|sing|spiral|god.?rank/i.test(key)) matchingPaths.push({
        path: childPath, type: Array.isArray(child) ? "array" : child === null ? "null" : typeof child,
        length: Array.isArray(child) || typeof child === "string" ? child.length : undefined
      });
      visit(child, childPath);
    }
  }
  visit(root, "");
  return { rootKeys: Object.keys(root), hasDataObject: Boolean(data), dataKeyCount: data ? Object.keys(data).length : 0,
    divinityVector: divinity ? divinity.map((value, index) => ({ index, value, type: typeof value })) : null,
    candidateDataKeys, matchingPaths: matchingPaths.slice(0, 100) };
}

/**
 * Strict named-field importer. Unknown array indices are intentionally not guessed.
 * Returns fields with explicit source paths so the user can verify imported values.
 */
export function extractPlannerFields(root) {
 const result={values:{},sources:{},warnings:[]};
 if(!root||typeof root!=="object")return result;
 const containers=[["",root]];
 if(root.data&&typeof root.data==="object")containers.push(["data",root.data]);
 if(root.planner&&typeof root.planner==="object")containers.push(["planner",root.planner]);
 if(root.coralKid&&typeof root.coralKid==="object")containers.push(["coralKid",root.coralKid]);
 if(root.data?.coralKid&&typeof root.data.coralKid==="object")containers.push(["data.coralKid",root.data.coralKid]);
 const fields={
  dpBudget:["dpBudget","divinityPoints","divinityPts"],
  spiralBudget:["spiralBudget","singularitySpirals"],
  divLevel:["divLevel","divinityLevel"],
  reefCount:["reefCount","coralReefUpgradeCount"],
  godRank:["godRank"]
 };
 for(const [id,names] of Object.entries(fields)){
  for(const [prefix,obj] of containers){
   const key=names.find(k=>Object.prototype.hasOwnProperty.call(obj,k));
   if(!key)continue;
   const value=obj[key];
   if(typeof value==="number"&&Number.isFinite(value)&&value>=0){
    result.values[id]=value;result.sources[id]=(prefix?prefix+".":"")+key;break;
   }
  }
 }
 for(const [prefix,obj] of containers){
  const levels=obj.upgradeLevels||obj.coralKidUpgradeLevels;
  if(!levels||typeof levels!=="object")continue;
  for(let i=0;i<12;i++){
   const value=levels[i];
   if(typeof value==="number"&&Number.isInteger(value)&&value>=0){
    result.values["upgrade:"+i]=value;
    result.sources["upgrade:"+i]=(prefix?prefix+".":"")+(obj.upgradeLevels?"upgradeLevels":"coralKidUpgradeLevels")+"["+i+"]";
   }
  }
 }
 // Verified against Idleon Toolbox parsers/world-7/coralReef.ts and world-5/divinity.ts.
 // OptLacc is a numeric array; Spelunk is often a JSON-encoded array.
 const data=root.data&&typeof root.data==="object"?root.data:root;
 const parseArray=v=>{if(Array.isArray(v))return v;if(typeof v==="string"){try{const parsed=JSON.parse(v);return Array.isArray(parsed)?parsed:null;}catch{}}return null;};
 const options=parseArray(data.OptLacc);
 if(options&&options.length>=622){
  for(let i=0;i<12;i++){
   const index=i<6?427+i:616+i-6;
   const value=Number(options[index]);
   if(Number.isSafeInteger(value)&&value>=0){result.values["upgrade:"+i]=value;result.sources["upgrade:"+i]="data.OptLacc["+index+"]";}
  }
 }
 const divinity=parseArray(data.Divinity);
 if(divinity&&divinity.length>25){
  const points=Number(divinity[24]);
  if(Number.isFinite(points)&&points>=0){result.values.dpBudget=points;result.sources.dpBudget="data.Divinity[24]";}
  const rank=Math.max(0,Number(divinity[25])-10);
  if(Number.isFinite(rank)){result.values.godRank=rank;result.sources.godRank="data.Divinity[25] - 10";}
 }
 const spelunk=parseArray(data.Spelunk);
 if(spelunk&&Array.isArray(spelunk[13])){
  const reef=spelunk[13].reduce((sum,v)=>sum+(Number.isFinite(Number(v))?Math.max(0,Number(v)):0),0);
  result.values.reefCount=reef;result.sources.reefCount="sum(data.Spelunk[13])";
 }
 if(!("spiralBudget" in result.values))result.warnings.push("Singularity Spirals require storage inventory aggregation (CKsing); not yet mapped.");
 if(!("divLevel" in result.values))result.warnings.push("Total Divinity level requires per-character skill parsing; not yet mapped.");
 if(!Object.keys(result.values).length)result.warnings.push("No verified named planner fields found. Raw Idleon Toolbox arrays require a confirmed schema mapping; values were not guessed.");
 return result;
}
