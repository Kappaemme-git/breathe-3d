import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export function createLungs(parent){
 const group=new T.Group();group.name='Anatomia polmonare dettagliata';parent.add(group);
 let seed=1985;function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
 const lungMat=new T.MeshPhysicalMaterial({color:0xd19a96,roughness:.47,transparent:true,opacity:.53,depthWrite:false,depthTest:false,side:T.FrontSide,clearcoat:.18,clearcoatRoughness:.5,vertexColors:true});
 lungMat.stencilWrite=true;lungMat.stencilRef=1;lungMat.stencilFunc=T.NotEqualStencilFunc;
 const accumulation={value:0};
 lungMat.onBeforeCompile=shader=>{
 shader.uniforms.accumulation=accumulation;
 shader.vertexShader='varying vec3 tissuePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntissuePosition=position;');
 shader.fragmentShader='uniform float accumulation; varying vec3 tissuePosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 p=tissuePosition;
 float tissueNoise=0.5+0.23*sin(p.x*13.0+p.y*9.0)*sin(p.z*18.0-p.y*6.0)+0.14*sin(p.y*29.0+p.x*21.0);
 float spread=smoothstep(tissueNoise-0.18,tissueNoise+0.25,accumulation*1.35);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.009,0.007,0.006),spread*0.97);
 `);
 };
 const airway=new T.MeshStandardMaterial({color:0xe0b2a1,roughness:.67,transparent:true,opacity:.82,depthWrite:false});
 const vascular=new T.MeshStandardMaterial({color:0xab6664,roughness:.65,transparent:true,opacity:.68,depthWrite:false});
 const fineMat=new T.LineBasicMaterial({color:0xe9aba3,transparent:true,opacity:.42,depthWrite:false});
 function surface(side,x,y,z){const width=.48*(.91-.2*y);const notch=side===1&&x<0?1-.25*Math.exp(-Math.pow((y+.1)*3,2)):1;return new T.Vector3(side*.51+x*width*notch+side*y*.065,2.62+y*.97,.09+z*.36)}
 const glowMat=new T.ShaderMaterial({uniforms:{strength:{value:0},tint:{value:new T.Color(0xff6848)}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float strength;uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float edge=pow(1.0-abs(dot(normalize(n),normalize(v))),2.4);gl_FragColor=vec4(tint,(0.07+0.64*edge)*strength);}`,transparent:true,depthWrite:false,depthTest:false,side:T.FrontSide,blending:T.AdditiveBlending});
 glowMat.stencilWrite=true;glowMat.stencilRef=1;glowMat.stencilFunc=T.NotEqualStencilFunc;
 const fissureMat=new T.MeshStandardMaterial({color:0x9a6665,transparent:true,opacity:.35,roughness:.8,depthWrite:false});
 for(const side of [-1,1]){
  const g=new T.SphereGeometry(1,112,80),a=g.attributes.position,colors=[];
  for(let i=0;i<a.count;i++){let x=a.getX(i),y=a.getY(i),z=a.getZ(i);const p=surface(side,x,y,z);const relief=.002*Math.sin(x*83+y*53)*Math.cos(z*71-y*29);p.addScaledVector(new T.Vector3(x,y,z),relief);a.setXYZ(i,p.x,p.y,p.z);const mottling=.86+.1*Math.sin(x*71+y*43+z*37)*Math.cos(x*33-z*53);colors.push(mottling,mottling*.94,mottling*.91)}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const m=new T.Mesh(g,lungMat);m.name=side<0?'Polmone destro - tre lobi':'Polmone sinistro - due lobi';m.renderOrder=11;group.add(m);const halo=new T.Mesh(g,glowMat);halo.name='Evidenziazione del polmone';halo.renderOrder=13;group.add(halo);
  const fissures=side<0?[-.05,.31]:[-.05];for(const f of fissures){let pts=[];for(let k=0;k<=48;k++){let angle=k/48*Math.PI*2;let y=f+.27*Math.cos(angle),r=Math.sqrt(1-y*y);pts.push(surface(side,r*Math.cos(angle),y,r*Math.sin(angle)))}const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),90,.005,5,false),fissureMat);mesh.name='Scissura lobare';group.add(mesh)}
 }
 const bronchi=[],vessels=[],lineVertices=[],endpoints=[],routes=[];
 function tube(pts,r,list){list.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),10,r,6,false))}
 function centroid(points){return points.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/points.length)}
 function grow(start,points,r,depth,path){const target=centroid(points);let end=start.clone().lerp(target,depth>0?.66:1);const mid=start.clone().lerp(end,.47);mid.z+=.012*Math.sin(depth*3+end.y);tube([start,mid,end],r,bronchi);const delta=new T.Vector3(.014,0,-.018);tube([start.clone().add(delta),mid.clone().add(delta),end.clone().add(delta)],r*.57,vessels);const chain=[...path,end.clone()];
 if(depth<=0||points.length<4){endpoints.push(end.toArray());routes.push(chain);for(let i=0;i<points.length;i++){lineVertices.push(...end.toArray(),...points[i].toArray())}return;}
 const bounds=new T.Box3().setFromPoints(points),size=bounds.getSize(new T.Vector3());let axis=size.y>size.x?'y':'x';if(size.z>size[axis])axis='z';points.sort((a,b)=>a[axis]-b[axis]);let n=Math.floor(points.length/2);grow(end,points.slice(0,n),r*.72,depth-1,chain);grow(end,points.slice(n),r*.72,depth-1,chain);
 }
 for(const side of [-1,1]){const points=[];for(let i=0;i<650;i++){let x,y,z;do{x=rnd()*2-1;y=rnd()*2-1;z=rnd()*2-1}while(x*x+y*y+z*z>.83);points.push(surface(side,x,y,z))}const entry=new T.Vector3(side*.27,3.08,.09);tube([new T.Vector3(0,3.27,.09),new T.Vector3(side*.13,3.17,.09),entry],.059,bronchi);grow(entry,points,.038,7,[new T.Vector3(0,3.27,.09),entry]);}
 const bg=mergeGeometries(bronchi);bronchi.forEach(g=>g.dispose());const bm=new T.Mesh(bg,airway);bm.name='Albero bronchiale - ramificazioni tridimensionali';bm.renderOrder=3;group.add(bm);
 const vg=mergeGeometries(vessels);vessels.forEach(g=>g.dispose());const vm=new T.Mesh(vg,vascular);vm.name='Rete vascolare polmonare';vm.renderOrder=3;group.add(vm);
 const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(lineVertices,3));group.add(new T.LineSegments(lg,fineMat));
 const alveoliMat=new T.MeshStandardMaterial({color:0xe5b2aa,roughness:.63,transparent:true,opacity:.55,depthWrite:false});
 const count=endpoints.length*9;const alveoli=new T.InstancedMesh(new T.SphereGeometry(.012,8,6),alveoliMat,count);const dummy=new T.Object3D();let index=0;for(const p of endpoints)for(let k=0;k<9;k++){dummy.position.set(p[0]+(rnd()-.5)*.047,p[1]+(rnd()-.5)*.047,p[2]+(rnd()-.5)*.047);dummy.scale.setScalar(.65+rnd()*.5);dummy.updateMatrix();alveoli.setMatrixAt(index++,dummy.matrix)}alveoli.name='Gruppi alveolari - scala didattica';group.add(alveoli);
 const damage=new T.Group();damage.name='Alterazioni croniche simboliche';damage.visible=false;group.add(damage);const damageMat=new T.MeshStandardMaterial({color:0x351713,emissive:0x611c12,emissiveIntensity:.2,roughness:1,transparent:true,opacity:.94,depthTest:false,depthWrite:false});damageMat.stencilWrite=true;damageMat.stencilRef=1;damageMat.stencilFunc=T.NotEqualStencilFunc;const dg=new T.SphereGeometry(.02,8,6);for(let i=0;i<65;i++){const p=endpoints[Math.floor(rnd()*endpoints.length)];const m=new T.Mesh(dg,damageMat);m.position.set(...p);m.scale.set(1+rnd(),1+rnd()*2,1);m.renderOrder=17;damage.add(m)}
 return {accumulation,group,lungMat,airway,endpoints,routes,alveoliMat,damage,glowMat,damageMat};
}
