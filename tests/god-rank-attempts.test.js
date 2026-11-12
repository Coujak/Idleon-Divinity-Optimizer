import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {applyGodRankAttempt,OFFER_GROUPS,possibleOfferingRerolls} from "../src/god-rank-attempts.js";

test("A failed low offering can also change the HIGH offering",()=>{
 const result=applyGodRankAttempt({
  result:"failure",category:"low",
  currentLow:0,currentHigh:3,nextLow:1,nextHigh:5,
  rank:25,budget:1000,cost:100
 });
 assert.equal(result.ok,true,result.error);
 assert.deepEqual(result.next,{low:1,high:5,rank:25,budget:900});
 assert.equal(result.attemptedIndex,0);
 assert.equal(result.paid,100);
});

test("A failed high offering may change low, high, both or neither",()=>{
 for(const [nextLow,nextHigh] of [[2,3],[0,5],[2,5],[0,3]]){
  const r=applyGodRankAttempt({
   result:"failure",category:"high",
   currentLow:0,currentHigh:3,nextLow,nextHigh,
   rank:7,budget:500,cost:200
  });
  assert.equal(r.ok,true,r.error);
  assert.equal(r.next.low,nextLow);
  assert.equal(r.next.high,nextHigh);
  assert.equal(r.next.rank,7);
  assert.equal(r.next.budget,300);
  assert.equal(r.attemptedIndex,3);
 }
});

test("Successful low or high attempt increases God Rank exactly once, deducting DP",()=>{
 for(const category of ["low","high"]){
  const r=applyGodRankAttempt({
   result:"success",category,currentLow:2,currentHigh:4,
   nextLow:0,nextHigh:5,
   rank:25,budget:5000,cost:1250
  });
  assert.equal(r.ok,true,r.error);
  assert.equal(r.next.rank,26);
  assert.equal(r.next.budget,3750);
  assert.deepEqual([r.next.low,r.next.high],[0,5]);
  assert.equal(r.attemptedIndex,category==="low"?2:4);
 }
});

test("Reject unaffordable attempts, invalid offerings, bad rank and bad DP",()=>{
 const valid={result:"success",category:"low",currentLow:0,currentHigh:3,
  nextLow:0,nextHigh:3,rank:4,budget:1000,cost:100};
 const bad=[
  {...valid,budget:99},
  {...valid,cost:Infinity},
  {...valid,cost:-2},
  {...valid,rank:-1},
  {...valid,rank:""},
  {...valid,rank:3.5},
  {...valid,nextLow:4},
  {...valid,nextHigh:1},
  {...valid,currentLow:5},
  {...valid,result:"other"},
  {...valid,category:"other"},
  {...valid,budget:NaN}
 ];
 for(const input of bad)assert.equal(applyGodRankAttempt(input).ok,false,JSON.stringify(input));
});

test("The unverified adaptive model considers all nine possible next low/high pairs",()=>{
 assert.deepEqual(OFFER_GROUPS.low,[0,1,2]);
 assert.deepEqual(OFFER_GROUPS.high,[3,4,5]);
 const outcomes=possibleOfferingRerolls();
 assert.equal(outcomes.length,9);
 assert.deepEqual(new Set(outcomes.map(x=>x.low)),new Set([0,1,2]));
 assert.deepEqual(new Set(outcomes.map(x=>x.high)),new Set([3,4,5]));
 assert.equal(Number(outcomes.reduce((sum,x)=>sum+x.weight,0).toFixed(10)),1);
});

test("God Rank UI offers both observed category selectors and separate success/failure actions",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
 for(const id of ["godFailedCategory","godAfterLow","godAfterHigh",
  "godRecordFailure","godRecordSuccess","godFailureStatus","godFailureCount"]){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 }
 assert.ok(!html.includes('id="godAfterFailure"'));
 assert.match(app,/godRecordFailure"\)\.addEventListener\("click",\(\)=>recordGodAttempt\("failure"\)/);
 assert.match(app,/godRecordSuccess"\)\.addEventListener\("click",\(\)=>recordGodAttempt\("success"\)/);
 assert.ok(app.includes('$("godRank").value=String(outcome.next.rank)'));
 assert.ok(app.includes('$("godHighOffer").value=String(outcome.next.high)'));
 assert.ok(app.includes('$("godLowOffer").value=String(outcome.next.low)'));
 assert.ok(app.includes('planGodRank();'));
 assert.ok(app.includes('godFailuresRecorded=0;')&&app.includes('godSuccessesRecorded=0;'));
 assert.ok(app.includes('for(const changed of modeledOfferingTransitions)'));
});
