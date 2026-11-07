import test from "node:test";
import assert from "node:assert/strict";
import {inspectIdleonSave} from "../src/idleon-parser.js";
test("recognizes data.Divinity as a raw indexed vector without assigning labels",()=>{
 const r=inspectIdleonSave({charNames:["A"],data:{Divinity:[7,5,3],Other:[1]}});
 assert.equal(r.dataKeyCount,2);
 assert.deepEqual(r.divinityVector,[{index:0,value:7,type:"number"},{index:1,value:5,type:"number"},{index:2,value:3,type:"number"}]);
 assert.deepEqual(r.candidateDataKeys,["Divinity"]);
});
test("rejects missing or malformed Divinity vectors",()=>{
 assert.equal(inspectIdleonSave({data:{Divinity:"bad"}}).divinityVector,null);
 assert.equal(inspectIdleonSave({data:{}}).divinityVector,null);
});
test("rejects non-object roots",()=>{
 assert.throws(()=>inspectIdleonSave([]),/JSON object/);
 assert.throws(()=>inspectIdleonSave(null),/JSON object/);
});
test("walks nested keys and avoids cycles",()=>{
 const root={data:{nested:{CoralKid:[1,2]}}}; root.loop=root;
 assert.ok(inspectIdleonSave(root).matchingPaths.some(x=>x.path==="data.nested.CoralKid"));
});
