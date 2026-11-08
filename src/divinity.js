// Coral Kid model based on community-researched formulas. Keep formulas centralized and visible.
export const DP_UPGRADES = [
  {id:0,name:"Volcano Link",unlock:0,base:1e7,scale:6,rate:1.1,metric:"divinity",description:"Divinity EXP gain"},
  {id:1,name:"Blessing Capacity",unlock:600,base:6e7,scale:6,rate:1.25,metric:"blessing",description:"Maximum Blessing level"},
  {id:2,name:"God Rank Class EXP",unlock:900,base:3.6e8,scale:6,rate:1.1,metric:"class",description:"Class EXP from God Rank"},
  {id:3,name:"Minor Link Bonus",unlock:1200,base:2.16e9,scale:6,rate:1.1,metric:"minor",description:"Minor Link Bonuses"},
  {id:4,name:"Divinity Point Gain",unlock:1500,base:1.296e10,scale:6,rate:1.1,metric:"points",description:"Divinity Points per Reef upgrade"},
  {id:5,name:"Daily Coral",unlock:1750,base:7.776e10,scale:6,rate:1.1,metric:"reef",description:"Daily Coral generation"}
];
export const SPIRAL_UPGRADES = [
  {id:6,name:"DP Transmutation",unlock:3000,base:1,scale:7,rate:1.13,metric:"points",description:"Transmute Divinity Points"},
  {id:7,name:"Transmutation Value",unlock:5000,base:9,scale:9,rate:1.13,metric:"points",description:"Increase base transmute value"},
  {id:8,name:"Divinity EXP II",unlock:8000,base:121,scale:11,rate:1.13,metric:"divinity",description:"Additional Divinity EXP"},
  {id:9,name:"Time Elapse",unlock:10000,base:2197,scale:13,rate:1.13,metric:"afk",description:"Time Elapse from AFK gains"},
  {id:10,name:"Lumi Hourly Gain",unlock:12000,base:28561,scale:13,rate:1.85,metric:"lumi",description:"Lumi hourly gain"},
  {id:11,name:"God Rank Damage",unlock:12000,base:759375,scale:15,rate:1.85,metric:"damage",description:"Damage per God Rank above 25"}
];
export function upgradeCost(u, currentLevel) {
  // Level zero is the first purchase; the formula is exponential from the current level.
  return Math.ceil(u.base * Math.pow(u.rate, Math.max(0,currentLevel)));
}
export function upgradeEffect(id, level) {
  const l=Math.max(0,Number(level)||0);
  switch(id){
    case 0:return 10*l;
    case 1:return Math.round(2*l);
    case 2:return l/(25+l)*20;
    case 3:return Math.round(l);
    case 4:return Math.round(2*l);
    case 5:return l/(40+l)*100;
    case 6:return Math.round(100*l);
    case 7:return Math.round(10*l);
    case 8:return Math.round(50*l);
    case 9:return Math.round(125*l/(l+100));
    case 10:return Math.round(5*l);
    case 11:return Math.round(l);
    default:return 0;
  }
}
export function metricSnapshot(levels, reefCount, godRank) {
  const e=id=>upgradeEffect(id,levels[id]||0);
  return {
    divinity:(1+e(0)/100)*(1+e(8)/100),
    classExp:Math.pow(1+e(2)/100,Math.max(0,godRank-10)),
    minor:1+e(3)/100,
    points:(1+reefCount*e(4)/100)*(1+e(6)/100),
    dailyCoral:1+e(5)/100,
    damage:1+e(11)/100
  };
}
const weightSets={
  balanced:{divinity:4,points:4,class:2,minor:2,reef:2,damage:1,afk:1,lumi:1,blessing:1},
  divinity:{divinity:10,points:1,class:1,minor:1,reef:1,damage:0,afk:0,lumi:0,blessing:0},
  points:{divinity:1,points:10,class:1,minor:1,reef:1,damage:0,afk:0,lumi:0,blessing:0},
  class:{divinity:1,points:1,class:10,minor:1,reef:0,damage:0,afk:0,lumi:0,blessing:0},
  reef:{divinity:1,points:1,class:0,minor:0,reef:10,damage:0,afk:0,lumi:0,blessing:0},
  minor:{divinity:1,points:1,class:0,minor:10,reef:0,damage:0,afk:0,lumi:0,blessing:0},
  damage:{divinity:0,points:0,class:1,minor:0,reef:0,damage:10,afk:0,lumi:0,blessing:0},
  afk:{divinity:0,points:0,class:0,minor:0,reef:0,damage:0,afk:10,lumi:0,blessing:0},
  lumi:{divinity:0,points:0,class:0,minor:0,reef:0,damage:0,afk:0,lumi:10,blessing:0}
};
function utility(u, before, after, context, weights){
  const w=weights[u.metric]||0;
  if(!w)return 0;
  const gain=upgradeEffect(u.id,after)-upgradeEffect(u.id,before);
  if(u.metric==="divinity")return w*gain*(u.id===8?0.5:1);
  if(u.metric==="points")return w*gain*(u.id===4?Math.max(1,context.reefCount):1);
  if(u.metric==="class")return w*gain*Math.max(1,context.godRank-10);
  if(u.metric==="minor")return w*gain;
  if(u.metric==="reef")return w*gain;
  if(u.metric==="damage")return w*gain*Math.max(0,context.godRank-25);
  if(u.metric==="afk"||u.metric==="lumi")return w*gain;
  if(u.metric==="blessing")return w*gain;
  return 0;
}
// Greedy marginal-value-per-cost planner. Fast and explainable; not a proof of global optimality.
export function optimize({dpBudget,spiralBudget,divLevel,levels,reefCount,godRank,priority}){
  const current={...levels},suggested={...levels},weights=weightSets[priority]||weightSets.balanced;
  let dpLeft=Math.max(0,dpBudget),spLeft=Math.max(0,spiralBudget),dpSpent=0,spSpent=0;
  const all=[...DP_UPGRADES,...SPIRAL_UPGRADES];
  for(let guard=0;guard<10000;guard++){
    let best=null,bestScore=0;
    for(const u of all){
      if(divLevel<u.unlock)continue;
      const isSp=u.id>=6,level=suggested[u.id]||0,budget=isSp?spLeft:dpLeft;
      const cost=upgradeCost(u,level);
      if(cost>budget)continue;
      const value=utility(u,level,level+1,{reefCount,godRank},weights);
      const score=value/Math.max(1,cost);
      if(score>bestScore){bestScore=score;best={u,isSp,level,cost};}
    }
    if(!best)break;
    suggested[best.u.id]=best.level+1;
    if(best.isSp){spLeft-=best.cost;spSpent+=best.cost;}else{dpLeft-=best.cost;dpSpent+=best.cost;}
  }
  const rows=all.map(u=>({upgrade:u,current:current[u.id]||0,suggested:suggested[u.id]||0,gained:(suggested[u.id]||0)-(current[u.id]||0),costSpent:costBetween(u,current[u.id]||0,suggested[u.id]||0)}));
  return {suggested,rows,dpSpent,spSpent,metrics:metricSnapshot(suggested,reefCount,godRank),before:metricSnapshot(current,reefCount,godRank)};
}
function costBetween(u,from,to){let sum=0;for(let i=from;i<to;i++)sum+=upgradeCost(u,i);return sum;}
