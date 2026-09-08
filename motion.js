import * as T from './vendor/three.module.js';
export const ease=v=>{v=T.MathUtils.clamp(v,0,1);return v*v*v*(v*(v*6-15)+10)};
export function smokingCycle(time){
 const elapsed=((time%48)+48)%48,t=elapsed%12,puff=Math.floor(elapsed/12);
 const deposit=ease((t-3.1)/2.8),reset=ease((elapsed-47)/1);
 return {elapsed,t,puff,deposit,load:(puff+deposit)/4*(1-reset),reset};
}
export function breathCycle(time){
 const {t}=smokingCycle(time);
 const inhale=ease((t-2.65)/2.4),release=ease((t-7.65)/3.6);
 const expansion=inhale*(1-release);
 const exhale=ease((t-7.7)/.65)*(1-ease((t-10.2)/1.1));
 return {expansion,exhale};
}
export function createArmMotion(shoulder,elbow,wrist,mouth){
 const upper=elbow.clone().sub(shoulder),fore=wrist.clone().sub(elbow),L1=upper.length(),L2=fore.length();
 const grip=new T.Vector3(1.61,-.19,.48).sub(wrist);
 // Constrain both the finger direction and palm normal: a single-vector rotation
 // leaves wrist roll undefined and can turn the hand inside-out toward the face.
 function frame(direction,normal){const y=direction.clone().normalize(),z=normal.clone().addScaledVector(y,-normal.dot(y)).normalize(),x=new T.Vector3().crossVectors(y,z);return new T.Matrix4().makeBasis(x,y,z)}
 const source=frame(grip,new T.Vector3(0,.38,.92));
 const target=frame(new T.Vector3(-.57,.77,-.28),new T.Vector3(-.9,-.35,-.2));
 const heldRotation=new T.Quaternion().setFromRotationMatrix(target.multiply(source.invert()));
 const contact=mouth.clone().add(new T.Vector3(-.071,-.003,.109));
 const heldWrist=contact.clone().sub(grip.clone().applyQuaternion(heldRotation));
 // Keep the resting hand in front of the hip and swing it outside the chest.
 const lowWrist=new T.Vector3(1.68,.74,.36);
 const curve=new T.CubicBezierCurve3(lowWrist,new T.Vector3(2.08,1.65,1.0),new T.Vector3(1.33,3.12,1.18),heldWrist);
 // Parameterize the complete curved route by distance, so the wrist does
 // not surge through long curve sections and stall in short ones.
 const arc=[0];let arcLength=0,lastPoint=curve.getPoint(0);
 for(let i=1;i<=160;i++){const u=i/160,p=curve.getPoint(u);p.z+=.95*Math.sin(Math.PI*u)**2;arcLength+=p.distanceTo(lastPoint);arc.push(arcLength);lastPoint=p;}
 function distanceParameter(fraction){const distance=fraction*arcLength;let low=0,high=160;while(high-low>1){const mid=(low+high)>>1;if(arc[mid]<distance)low=mid;else high=mid;}return (low+(distance-arc[low])/(arc[high]-arc[low]))/160;}
 const restPalmRoll=new T.Quaternion().setFromAxisAngle(fore.clone().normalize(),1.05);
 const gripRotation=heldRotation.clone().invert().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.58));
 return function pose(time){
  const {t}=smokingCycle(time);const lift=t<2.5?ease(t/2.5):t<5.5?1:t<8.2?1-ease((t-5.5)/2.7):0;
  const u=distanceParameter(lift);const wristTarget=curve.getPoint(u);wristTarget.z+=.95*Math.sin(Math.PI*u)**2;
  const direction=wristTarget.clone().sub(shoulder),distance=direction.length();direction.normalize();
  const d=T.MathUtils.clamp(distance,.01,L1+L2-.005),a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const pole=new T.Vector3(1.65,1.25,-.85).sub(shoulder);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbowTarget=shoulder.clone().addScaledVector(direction,a).addScaledVector(pole,h);
  const qUpper=new T.Quaternion().setFromUnitVectors(upper.clone().normalize(),elbowTarget.clone().sub(shoulder).normalize());
  // Bend the forearm relative to the upper arm, preserving elbow roll.
  // Independent world-space shortest-arc rotations flip near the raised pose.
  const qBend=new T.Quaternion().setFromUnitVectors(fore.clone().normalize().applyQuaternion(qUpper),wristTarget.clone().sub(elbowTarget).normalize());
  const qFore=qBend.multiply(qUpper);
  const qHand=qFore.clone().multiply(restPalmRoll).slerp(heldRotation,ease(u));
  const qCigarette=qHand.clone().multiply(gripRotation);
  return {t,lift,wrist:wristTarget,elbow:elbowTarget,qUpper,qFore,qHand,qCigarette,grip:wristTarget.clone().add(grip.clone().applyQuaternion(qHand))};
 };
}
