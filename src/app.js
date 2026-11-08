import {DP_UPGRADES,SPIRAL_UPGRADES,optimize} from "./divinity.js";
import {inspectIdleonSave,extractPlannerFields} from "./idleon-parser.js?v=import-1";
import {connect,fetchCloudSave,disconnect,isConfigured} from "./cloud-save.js?v=oauth-20261108";
const $=id=>document.getElementById(id);
let imported=null;
const allUpgrades=[...DP_UPGRADES,...SPIRAL_UPGRADES];
const upgradeIcons=["🌋","✨","📚","🔗","🔆","🪸","🌀","💠","🌟","⏳","💡","⚔️"];
$("levelInputs").innerHTML=allUpgrades.map(u=>`<label><span aria-hidden="true">${upgradeIcons[u.id]}</span> ${u.name}<input type="number" min="0" step="1" value="0" data-upgrade-level="${u.id}"></label>`).join("");
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
function setStatus(message,ok=false){$("importStatus").textContent=message;$("importStatus").classList.toggle("success",ok);}

function renderSchemaAudit(data){
 const a=inspectIdleonSave(data),host=$("schemaAudit"); host.classList.remove("hidden"); host.replaceChildren();
 const heading=document.createElement("div"); heading.className="audit-head";
 const title=document.createElement("strong"); title.textContent="Save schema inspection";
 const count=document.createElement("span"); count.textContent=a.dataKeyCount+" keys under data";
 heading.append(title,count); host.append(heading);
 if(a.divinityVector){
  const h=document.createElement("h3");h.textContent="data.Divinity · "+a.divinityVector.length+" raw entries";host.append(h);
  const note=document.createElement("p");note.textContent="Found in this save. Index meanings are not yet verified, so values are shown without game labels.";host.append(note);
  const grid=document.createElement("div");grid.className="audit-grid";
  for(const item of a.divinityVector){const cell=document.createElement("div"),label=document.createElement("span"),value=document.createElement("b");label.textContent="Index "+item.index;value.textContent=String(item.value);cell.append(label,value);grid.append(cell);}
  host.append(grid);
 }else{const note=document.createElement("p");note.textContent="No data.Divinity array found at the expected path.";host.append(note);}
 const details=document.createElement("details"),summary=document.createElement("summary"),list=document.createElement("ul");summary.textContent="Other matching field paths ("+a.matchingPaths.length+")";list.className="path-list";
 for(const item of a.matchingPaths){const li=document.createElement("li"),code=document.createElement("code"),meta=document.createElement("span");code.textContent=item.path;meta.textContent=" "+item.type+(item.length===undefined?"":" · "+item.length+" items");li.append(code,meta);list.append(li);}
 details.append(summary,list);host.append(details);
}

function inspectJson(data,source){
  imported={data,source,at:new Date()};
  $("jsonPreview").textContent=JSON.stringify(data,null,2).slice(0,50000);
  renderSchemaAudit(data);
  const mapped=extractPlannerFields(data);
  for(const [id,value] of Object.entries(mapped.values)){
   const input=id.startsWith("upgrade:")?document.querySelector(`[data-upgrade-level="${id.slice(8)}"]`):$(id);
   if(input)input.value=String(value);
  }
  $("importSummary").classList.remove("hidden");
  const keys=Object.keys(data||{});
  $("importSummary").textContent=`Imported ${source} JSON · top-level keys: ${keys.slice(0,18).join(", ")||"(none)"} · ${JSON.stringify(data).length.toLocaleString()} characters. ${Object.keys(mapped.values).length} verified named fields filled automatically. ${mapped.warnings.join(" ")}`;
  setStatus("JSON imported",true);
  $("plannerMessage").textContent=Object.keys(mapped.values).length?"Imported named values automatically. Check the populated inputs, then optimize.":"Save loaded; exact Idleon Toolbox array mappings still need verification. No values were guessed.";
}
async function parseFile(file){try{const text=await file.text();inspectJson(JSON.parse(text),file.name);}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}}
$("jsonFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)parseFile(f);});
$("pasteToggle").addEventListener("click",()=>$("pasteArea").classList.toggle("hidden"));
$("parseJson").addEventListener("click",()=>{try{inspectJson(JSON.parse($("jsonInput").value),"pasted data");}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}});
$("clearImport").addEventListener("click",()=>{imported=null;$("jsonInput").value="";$("jsonFile").value="";$("importSummary").classList.add("hidden");$("schemaAudit").classList.add("hidden");$("jsonPreview").textContent="No JSON imported yet.";setStatus("Waiting for data");});
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
  document.querySelectorAll("[data-upgrade-level]").forEach(el=>{levels[Number(el.dataset.upgradeLevel)]=Math.max(0,Number(el.value)||0);});
  const result=optimize({dpBudget:num("dpBudget"),spiralBudget:num("spiralBudget"),divLevel:num("divLevel"),levels,reefCount:num("reefCount"),godRank:num("godRank"),priority:$("priority").value});
  render(result);
  $("plannerMessage").textContent="Planner completed using the current manually entered baseline. Upgrade starting levels are taken from the level fields above; JSON-to-level mapping is not yet verified.";
});

let cloudTimer=null,cloudBusy=false;
function cloudMessage(message){$("cloudStatus").textContent=message;}
function cloudControls(connected){
 $("connectGoogle").disabled=connected;
 $("refreshCloud").disabled=!connected;
 $("disconnectGoogle").disabled=!connected;
}
async function refreshCloud(silent=false){
 if(cloudBusy)return;
 cloudBusy=true;
 if(!silent)cloudMessage("Fetching your Idleon cloud save…");
 try{
  const save=await fetchCloudSave();
  inspectJson(save,"Idleon cloud save");
  cloudMessage("Cloud save fetched at "+new Date().toLocaleTimeString()+". Planner mapping is not yet verified; confirm values manually.");
 }catch(error){
  cloudMessage("Cloud refresh failed: "+error.message);
  if(/expired/i.test(error.message)){cloudControls(false);stopCloudTimer();}
 }finally{cloudBusy=false;}
}
function stopCloudTimer(){if(cloudTimer){clearInterval(cloudTimer);cloudTimer=null;}}
function scheduleCloud(){
 stopCloudTimer();
 if($("autoRefreshCloud").checked)cloudTimer=setInterval(()=>refreshCloud(true),300000);
}
$("connectGoogle").addEventListener("click",async()=>{
 if(!isConfigured()){cloudMessage("Connection setup needed: register an authorized Google OAuth web client and configure src/auth-config.js. No credentials should be pasted into this page.");return;}
 $("connectGoogle").disabled=true;cloudMessage("Waiting for Google authorization…");
 try{await connect();cloudControls(true);await refreshCloud();scheduleCloud();}
 catch(error){
  cloudControls(false);
  const message=String(error?.message||error);
  if(/audience is not for this project|INVALID_IDP_RESPONSE/i.test(message)){
   cloudMessage("Google sign-in succeeded, but Idleon rejected this independent OAuth client. This cannot be fixed by changing your Google Cloud settings. Use Choose JSON file or Paste JSON to import your Idleon Toolbox export; do not share tokens or client secrets.");
   $("pasteArea").classList.remove("hidden");
   $("jsonInput").focus();
  }else cloudMessage("Connection failed: "+message);
 }
});
$("refreshCloud").addEventListener("click",()=>refreshCloud());
$("autoRefreshCloud").addEventListener("change",scheduleCloud);
$("disconnectGoogle").addEventListener("click",()=>{
 stopCloudTimer();disconnect();cloudControls(false);cloudMessage("Disconnected. Previously imported data remains in this tab.");
});
if(isConfigured())cloudMessage("Cloud connection configured. Sign in using the Google account linked to Idleon.");
else {
 $("connectGoogle").textContent="Google connection · setup required";
 $("connectGoogle").setAttribute("aria-describedby","cloudStatus");
 cloudMessage("Google sign-in is not yet available: the website has no authorized OAuth client configuration. JSON upload/paste still works. This is a developer setup requirement, not an account error.");
}
