import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './vendor/three.module.js';
import {createArmMotion,smokingCycle,breathCycle} from './motion.js';
const s=new T.Vector3(1.032,3.65,-.144),e=new T.Vector3(1.338,1.946,-.09),w=new T.Vector3(1.584,.59,.048);
const pose=createArmMotion(s,e,w,new T.Vector3(-.004,4.46,.55));
assert.deepEqual([6,18,30,42,48,54].map(t=>smokingCycle(t).load),[.25,.5,.75,1,0,.25]);
for(let puff=0;puff<4;puff++)for(let t=0;t<10;t+=.1)assert.ok(smokingCycle(puff*12+t+.1).load>=smokingCycle(puff*12+t).load-1e-9);
const manifest=JSON.parse(fs.readFileSync(new URL('./assets/bodyparts/upper-body.json',import.meta.url)));
const bin=fs.readFileSync(new URL('./assets/bodyparts/upper-body.bin',import.meta.url));
const part=manifest.parts.find(p=>p.id==='FJ2810');const hand=[];
for(let i=0;i<part.vertexCount;i++){const k=part.positions+i*12,v=new T.Vector3(bin.readFloatLE(k),bin.readFloatLE(k+4),bin.readFloatLE(k+8));if(v.x>1.18&&v.y<.48)hand.push(v.sub(w));}
let previous=pose(0),maxStep=0,maxRotationStep=0,minDistance=Infinity;
for(let t=0;t<=12;t+=.02){const p=pose(t);
 assert.ok(Math.abs(p.elbow.distanceTo(s)-s.distanceTo(e))<1e-6,'Upper arm length changed');
 assert.ok(Math.abs(p.wrist.distanceTo(p.elbow)-e.distanceTo(w))<1e-6,'Forearm length changed');
 maxStep=Math.max(maxStep,p.wrist.distanceTo(previous.wrist));
 for(const key of ['qUpper','qFore','qHand','qCigarette'])maxRotationStep=Math.max(maxRotationStep,p[key].angleTo(previous[key]));
 const filter=p.grip.clone().sub(new T.Vector3(0,0,.13).applyQuaternion(p.qCigarette));
 if(t>=2.5&&t<=5.5)assert.ok(filter.distanceTo(new T.Vector3(-.004,4.46,.55))<.005,'Cigarette loses mouth contact');
 previous=p;
 for(const v0 of hand){const v=v0.clone().applyQuaternion(p.qHand).add(p.wrist);if(v.y>1.5&&v.y<3.7){const d=Math.hypot(v.x/1.12,v.z/.65);minDistance=Math.min(minDistance,d);assert.ok(d>=1,`Hand intersects torso envelope at ${t}`);}}
}
assert.ok(maxStep<.09,'Discontinuous wrist trajectory');
assert.ok(maxRotationStep<.16,'Arm rotation flips');
assert.equal(breathCycle(0).expansion,0);
assert.equal(breathCycle(6).expansion,1);
assert.equal(breathCycle(11.5).expansion,0);
assert.ok(breathCycle(9).exhale>.9);
assert.equal(breathCycle(12).exhale,0);
assert.ok(pose(0).wrist.distanceTo(pose(12).wrist)<1e-9,'Loop seam');
assert.ok(pose(2.5).wrist.distanceTo(pose(5.5).wrist)<1e-9,'Hand drifts during inhale');
console.log({puffAccumulation:'25%, 50%, 75%, 100%, reset',handVerticesChecked:hand.length,minTorsoEnvelopeDistance:minDistance,maxStepAt50Hz:maxStep,maxRotationStepAt50Hz:maxRotationStep});
