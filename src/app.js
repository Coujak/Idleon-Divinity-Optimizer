import {DP_UPGRADES,SPIRAL_UPGRADES,optimize} from "./divinity.js?v=planner-tabs-1";
import {inspectIdleonSave,extractPlannerFields,extractSacrificeOffers} from "./idleon-parser.js?v=god-offer-auto-2";
const $=id=>document.getElementById(id);
let imported=null;
const allUpgrades=[...DP_UPGRADES,...SPIRAL_UPGRADES];
const upgradeIcons=["🌋","✨","📚","🔗","🔆","🪸","🌀","💠","🌟","⏳","💡","⚔️"];
const upgradeInput=u=>`<label class="upgrade-card"><span class="upgrade-card-head"><span class="upgrade-icon" aria-hidden="true">${upgradeIcons[u.id]}</span><span class="upgrade-name">${u.name}</span></span><span class="upgrade-input-row"><span class="upgrade-level-caption">LEVEL</span><input aria-label="${u.name} current level" type="number" min="0" step="1" value="0" data-upgrade-level="${u.id}"></span></label>`;
$("coralLevelInputs").innerHTML=DP_UPGRADES.map(upgradeInput).join("");
$("singularityLevelInputs").innerHTML=SPIRAL_UPGRADES.map(upgradeInput).join("");
let activePlanner="coral";
function selectPlanner(mode){
 activePlanner=mode;
 for(const [key,panel,tab] of [["coral","coralPlanner","tabCoral"],["singularity","singularityPlanner","tabSingularity"],["god","godRankPlanner","tabGodRank"]]){
  const selected=mode===key;
  $(panel).classList.toggle("hidden",!selected);
  $(tab).classList.toggle("active",selected);
  $(tab).setAttribute("aria-selected",String(selected));
 }
 $("runOptimizer").textContent=mode==="coral"?"Optimize Coral Kid":"Optimize Singularity Mode";
 $("runOptimizer").classList.toggle("hidden",mode==="god");
 $("plannerMessage").classList.toggle("hidden",mode==="god");
 $("results").classList.add("hidden");
}
let selectedGoal="balanced";
function updateGoalSummary(){
 const budget=currencyValue("dpBudget");
 const label=compactCurrency(budget)+" DP";
 const el=$("goalSummary");
 $("unifiedPlanner").classList.toggle("hidden",selectedGoal!=="balanced");
 if(selectedGoal==="god"){
  el.textContent="Next God Rank · available balance: "+label+". Compare the two current offerings below; reroll probabilities remain assumptions.";
 }else if(selectedGoal==="balanced"){
  el.textContent="Unified planner · "+label+" available. Choose a strategy below to calculate a shared God Rank and Coral Kid spending plan.";
 }else{
  el.textContent="Coral Kid · "+label+" available. Choose an upgrade priority and run the optimizer below.";
 }
 document.querySelectorAll("[data-goal]").forEach(b=>{const active=b.dataset.goal===selectedGoal;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));});
}
document.querySelectorAll("[data-goal]").forEach(button=>button.addEventListener("click",()=>{
 selectedGoal=button.dataset.goal;
 $("reserveGodRank").checked=false;
 $("unifiedPlanner").classList.toggle("hidden",selectedGoal!=="balanced");
 selectPlanner(selectedGoal==="god"?"god":"coral");
 updateGoalSummary();
 if(selectedGoal==="god")planGodRank();
}));
$("tabCoral").addEventListener("click",()=>{selectPlanner("coral");selectedGoal="coral";updateGoalSummary();});
$("tabSingularity").addEventListener("click",()=>{selectPlanner("singularity");document.querySelectorAll("[data-goal]").forEach(b=>{b.classList.remove("selected");b.setAttribute("aria-pressed","false");});$("goalSummary").textContent="Singularity Mode uses Singularity Spirals, not Divinity Points.";});
$("tabGodRank").addEventListener("click",()=>{selectPlanner("god");selectedGoal="god";updateGoalSummary();});

// Compact currency presentation; retain the exact numeric value while editing.
// Idleon-style notation: K, M, B, T, Q, QQ, then scientific E21 and above.
const currencySuffixes=[["K",3],["M",6],["B",9],["T",12]];
function suffixForExponent(exponent){
 if(exponent===15)return "Q";
 if(exponent===18)return "QQ";
 if(exponent>=21)return "E"+exponent;
 return currencySuffixes.find(([,power])=>power===exponent)?.[0]??"";
}
function parseCurrency(value){
 const raw=String(value??"").trim().replace(/,/g,"").replace(/\s+/g,"");
 const match=raw.match(/^(\+?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(K|M|B|T|Q+)?$/i);
 if(!match)return NaN;
 const suffix=(match[2]||"").toUpperCase();
 const exponent=suffix.startsWith("Q")?12+3*suffix.length:(currencySuffixes.find(([s])=>s===suffix)?.[1]??0);
 const result=Number(match[1])*10**exponent;
 return Number.isFinite(result)&&result>=0?result:NaN;
}
function compactCurrency(n){
 if(!Number.isFinite(n))return "";
 if(n<1000)return String(n);
 const exponent=Math.floor(Math.log10(n)/3)*3;
 const suffix=suffixForExponent(exponent);
 if(!suffix)return String(n);
 const scaled=n/10**exponent;
 // Display at most three decimal places; retain the original number separately.
 return Number(scaled.toFixed(3)).toString()+suffix;
}
function currencyValue(id){
 const el=$(id),parsed=parseCurrency(el.dataset.rawValue??el.value);
 return Number.isFinite(parsed)?parsed:0;
}
for(const id of ["dpBudget","spiralBudget"]){
 const el=$(id);
 // Let people type compact values directly (1M, 2.5B, 1QQ, 1E21).
 // Do not expand 1M to 1000000 when the field receives focus.
 el.addEventListener("focus",()=>el.select());
 el.addEventListener("input",()=>{
  delete el.dataset.rawValue;
  el.setCustomValidity("");
 });
 el.addEventListener("blur",()=>{
  const n=parseCurrency(el.value);
  if(Number.isFinite(n)){
   el.dataset.rawValue=String(n);
   el.value=compactCurrency(n);
   el.setCustomValidity("");
  }else if(el.value.trim()){
   el.setCustomValidity("Enter a number such as 1M, 2.5B, 1QQ or 1E21.");
  }else{
   delete el.dataset.rawValue;
   el.setCustomValidity("");
  }
 });
 const n=parseCurrency(el.value);
 if(Number.isFinite(n)){el.dataset.rawValue=String(n);el.value=compactCurrency(n);}
}


// God Rank sacrifices are a separate, probabilistic spending decision.
const godOfferDefs=[
 {name:"Olive Branch",chance:.01},{name:"Incense",chance:.05},{name:"Giftbox",chance:.10},
 {name:"Tithe",chance:.25},{name:"Hearty Meal",chance:.50},{name:"Sacrifice",chance:1}
];
// Wiki sacrifice formula: success chance is a fractional probability.
function sacrificeCost(progressionRank,chance){
 const n=Math.max(0,Math.floor(progressionRank));
 const base=(20*Math.pow(n+1.3,2.3)*Math.pow(2.2,n)+60)*chance;
 const modifierInput=Number($("divCostAfter3").value);
 if(!Number.isFinite(modifierInput)||modifierInput<0||modifierInput>80)return NaN;
 const modifier=n<3?1:Math.pow(Math.min(1.8,Math.max(1,1+modifierInput/100)),n-2);
 const cost=base*modifier;
 return Number.isFinite(cost)?Math.ceil(cost):Infinity;
}
function unlockedDivines(){
 const rank=Number($("godRank").value);
 return Number.isFinite(rank)&&rank>=0?Math.floor(rank)+10:NaN;
}
function updateGodCosts(){
 const n=unlockedDivines();
 const low=godOfferDefs[Number($("godLowOffer").value)],high=godOfferDefs[Number($("godHighOffer").value)];
 const lowCost=sacrificeCost(n,low.chance),highCost=sacrificeCost(n,high.chance);
 $("godLowCost").textContent=Number.isFinite(lowCost)?compactCurrency(lowCost)+" Divinity Points":"—";
 $("godHighCost").textContent=Number.isFinite(highCost)?compactCurrency(highCost)+" Divinity Points":"—";
 $("godCostBasis").textContent=Number.isFinite(n)?`Calculated using offering progression index ${n} (God Rank ${n-10}), with the current cost modifier assumption. Advanced settings allow changing it.`:"Enter your God Rank to calculate offering costs.";
 return [lowCost,highCost];
}
$("godRank").addEventListener("input",()=>{updateGodCosts();$("godRankComparison").classList.add("hidden");});
// Retry each offering from independent hosts. Reset attempts on every selection.
const offeringWikiUrls={
 Low:["https://idleon.wiki/images/7/70/Divine_Summoning_Low_1.png","https://idleon.wiki/images/c/cc/Divine_Summoning_Low_2.png","https://idleon.wiki/images/f/f8/Divine_Summoning_Low_3.png"],
 High:["https://idleon.wiki/images/5/52/Divine_Summoning_High_1.png","https://idleon.wiki/images/0/09/Divine_Summoning_High_2.png","https://idleon.wiki/images/0/08/Divine_Summoning_High_3.png"]
};
function loadOfferingArt(image,category,index){
 const filename=`Divine_Summoning_${category}_${index}.png`;
 const urls=[
  `./assets/divinity/${filename}`,
  `https://raw.githubusercontent.com/Coujak/Idleon-Divinity-Optimizer/main/assets/divinity/${filename}`,
  `https://cdn.jsdelivr.net/gh/Coujak/Idleon-Divinity-Optimizer@main/assets/divinity/${filename}`,
  offeringWikiUrls[category][index-1]
 ];
 let attempt=0;
 image.hidden=false;
 image.parentElement.classList.remove("art-unavailable");
 image.onerror=()=>{
  attempt++;
  if(attempt<urls.length)image.src=urls[attempt];
  else{
   image.onerror=null;
   image.hidden=true;
   image.parentElement.classList.add("art-unavailable");
  }
 };
 image.onload=()=>{image.hidden=false;image.parentElement.classList.remove("art-unavailable");};
 image.src=urls[0];
}
function updateGodOfferImages(){
 const low=Number($("godLowOffer").value)+1;
 const high=Number($("godHighOffer").value)-2;
 loadOfferingArt($("godLowImage"),"Low",low);
 loadOfferingArt($("godHighImage"),"High",high);
 $("godLowImage").alt=godOfferDefs[low-1].name+" offering";
 $("godHighImage").alt=godOfferDefs[high+2].name+" offering";
 updateGodCosts();
 $("godRankComparison").classList.add("hidden");
 $("godRankSummary").textContent="Select Plan God Rank to compare the calculated costs.";
}
updateGodOfferImages();
$("godLowOffer").addEventListener("change",updateGodOfferImages);
$("godHighOffer").addEventListener("change",updateGodOfferImages);
function godRankReserve(){
 if(!$("reserveGodRank").checked)return 0;
 const low=godOfferDefs[Number($("godLowOffer").value)],high=godOfferDefs[Number($("godHighOffer").value)];
 const [a,b]=updateGodCosts();
 if(!(a>0&&b>0))return NaN;
 return Math.min(a/low.chance,b/high.chance);
}
$("reserveGodRank").addEventListener("change",()=>{
 updateGoalSummary();
 $("plannerMessage").textContent=$("reserveGodRank").checked
  ?"God Rank reservation enabled. Coral Kid optimization will reserve the lower expected cost for one success."
  :"God Rank reservation disabled. Coral Kid optimization uses your full DP budget.";
});
// A failure can leave the attempted category unchanged or reroll within its category.
// The exact transition probabilities have not been verified; use equal weights as a
// clearly labeled planning assumption, then let the user report the actual result.
const godRerollOptions={low:[0,1,2],high:[3,4,5]};
let godFailuresRecorded=0;
function refreshFailureOptions(){
 const category=$("godFailedCategory").value;
 const current=Number($(category==="low"?"godLowOffer":"godHighOffer").value);
 $("godAfterFailure").innerHTML=godRerollOptions[category].map(i=>`<option value="${i}" ${i===current?"selected":""}>${godOfferDefs[i].name} · ${Math.round(godOfferDefs[i].chance*100)}%${i===current?" (unchanged)":""}</option>`).join("");
}
$("godFailedCategory").addEventListener("change",refreshFailureOptions);
$("godLowOffer").addEventListener("change",refreshFailureOptions);
$("godHighOffer").addEventListener("change",refreshFailureOptions);
refreshFailureOptions();

function adaptiveGodPlan(budget,lowIndex,highIndex){
 const n=unlockedDivines(),costs=godOfferDefs.map(o=>sacrificeCost(n,o.chance));
 const minCost=Math.min(...costs);
 if(!(minCost>0&&Number.isFinite(minCost)&&Number.isFinite(budget)))return null;
 // Finite horizon keeps the browser responsive even for extremely large balances.
 const horizon=Math.min(40,Math.floor(budget/minCost));
 const memo=new Map();
 function solve(remaining,low,high,steps){
  if(steps<=0)return {probability:0,choice:-1};
  const key=remaining.toPrecision(14)+"|"+low+"|"+high+"|"+steps;
  if(memo.has(key))return memo.get(key);
  let best={probability:0,choice:-1};
  for(const choice of [low,high]){
   const cost=costs[choice];
   if(cost>remaining)continue;
   const p=godOfferDefs[choice].chance;
   let continuation=0;
   const next=choice===low?godRerollOptions.low:godRerollOptions.high;
   for(const changed of next){
    continuation+=solve(remaining-cost,choice===low?changed:low,choice===high?changed:high,steps-1).probability/next.length;
   }
   const probability=p+(1-p)*continuation;
   if(probability>best.probability)best={probability,choice};
  }
  memo.set(key,best);
  return best;
 }
 return {...solve(budget,lowIndex,highIndex,horizon),horizon};
}
function planGodRank(){
 const lowIndex=Number($("godLowOffer").value),highIndex=Number($("godHighOffer").value);
 const low=godOfferDefs[lowIndex],high=godOfferDefs[highIndex];
 const [lowCost,highCost]=updateGodCosts();
 const output=$("godRankComparison"),summary=$("godRankSummary");
 if(!Number.isFinite(lowCost)||lowCost<=0||!Number.isFinite(highCost)||highCost<=0){
  summary.textContent="Unable to calculate costs. Check your God Rank.";
  output.classList.add("hidden");return;
 }
 const budget=currencyValue("dpBudget");
 const plan=adaptiveGodPlan(budget,lowIndex,highIndex);
 const entries=[{...low,cost:lowCost},{...high,cost:highCost}];
 output.classList.remove("hidden");
 const formatChance=x=>(x*100).toFixed(1)+"%";
 const attemptsFor=(p,confidence)=>p>=1?1:Math.ceil(Math.log(1-confidence)/Math.log(1-p));
 const recommendation=plan?.choice>=0?godOfferDefs[plan.choice].name:"No offering is affordable";
 const limitNote=plan?.horizon===40?" This estimate considers up to 40 attempts; larger budgets may have higher actual success odds.":"";
 output.innerHTML=`<div class="god-rank-result god-adaptive-result"><strong>Recommended next offering: ${recommendation}</strong><span>Estimated chance of reaching the next God Rank with ${compactCurrency(budget)} Divinity Points: <b>${plan?formatChance(plan.probability):"—"}</b></span><span>Assumption: after failure, only the attempted category rerolls, with equal chances for its three offerings (including staying the same). Actual reroll odds are not verified.${limitNote}</span></div>`+entries.map(item=>{
  const affordable=Math.max(0,Math.floor(budget/item.cost));
  const probability=1-Math.pow(1-item.chance,affordable);
  return `<div class="god-rank-result"><strong>${item.name} · ${Math.round(item.chance*100)}%</strong><span>Fixed-offer confidence: 50% in ${attemptsFor(item.chance,.5)} attempts (${compactCurrency(attemptsFor(item.chance,.5)*item.cost)} DP maximum); 90% in ${attemptsFor(item.chance,.9)} attempts (${compactCurrency(attemptsFor(item.chance,.9)*item.cost)} DP maximum); 95% in ${attemptsFor(item.chance,.95)} attempts (${compactCurrency(attemptsFor(item.chance,.95)*item.cost)} DP maximum). Assumes the same offering stays available.</span><span>Cost per attempt: ${compactCurrency(item.cost)} Divinity Points</span><span>Expected cost per success at fixed odds: ${compactCurrency(item.cost/item.chance)} Divinity Points</span><span>Fixed-offer comparison (ignores rerolls): ${Math.min(affordable,1e9).toLocaleString()}${affordable>1e9?"+":""} affordable attempts · ${formatChance(probability)} success chance</span></div>`;
 }).join("");
 summary.textContent="Adaptive strategy: "+recommendation+". After a failed attempt, record the observed offering and replan with your remaining balance.";
}
$("compareGodOffers").addEventListener("click",planGodRank);
$("godRecordFailure").addEventListener("click",()=>{
 const category=$("godFailedCategory").value;
 const inputId=category==="low"?"godLowOffer":"godHighOffer";
 const current=Number($(inputId).value);
 const changed=Number($("godAfterFailure").value);
 if(!godRerollOptions[category].includes(changed))return;
 const cost=sacrificeCost(unlockedDivines(),godOfferDefs[current].chance);
 const budget=currencyValue("dpBudget");
 if(!Number.isFinite(cost)||cost>budget){
  $("godFailureStatus").textContent="Cannot record this failure: the current Divinity Points budget does not cover the offering.";return;
 }
 const remaining=Math.max(0,budget-cost);
 $("dpBudget").dataset.rawValue=String(remaining);
 $("dpBudget").value=compactCurrency(remaining);
 $(inputId).value=String(changed);
 godFailuresRecorded++;
 updateGodOfferImages();
 refreshFailureOptions();
 $("godFailureStatus").textContent=`Failure #${godFailuresRecorded}: ${godOfferDefs[current].name} failed; ${godOfferDefs[changed].name} is now available. Deducted ${compactCurrency(cost)} Divinity Points; remaining: ${compactCurrency(remaining)}.`;
 planGodRank();
});

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
  for(const id of ["dpBudget","spiralBudget","divLevel","reefCount","godRank"]){if(!(id in mapped.values)){ $(id).value=""; delete $(id).dataset.rawValue; }}
  for(const [id,value] of Object.entries(mapped.values)){
   const input=id.startsWith("upgrade:")?document.querySelector(`[data-upgrade-level="${id.slice(8)}"]`):$(id);
   if(input){input.value=String(value);if(input.id==="dpBudget"||input.id==="spiralBudget"){input.dataset.rawValue=String(value);input.value=compactCurrency(Number(value));}}
  }
  const currentOffers=extractSacrificeOffers(data);
  if(currentOffers){
   $("godLowOffer").value=String(currentOffers.low);
   $("godHighOffer").value=String(currentOffers.high);
   updateGodOfferImages();
   $("godOfferSource").textContent="Active offerings imported from save fields ("+currentOffers.source+").";
  }else{
   $("godOfferSource").textContent="Active offerings could not be identified from this save. Select them manually; raw save offering slots are not yet verified.";
  }
  updateGodCosts();
  $("godRankComparison").classList.add("hidden");
  $("importSummary").classList.remove("hidden");
  const keys=Object.keys(data||{});
  $("importSummary").textContent=`Imported ${source} JSON · top-level keys: ${keys.slice(0,18).join(", ")||"(none)"} · ${JSON.stringify(data).length.toLocaleString()} characters. ${Object.keys(mapped.values).length} verified named fields filled automatically. ${mapped.warnings.join(" ")}`;
  setStatus("JSON imported",true);
  updateGoalSummary();
  $("plannerMessage").textContent=Object.keys(mapped.values).length?`${Object.keys(mapped.values).length} values imported. ${mapped.warnings.join(" ")} Review missing fields before optimizing.`:"Save loaded but no planner values could be mapped.";
}
async function parseFile(file){try{const text=await file.text();inspectJson(JSON.parse(text),file.name);}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}}
$("jsonFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)parseFile(f);});
$("pasteToggle").addEventListener("click",()=>$("pasteArea").classList.toggle("hidden"));
$("parseJson").addEventListener("click",()=>{try{inspectJson(JSON.parse($("jsonInput").value),"pasted data");}catch(e){setStatus("Invalid JSON");$("jsonPreview").textContent=e.message;}});
$("clearImport").addEventListener("click",()=>{imported=null;$("jsonInput").value="";$("jsonFile").value="";$("importSummary").classList.add("hidden");$("schemaAudit").classList.add("hidden");$("jsonPreview").textContent="No JSON imported yet.";setStatus("Waiting for data");});
function render(result){
  $("results").classList.remove("hidden");
  $("spentLabel").textContent=`Spent ${compactCurrency(result.dpSpent)} DP · ${compactCurrency(result.spSpent)} Spirals`;
  const m=result.metrics,b=result.before;
  const metrics=[["Divinity EXP",m.divinity,b.divinity],["Class EXP",m.classExp,b.classExp],["Divinity Points",m.points,b.points],["Minor links",m.minor,b.minor],["Daily Coral",m.dailyCoral,b.dailyCoral],["Damage",m.damage,b.damage]];
  $("metrics").innerHTML=metrics.map(([name,v,old])=>`<div class="metric"><span>${name}</span><strong>${v.toFixed(3)}×</strong><small class="muted">was ${old.toFixed(3)}×</small></div>`).join("");
  const visibleActions=result.actions.filter(a=>activePlanner==="coral"?a.id<6:a.id>=6);
  const shown=visibleActions.slice(0,100);
  $("purchaseOrder").innerHTML=shown.length?shown.map((a,i)=>`<div class="purchase-step"><span class="step-index">${i+1}</span><strong>${a.name}</strong><span>Level ${a.level}</span><span>${compactCurrency(a.cost)} ${a.currency}</span></div>`).join("")+(visibleActions.length>100?`<p class="fine-print">Showing the first 100 of ${visibleActions.length} purchases.</p>`:""):"<p class='fine-print'>No affordable purchases for the selected priority.</p>";
  $("recommendations").innerHTML=result.rows.filter(r=>r.gained>0).map(r=>`<tr><td>${r.upgrade.name}</td><td>${r.current}</td><td>${r.suggested}</td><td>+${r.gained}</td><td>${compactCurrency(r.costSpent)} ${r.upgrade.id>=6?"Spirals":"DP"}</td><td>Divinity Lv. ${r.upgrade.unlock.toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="6">No affordable upgrades found. Increase the budget or check unlock levels.</td></tr>';
}
$("runOptimizer").addEventListener("click",()=>{
  const num=id=>Math.max(0,Number($(id).value)||0);
  const levels={};
  document.querySelectorAll("[data-upgrade-level]").forEach(el=>{levels[Number(el.dataset.upgradeLevel)]=Math.max(0,Number(el.value)||0);});
  const coral=activePlanner==="coral";
  const currencyInput=$(coral?"dpBudget":"spiralBudget");
  if(currencyInput.value.trim()&&!Number.isFinite(parseCurrency(currencyInput.value))){
   currencyInput.setCustomValidity("Enter a valid amount such as 1M, 2.5B, 1QQ or 1E21.");
   currencyInput.reportValidity();
   return;
  }
  const reserve=coral?godRankReserve():0;
  if(!Number.isFinite(reserve)){
   $("plannerMessage").textContent="Check your God Rank before optimizing with reservation enabled.";
   $("godLowCost").focus();
   return;
  }
  const result=optimize({dpBudget:coral?Math.max(0,currencyValue("dpBudget")-reserve):0,spiralBudget:coral?0:currencyValue("spiralBudget"),divLevel:num("divLevel"),levels,reefCount:num("reefCount"),godRank:num("godRank"),priority:coral?$("priority").value:$("singularityPriority").value});
  result.rows=result.rows.filter(r=>coral?r.upgrade.id<6:r.upgrade.id>=6);
  render(result);
  $("plannerMessage").textContent=(coral?"Coral Kid":"Singularity Mode")+" recommendations calculated using the displayed account values."+(coral&&reserve>0?" Reserved "+compactCurrency(reserve)+" DP for God Rank sacrifices (expected, not guaranteed).":"");
});

$("dpBudget").addEventListener("change",updateGoalSummary);
$("godLowOffer").addEventListener("change",updateGoalSummary);
$("godHighOffer").addEventListener("change",updateGoalSummary);
$("godRank").addEventListener("change",updateGoalSummary);
$("divCostAfter3").addEventListener("change",()=>{updateGodCosts();updateGoalSummary();$("godRankComparison").classList.add("hidden");});
updateGoalSummary();

function runUnifiedPlanner(){
 const host=$("unifiedResults"),budget=currencyValue("dpBudget");
 const [lowCost,highCost]=updateGodCosts();
 const low=godOfferDefs[Number($("godLowOffer").value)],high=godOfferDefs[Number($("godHighOffer").value)];
 const confidence=Number($("unifiedConfidence").value);
 const strategy=document.querySelector('input[name="unifiedStrategy"]:checked')?.value||"hybrid";
 if(!(budget>=0&&Number.isFinite(budget)&&Number.isFinite(lowCost)&&Number.isFinite(highCost)&&lowCost>0&&highCost>0)){
  host.textContent="Check your Divinity Points and God Rank details before planning.";return;
 }
 const options=[{name:low.name,cost:lowCost,chance:low.chance},{name:high.name,cost:highCost,chance:high.chance}].map(o=>{
  const attempts=o.chance===1?1:Math.ceil(Math.log(1-confidence)/Math.log(1-o.chance));
  return {...o,attempts,reserve:attempts*o.cost};
 });
 const best=options.reduce((a,b)=>a.reserve<=b.reserve?a:b);
 const canFund=budget>=best.reserve;
 const levels={};
 document.querySelectorAll("[data-upgrade-level]").forEach(el=>{levels[Number(el.dataset.upgradeLevel)]=Math.max(0,Number(el.value)||0);});
 const context={spiralBudget:0,divLevel:Math.max(0,Number($("divLevel").value)||0),levels,reefCount:Math.max(0,Number($("reefCount").value)||0),godRank:Math.max(0,Number($("godRank").value)||0)};
 let reserved=0,coralBudget=0,title="",note="",firstAction="";
 if(strategy==="rush"){
  reserved=budget;
  title="God Rank Rush";
  note=canFund?`The ${Math.round(confidence*100)}% fixed-offer target is funded. Preserve your DP for ${best.attempts} ${best.name} attempts; unused DP stays saved for future ranks.`:`Save all DP toward ${compactCurrency(best.reserve)} for the next God Rank confidence target. Short by ${compactCurrency(best.reserve-budget)} DP.`;
  firstAction=canFund?`Attempt ${best.name} and replan after each result.`:"Save DP; no Coral Kid purchases planned.";
 }else if(strategy==="balanced"){
  reserved=Math.min(budget/2,best.reserve);
  coralBudget=budget-reserved;
  title="Balanced Investment";
  note=`Allocate up to half the DP toward the next God Rank and the remainder toward Coral Kid. ${reserved>=best.reserve?"The fixed-offer confidence target is funded.":"The God Rank allocation is below the confidence target; retain it as savings."}`;
  firstAction=reserved>=best.reserve?`Attempt ${best.name} or buy planned Coral upgrades.`:"Buy planned Coral upgrades while preserving the God Rank allocation.";
 }else{
  title="Smart Hybrid";
  if(canFund){
   reserved=best.reserve;
   coralBudget=Math.max(0,budget-reserved);
   note=`Fund the ${Math.round(confidence*100)}% God Rank target first with ${best.attempts} fixed ${best.name} attempts; allocate surplus DP to Coral Kid.`;
   firstAction=`Attempt ${best.name} and replan after each result.`;
  }else{
   // Heuristic, not a time-to-rank optimizer: cap investments to 10% of
   // available DP and select only upgrades directly affecting DP gain.
   const cap=budget*.1;
   const pointsPlan=optimize({...context,dpBudget:cap,priority:"points"});
   const pointsActions=(pointsPlan.actions||[]).filter(a=>a.id===4);
   coralBudget=pointsActions.reduce((sum,a)=>sum+a.cost,0);
   reserved=budget-coralBudget;
   note=`The God Rank confidence target needs ${compactCurrency(best.reserve)} DP. Preserve at least 90% of your DP and allow up to 10% for affordable Coral Kid DP-gain upgrades. This is a conservative heuristic, not a verified fastest-rank strategy.`;
   firstAction=pointsActions.length?`Consider ${pointsActions[0].name} → level ${pointsActions[0].level}; save the rest.`:"Save DP; no DP-gain upgrades fit the 10% investment cap.";
  }
 }
 // Only the Coral Kid allocation is spendable; God Rank funds remain reserved.
 const result=optimize({...context,dpBudget:coralBudget,priority:strategy==="hybrid"&&!canFund?"points":$("unifiedPriority").value});
 let actions=(result.actions||[]).filter(a=>a.id<6);
 if(strategy==="hybrid"&&!canFund){
  // Restrict the heuristic to direct DP-gain upgrades; other upgrades
  // cannot be justified without an explicit progression-time model.
  actions=actions.filter(a=>a.id===4);
 }
 const spent=actions.reduce((sum,a)=>sum+a.cost,0);
 const saved=Math.max(0,budget-spent);
 const attempts=Math.floor(Math.min(reserved,best.reserve)/best.cost);
 const fixedChance=1-Math.pow(1-best.chance,attempts);

 const grouped=new Map();
 for(const action of actions){
  if(!grouped.has(action.id)){
   grouped.set(action.id,{id:action.id,name:action.name,current:Number(levels[action.id])||0,target:Number(levels[action.id])||0,cost:0,count:0});
  }
  const entry=grouped.get(action.id);
  entry.target=Math.max(entry.target,action.level);
  entry.cost+=action.cost;
  entry.count++;
 }
 const groups=[...grouped.values()].sort((a,b)=>a.id-b.id);
 const rows=groups.map(g=>`<div class="unified-upgrade-row"><div class="upgrade-row-name"><strong>${g.name}</strong><small>+${g.count} levels · ${compactCurrency(g.cost)} DP</small></div><div class="upgrade-row-levels"><span class="level-from"><small>Current Lv.</small><b>Lv. ${g.current}</b></span><svg class="ui-icon upgrade-arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg><span class="level-to"><small>Upgraded Lv.</small><b>Lv. ${g.target}</b></span></div></div>`).join("");
 host.innerHTML=`<article class="unified-scenario unified-priority"><div class="scenario-title"><span class="scenario-number">01</span><h4>${title}</h4></div><div class="next-action-feature"><div class="next-action-label"><svg class="ui-icon" aria-hidden="true"><use href="#i-zap"></use></svg> RECOMMENDED NEXT STEP</div><strong>${firstAction}</strong></div><p>${note}</p><div class="scenario-metrics"><div><small>Current DP</small><strong>${compactCurrency(budget)}</strong></div><div><small>God Rank allocation</small><strong>${compactCurrency(reserved)}</strong></div><div><small>Planned Coral spend</small><strong>${compactCurrency(spent)}</strong></div><div><small>DP remaining after Coral</small><strong>${compactCurrency(saved)}</strong></div><div><small>Fixed-offer success chance</small><strong>${(fixedChance*100).toFixed(1)}%</strong></div><div><small>Coral upgrades</small><strong>${groups.length}</strong></div></div></article><article class="unified-scenario unified-purchases"><h4>Coral Kid upgrade plan</h4><div class="unified-action-list">${rows||"<p class='fine-print'>No Coral Kid purchases planned for this strategy.</p>"}</div><p class="fine-print">God Rank success chance assumes fixed offerings. Actual offerings can reroll. No DP/hour model is used.</p></article>`;

}
$("runUnified").addEventListener("click",runUnifiedPlanner);

document.querySelectorAll('input[name="unifiedStrategy"]').forEach(el=>el.addEventListener("change",runUnifiedPlanner));

// Keep the unified strategy results in sync with imported and edited account data.
for(const id of ["unifiedConfidence","unifiedPriority","dpBudget","divLevel","reefCount","godRank","godLowOffer","godHighOffer","divCostAfter3"]){
 $(id).addEventListener("change",()=>{if(selectedGoal==="balanced")runUnifiedPlanner();});
}
document.querySelectorAll("[data-upgrade-level]").forEach(el=>el.addEventListener("change",()=>{if(selectedGoal==="balanced")runUnifiedPlanner();}));
// Show the combined strategies immediately, even before a save is imported.
runUnifiedPlanner();
