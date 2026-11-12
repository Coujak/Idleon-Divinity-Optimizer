// God Rank offering outcome bookkeeping. Pure functions keep the actual
// in-game result separate from the planner's unverified reroll probabilities.
export const OFFER_GROUPS=Object.freeze({
 low:Object.freeze([0,1,2]),
 high:Object.freeze([3,4,5])
});

export function offeringOutcomeChoices(low,high){
 return {low:Number(low),high:Number(high)};
}
export function applyGodRankAttempt({
 result,category,currentLow,currentHigh,nextLow,nextHigh,
 rank,budget,cost
}){
 if(result!=="failure"&&result!=="success")
  return {ok:false,error:"Choose a successful or failed attempt."};
 if(category!=="low"&&category!=="high")
  return {ok:false,error:"Choose the offering category you attempted."};
 const numbers=[currentLow,currentHigh,nextLow,nextHigh,rank,budget,cost].map(Number);
 const [oldLow,oldHigh,low,high,oldRank,dp,price]=numbers;
 if(![oldLow,low].every(value=>OFFER_GROUPS.low.includes(value))||
    ![oldHigh,high].every(value=>OFFER_GROUPS.high.includes(value)))
  return {ok:false,error:"Both offerings must be selected from their correct categories."};
 if(!Number.isSafeInteger(oldRank)||oldRank<0)
  return {ok:false,error:"Enter a valid current God Rank."};
 if(!Number.isFinite(dp)||dp<0||!Number.isFinite(price)||price<=0)
  return {ok:false,error:"Check the Divinity Points balance and sacrifice cost."};
 if(price>dp)
  return {ok:false,error:"Not enough Divinity Points for that offering."};
 return {
  ok:true,
  result,category,
  attemptedIndex:category==="low"?oldLow:oldHigh,
  previous:{low:oldLow,high:oldHigh,rank:oldRank,budget:dp},
  next:{low,high,rank:oldRank+(result==="success"?1:0),
   budget:Math.max(0,dp-price)},
  paid:price
 };
}

// Unverified planning assumption: after a failure each category can roll any
// of its three offerings independently, including the one already displayed.
// Actual outcomes always come from the user's two observed dropdown choices.
export function possibleOfferingRerolls(){
 return OFFER_GROUPS.low.flatMap(low=>
  OFFER_GROUPS.high.map(high=>({low,high,weight:1/9})));
}
