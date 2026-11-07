import {DP_UPGRADES,SPIRAL_UPGRADES,optimize} from "./divinity.js";
const $=id=>document.getElementById(id);
let imported=null;
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
function setStatus(message,ok=false){$("importStatus").textContent=message;$("importStatus").classList.toggle("success",ok);}
function inspectJson(data,source){
  imported={data,source,at:new Date()};
  $("jsonPreview").textContent=JSON.stringify(data,null,2).slice(0,50000);
  $("importSummary").classList.remove("hidden");
  const keys=Object.keys(data||{});
  $("importSummary").textContent=`Imported ${source} JSON · top-level keys: ${keys.slice(0,18).join(", ")||"(none)"} · ${JSON.stringify(data).length.toLocaleString()} characters. Automatic account-field mapping is not enabled until the exact save schema is verified.`;
  setStatus("JSON imported",true);
  $("plannerMessage").textContent="JSON loaded for inspection. Confirm your current values in the planner inputs.";
}
async function parseFile(file){try{const text=await file.text();inspectJson(JSON.parse(text),file.name);}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}}
$("jsonFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)parseFile(f);});
$("pasteToggle").addEventListener("click",()=>$("pasteArea").classList.toggle("hidden"));
$("parseJson").addEventListener("click",()=>{try{inspectJson(JSON.parse($("jsonInput").value),"pasted data");}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}});
$("clearImport").addEventListener("click",()=>{imported=null;$("jsonInput").value="";$("jsonFile").value="";$("importSummary").classList.add("hidden");$("jsonPreview").textContent="No JSON imported yet.";setStatus("Waiting for data");});
function render(result){
  $("results").classList.remove("hidden");
  $("spentLabel").textContent=`Spent ${fmt(result.dpSpent)} DP · ${fmt(result.spSpent)} Spirals`;
  const m=result.metrics,b=result.before;
  const metrics=[["Divinity EXP",m.divinity,b.divinity],["Class EXP",m.classExp,b.classExp],["Divinity Points",m.points,b.points],["Minor links",m.minor,b.minor],["Daily Coral",m.dailyCoral,b.dailyCoral],["Damage",m.damage,b.damage]];
  $("metrics").innerHTML=metrics.map(([name,v,old])=>`<div class="metric"><span>${name}</span><strong>${v.toFixed(3)}×</strong><small class="muted">was ${old.toFixed(3)}×</small></div>`).join("");
  $("recommendations").innerHTML=result.rows.filter(r=>r.gained>0).map(r=>`<tr><td>${r.upgrade.name}</td><td>${r.current}</td><td>${r.suggested}</td><td>+${r.gained}</td><td>${fmt(r.costSpent)} ${r.upgrade.id>=6?"Spirals":"DP"}</td><td>Divinity Lv. ${r.upgrade.unlock.toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="6">No affordable upgrades found. Increase the budget or check unlock levels.</td></tr>';
}
$("runOptimizer").addEventListener("click",()=>{
  const num=id=>Math.max(0,Number($(id).value)||0);
  const levels={};
  for(const u of [...DP_UPGRADES,...SPIRAL_UPGRADES])levels[u.id]=0;
  const result=optimize({dpBudget:num("dpBudget"),spiralBudget:num("spiralBudget"),divLevel:num("divLevel"),levels,reefCount:num("reefCount"),godRank:num("godRank"),priority:$("priority").value});
  render(result);
  $("plannerMessage").textContent="Planner completed using the current manually entered baseline. Save-to-upgrade level mapping is not yet verified.";
});
