import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const host=document.querySelector('#cigarette-stage');
const scene=new T.Scene();
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;host.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(.5,3.6,14.5);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.target.set(0,0,0);controls.minPolarAngle=.45;controls.maxPolarAngle=2.5;
scene.add(new T.HemisphereLight(0xffffff,0xb2b6a0,2.2));for(const [color,power,pos] of [[0xffeed8,3,[-4,7,5]],[0xffffff,2,[4,2,-5]]]){const light=new T.DirectionalLight(color,power);light.position.set(...pos);scene.add(light);}
const assembly=new T.Group();assembly.rotation.z=.13;scene.add(assembly);
let seed=7324;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function texture(filter){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=filter?'#c79b61':'#f4efe2';ctx.fillRect(0,0,256,128);for(let i=0;i<7000;i++){ctx.fillStyle=filter?`rgba(95,59,23,${.08+random()*.23})`:`rgba(121,108,83,${random()*.10})`;ctx.fillRect(random()*256,random()*128,filter?random()*3+.5:random()*9+.5,filter?random()*2+.5:.4);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
const white=new T.MeshStandardMaterial({map:texture(false),color:0xffffff,roughness:.92,side:T.DoubleSide});
const tipping=new T.MeshStandardMaterial({map:texture(true),color:0xffffff,roughness:.88,side:T.DoubleSide});
const panels=[];
function wrappers(start,end,rows,filter){const sectors=12,dx=(end-start)/rows,da=Math.PI*2/sectors,r=.278;
 for(let row=0;row<rows;row++)for(let sector=0;sector<sectors;sector++){
  const angle=(sector+.5)*da,center=new T.Vector3(start+(row+.5)*dx,Math.cos(angle)*r,Math.sin(angle)*r),positions=[],uv=[],index=[];
  for(let i=0;i<=6;i++){const theta=(sector+i/6)*da;for(let j=0;j<2;j++){positions.push((j-.5)*dx,Math.cos(theta)*r-center.y,Math.sin(theta)*r-center.z);uv.push(j,i/6);}}
  for(let i=0;i<6;i++){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();const mesh=new T.Mesh(g,filter?tipping:white);mesh.position.copy(center);assembly.add(mesh);
  const destination=center.clone().add(new T.Vector3(filter?1.45:(random()-.5)*.9,filter?-1.25+Math.cos(angle)*.55:1.8+Math.cos(angle)*.8,Math.sin(angle)*1.1));
  panels.push({mesh,center,destination,rotation:new T.Euler((random()-.5)*.9,(random()-.5)*.8,(random()-.5)*.6),phase:random()*6});
 }
}
wrappers(-3.55,1.55,9,false);wrappers(1.55,3.55,3,true);
const dummy=new T.Object3D(),color=new T.Color();
function createFill(count,filter){
 const g=filter?new T.CylinderGeometry(1,1,1,5):new T.BoxGeometry(1,1,1);
 const mat=new T.MeshStandardMaterial({color:filter?0xf8f0d9:0xffffff,roughness:.94});const mesh=new T.InstancedMesh(g,mat,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;assembly.add(mesh);const pieces=[];
 for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.245;
  const start=new T.Vector3(filter?2.55:-3.52+random()*5.02,Math.cos(a)*r,Math.sin(a)*r);
  const end=filter?new T.Vector3(start.x+1.6+(random()-.5)*.45,start.y*3-.7,start.z*3):new T.Vector3(start.x+(random()-.5)*1.7,start.y*4-.55+(random()-.5)*.85,start.z*5+(random()-.5)*.75);
  const scale=filter?new T.Vector3(.008,1.91,.008):new T.Vector3(.08+random()*.29,.009+random()*.012,.016+random()*.045);
  const rot=filter?new T.Euler(0,0,Math.PI/2):new T.Euler(random()*3,random()*.5,random()*.65);
  const turn=new T.Vector3((random()-.5)*(filter?.3:2),(random()-.5)*(filter?.3:2),(random()-.5)*(filter?.25:2));
  if(!filter){color.setHSL(.065+random()*.045,.42+random()*.25,.12+random()*.19);mesh.setColorAt(i,color);}
  pieces.push({start,end,scale,rot,turn,phase:random()*6});
 }
 return {mesh,pieces};
}
const tobacco=createFill(1400,false),fibers=createFill(700,true);
let elapsed=0,open=0,target=null,visible=false,last=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const button=document.querySelector('#dissect-toggle'),status=document.querySelector('#dissect-status');
button.onclick=()=>{target=open>.5?0:1;button.setAttribute('aria-pressed',target===1);button.textContent=target===1?'Put it together ↗':'Take it apart ↗';};
function ease(v){v=T.MathUtils.clamp(v,0,1);return v*v*v*(v*(v*6-15)+10);}
function renderParts(amount,t){
 for(const p of panels){p.mesh.position.lerpVectors(p.center,p.destination,amount);p.mesh.position.y+=Math.sin(t*.7+p.phase)*.035*amount;p.mesh.rotation.set(p.rotation.x*amount,p.rotation.y*amount,p.rotation.z*amount);}
 for(const {mesh,pieces} of [tobacco,fibers]){for(let i=0;i<pieces.length;i++){const p=pieces[i];dummy.position.lerpVectors(p.start,p.end,amount);dummy.position.y+=Math.sin(t*.7+p.phase)*.025*amount;dummy.rotation.set(p.rot.x+p.turn.x*amount,p.rot.y+p.turn.y*amount,p.rot.z+p.turn.z*amount);dummy.scale.copy(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;}
}
const labels=[['paper',new T.Vector3(-1,2.6,.4)],['tobacco',new T.Vector3(-2,-1.5,.6)],['filter',new T.Vector3(4.45,.4,.4)]];
const vector=new T.Vector3();
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=camera.aspect<1?49:34;camera.position.z=camera.aspect<1?18:14.5;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);resize();renderParts(0,0);
new IntersectionObserver(([e])=>{visible=e.isIntersecting;last=performance.now();},{rootMargin:'100px'}).observe(host);
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;if(!visible||document.hidden)return;if(!reduced)elapsed+=dt;
 if(target===null){const t=elapsed%16;open=reduced?0:t<2?0:t<6?ease((t-2)/4):t<11?1:t<15?1-ease((t-11)/4):0;button.textContent=open>.5?'Put it together ↗':'Take it apart ↗';button.setAttribute('aria-pressed',open>.5);}else{open+=(target-open)*(1-Math.exp(-3.6*dt));if(Math.abs(target-open)<.001)open=target;}
 renderParts(open,reduced?0:elapsed);controls.update();assembly.updateMatrixWorld(true);
 for(const [id,position] of labels){vector.copy(position);assembly.localToWorld(vector);vector.project(camera);const label=document.querySelector('#component-'+id);label.style.left=`${(vector.x*.5+.5)*100}%`;label.style.top=`${(-vector.y*.5+.5)*100}%`;label.style.opacity=ease((open-.4)/.6);}
 const text=open>.85?'PAPER. TOBACCO. FILTER.':open<.1?'ONE CIGARETTE.':'LOOK BENEATH THE WRAPPER.';if(status.textContent!==text)status.textContent=text;
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
