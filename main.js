import * as THREE from './vendor/three.module.js';
import { slots } from './slots.js';
import { editorialImages, imageSequence } from './media.js?v=20261104-2';
const CONFIG = Object.freeze({cameraZ:1500,fov:75,depth:1200,speed:.6,sensitivity:1.4,friction:.92,velocityLimit:2,scrollGain:.001,follow:.15,cameraFollow:.1,referenceWidth:1440,referenceHeight:952,count:60,planeWidth:350,planeHeight:250,entranceMs:1000});
const RADIUS_STEPS=[4,6,8,10,12];
const NAVIGATION_CLEARANCE=16;
const RETURN_GESTURE_IDLE_MS=320;
// Revert only this switch to restore the shared 12-image pool.
const INDEPENDENT_INCOMING_LAYOUTS=false;
const host=document.querySelector('.field');
const navigation=document.querySelector('.navigation');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(pointer:fine)');
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:devicePixelRatio<2,powerPreference:'high-performance'});}catch{fallback();}
function fallback(){const ranked=[...slots.keys()].sort((a,b)=>slots[a][2]*slots[a][3]-slots[b][2]*slots[b][3]),radii=new Map(ranked.map((index,rank)=>[index,RADIUS_STEPS[Math.round(rank*(RADIUS_STEPS.length-1)/(ranked.length-1))]]));host.replaceChildren(...slots.map(([x,y,w,h],index)=>{const el=document.createElement('div');el.className='fallback-card';el.style.cssText=`left:${x/14.4}%;top:${y/9.52}%;width:${w/14.4}%;height:${h/9.52}%;border-radius:${radii.get(index)}px;background-image:url('${editorialImages[imageSequence[index]].src}')`;return el;}));}
if(renderer){
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(CONFIG.fov,1,.1,5000);camera.position.z=CONFIG.cameraZ;
 renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
 const geometry=new THREE.PlaneGeometry(1,1);const pointer=new THREE.Vector2(3,3);
 const placeholderTexture=new THREE.DataTexture(new Uint8Array([217,217,217,255]),1,1);placeholderTexture.colorSpace=THREE.SRGBColorSpace;placeholderTexture.needsUpdate=true;
 const cursor=document.querySelector('.cursor');
 const state={target:0,position:0,velocity:0,lastInput:0,cameraX:0,cameraY:0,targetX:0,targetY:0,inside:false};
 let handoffReturn=null,ignoreReverseUntil=0;
 let previousPageScroll=window.scrollY;
 let width=1,height=1,frame=0,lastTime=0,visible=true,disposed=false;
 let nextImage=0,enabled=true,gap=0,padding=0,scrollTimer=0,lastSeed=null,layoutRects=null,layoutKey='',placementArrangement=1;
 let random=Math.random;
 let remainingImages=3,newLayoutDelay=0,imageCount=40,placementNumber=0;
 const densityStats=[];
 const outgoing=[];
 function clearOutgoing(){outgoing.splice(0).forEach(mesh=>{scene.remove(mesh);mesh.material.map?.dispose();mesh.material.dispose();});}
 function retainOutgoing(){if(!INDEPENDENT_INCOMING_LAYOUTS)return;cards.filter(c=>c.userData.index<imageCount&&c.material.opacity>.01).forEach(c=>{const mesh=new THREE.Mesh(geometry,roundedMaterial());mesh.userData={...c.userData,retiredAt:performance.now(),retiredOpacity:c.material.opacity};mesh.material.map=c.material.map?.clone();mesh.material.color.copy(c.material.color);mesh.material.userData.rounded.size.value.copy(c.material.userData.rounded.size.value);mesh.material.userData.rounded.radius.value=c.material.userData.rounded.radius.value;scene.add(mesh);outgoing.push(mesh);});}
 function clearPending(){cards.forEach(c=>c.userData.recycleReadyAt=null);}
 // Retention changes travel time, never position or a frozen visual copy.
 // With count=0 the source's independent speed distribution is unchanged.
 function staggerSpeeds(){
  const active=cards.filter(c=>c.userData.index<imageCount);
  const area=c=>{const d=c.userData,r=layoutRects?.[d.index];if(r)return r.w*r.h;const z=d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed;return (d.baseWidth||350)*(d.baseHeight||250)/Math.max(100,CONFIG.cameraZ-z)**2;};
  const lingering=new Set([...active].sort((a,b)=>area(b)-area(a)).slice(0,remainingImages));
  active.forEach(c=>{const d=c.userData,z=d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed;d.naturalSpeed??=d.speed;d.linger=lingering.has(c);d.speed=d.naturalSpeed*(d.linger?.65:1);d.initialZ=z-state.position*CONFIG.depth*CONFIG.speed*d.speed;});
 }
 // Reference distribution: independent uniform draws, without layout presets,
 // edge bias, collision avoidance, or forced spreading.
 const randomPosition=()=>{const speed=.7+random()*.6;return {baseX:(random()-.5)*2000,baseY:(random()-.5)*2000,initialZ:-random()*CONFIG.depth+random()*CONFIG.depth*.3,speed,naturalSpeed:speed};};
 function roundedMaterial(){
  const material=new THREE.MeshBasicMaterial({color:0xd9d9d9,map:placeholderTexture,transparent:true,opacity:0,side:THREE.DoubleSide});
  const rounded={size:{value:new THREE.Vector2(CONFIG.planeWidth,CONFIG.planeHeight)},radius:{value:RADIUS_STEPS[0]}};material.userData.rounded=rounded;
  material.onBeforeCompile=shader=>{shader.uniforms.uRoundSize=rounded.size;shader.uniforms.uRoundRadius=rounded.radius;shader.vertexShader=shader.vertexShader.replace('void main() {','varying vec2 vRoundUv;\nvoid main() {\nvRoundUv=uv;');shader.fragmentShader=shader.fragmentShader.replace('void main() {','varying vec2 vRoundUv;\nuniform vec2 uRoundSize;\nuniform float uRoundRadius;\nvoid main() {').replace('#include <map_fragment>','#include <map_fragment>\nvec2 roundSize=max(uRoundSize,vec2(1.0));\nfloat roundRadius=min(uRoundRadius,min(roundSize.x,roundSize.y)*0.5);\nvec2 roundPoint=abs((vRoundUv-0.5)*roundSize)-(roundSize*0.5-roundRadius);\nfloat roundDistance=length(max(roundPoint,0.0))+min(max(roundPoint.x,roundPoint.y),0.0)-roundRadius;\nfloat roundEdge=max(fwidth(roundDistance),0.75);\ndiffuseColor.a*=1.0-smoothstep(-roundEdge,roundEdge,roundDistance);\nif(diffuseColor.a<0.001)discard;');};
  material.customProgramCacheKey=()=> 'rise-rounded-image-v2';return material;
 }
 const cards=Array.from({length:CONFIG.count},(_,index)=>{const material=roundedMaterial();const mesh=new THREE.Mesh(geometry,material);mesh.userData={...randomPosition(),slot:[0,0,350,250],index,imageIndex:nextImage++%editorialImages.length,cycle:0,textureMap:null,opacity:0,radius:RADIUS_STEPS[0]};scene.add(mesh);return mesh;});
 const loadedTextures=[];let ready=false,entranceElapsed=0;
 function placeInLayout(data,index,z){
  if(!layoutRects){data.baseWidth=CONFIG.planeWidth;data.baseHeight=CONFIG.planeHeight;data.slot=[0,0,350,250];return;}
  const r=layoutRects[index%layoutRects.length],bounds=host.getBoundingClientRect();
  const unit=2*(CONFIG.cameraZ-z)*Math.tan(THREE.MathUtils.degToRad(CONFIG.fov/2))/height;
  const scale=.3+.9*(1-THREE.MathUtils.clamp((CONFIG.cameraZ-z)/CONFIG.depth,0,1));
  data.baseX=(r.cx-bounds.left-width/2)*unit;data.baseY=(height/2-(r.cy-bounds.top))*unit;
  data.baseWidth=r.w*unit/scale;data.baseHeight=r.h*unit/scale;data.slot=[0,0,r.w,r.h];
  data.layoutArrangement=placementArrangement;
  data.layoutSlot=index%layoutRects.length;
 }
 function projectedRect(data,z){
  const s=.3+.9*(1-THREE.MathUtils.clamp((CONFIG.cameraZ-z)/CONFIG.depth,0,1));
  const x=data.baseX*(1+gap/100),y=navigationSafeY(data,z,s),w=(data.baseWidth||350)*s,h=(data.baseHeight||250)*s,bounds=host.getBoundingClientRect();
  const points=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([dx,dy])=>new THREE.Vector3(x+dx*w/2,y+dy*h/2,z).project(camera));
  const left=bounds.left+(Math.min(...points.map(p=>p.x))+1)*width/2,right=bounds.left+(Math.max(...points.map(p=>p.x))+1)*width/2;
  const top=bounds.top+(1-Math.max(...points.map(p=>p.y)))*height/2,bottom=bounds.top+(1-Math.min(...points.map(p=>p.y)))*height/2;
  return {left,right,top,bottom,w:right-left,h:bottom-top,cx:(left+right)/2,cy:(top+bottom)/2,z};
 }
 function navigationSafeY(data,z,scale){
  const bounds=host.getBoundingClientRect(),unit=2*Math.max(100,CONFIG.cameraZ-z)*Math.tan(THREE.MathUtils.degToRad(CONFIG.fov/2))/height,baseY=data.baseY*(1+gap/100),projectedHeight=(data.baseHeight||CONFIG.planeHeight)*scale/unit;
  const neutralTop=bounds.top+height/2-baseY/unit-projectedHeight/2,safeTop=navigation.getBoundingClientRect().bottom+NAVIGATION_CLEARANCE;
  // Smooth boundary response avoids the hard clamp's visible change in velocity.
  const offset=safeTop-neutralTop,softness=24;
  return baseY-(Math.max(0,offset)+softness*Math.log1p(Math.exp(-Math.abs(offset)/softness)))*unit;
 }
 function updateRadii(){
  const ranked=cards.filter(c=>c.userData.index<imageCount).map(c=>{const d=c.userData,z=d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed,rect=projectedRect(d,z);return {c,area:rect.w*rect.h,size:new THREE.Vector2(Math.max(1,rect.w),Math.max(1,rect.h))};}).sort((a,b)=>a.area-b.area);
  ranked.forEach((entry,rank)=>{const step=ranked.length<2?0:Math.round(rank*(RADIUS_STEPS.length-1)/(ranked.length-1)),radius=RADIUS_STEPS[step],rounded=entry.c.material.userData.rounded;entry.c.userData.radius=radius;rounded.size.value.copy(entry.size);rounded.radius.value=radius;});
 }
 const intersection=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 function placeInOpenSpace(data,z){
  const hero=host.parentElement.getBoundingClientRect(),frame={left:hero.left+padding,right:hero.right-padding,top:hero.top+Math.max(86,padding),bottom:hero.bottom-padding};
  const occupied=cards.filter(c=>c.userData!==data&&c.userData.index<imageCount&&(c.material.opacity>.15||c.userData.placementClaimed)).map(c=>projectedRect(c.userData,c.userData.initialZ+state.position*CONFIG.depth*CONFIG.speed*c.userData.speed)).filter(r=>r.right>frame.left&&r.left<frame.right&&r.bottom>frame.top&&r.top<frame.bottom&&r.z<1400);
  const dimensions=projectedRect(data,z),fit=Math.min(1,Math.max(40,frame.right-frame.left)/dimensions.w,Math.max(40,frame.bottom-frame.top)/dimensions.h),w=dimensions.w*fit,h=dimensions.h*fit;
  if(fit<1){data.baseWidth*=fit;data.baseHeight*=fit;}
  const overlapTurn=placementNumber++%3===2,targets=occupied.filter(r=>r.z<z);const desiredOverlap=overlapTurn&&targets.length>0;
  const headline=document.querySelector('h1').getBoundingClientRect();let best=null;
  for(let i=0;i<64;i++){
   let cx=frame.left+w/2+random()*Math.max(0,frame.right-frame.left-w),cy=frame.top+h/2+random()*Math.max(0,frame.bottom-frame.top-h);
   if(desiredOverlap){const t=targets[Math.floor(random()*targets.length)];cx=t.cx+(random()-.5)*(t.w+w)*.65;cy=t.cy+(random()-.5)*(t.h+h)*.65;cx=THREE.MathUtils.clamp(cx,frame.left+w/2,frame.right-w/2);cy=THREE.MathUtils.clamp(cy,frame.top+h/2,frame.bottom-h/2);}
   const r={left:cx-w/2,right:cx+w/2,top:cy-h/2,bottom:cy+h/2,w,h,cx,cy};
   const overlaps=occupied.map(o=>intersection(r,o)/Math.min(w*h,o.w*o.h));const max=Math.max(0,...overlaps),hits=overlaps.filter(a=>a>.02).length;
   const concentration=occupied.reduce((sum,o)=>sum+Math.exp(-((cx-o.cx)**2/(w+o.w+80)**2+(cy-o.cy)**2/(h+o.h+80)**2)*3),0);
   const textPenalty=intersection(r,headline)/(w*h)*35;
   const score=(desiredOverlap?Math.abs(max-.25)*12+Math.max(0,hits-1)*12:max*120+hits*8)+concentration+textPenalty;
   if(!best||score<best.score)best={...r,score,overlaps:hits};
  }
  const bounds=host.getBoundingClientRect(),ndc=new THREE.Vector3((best.cx-bounds.left)/width*2-1,1-(best.cy-bounds.top)/height*2,.5).unproject(camera),direction=ndc.sub(camera.position).normalize();
  const point=camera.position.clone().addScaledVector(direction,(z-camera.position.z)/direction.z);
  data.baseX=point.x/(1+gap/100);data.baseY=point.y/(1+gap/100);data.placementClaimed=true;
  densityStats.push({overlapTurn,desiredOverlap,overlaps:best.overlaps,score:best.score,x:best.cx,y:best.cy});if(densityStats.length>200)densityStats.shift();
 }
 function resetPositions(){clearPending();cards.forEach(c=>{c.userData.placementClaimed=false;c.material.opacity=0;});cards.forEach(c=>{Object.assign(c.userData,randomPosition(),{opacity:0});c.userData.naturalSpeed=c.userData.speed;if(layoutRects)c.userData.initialZ=layoutRects[c.userData.index%layoutRects.length].depth??200+random()*500;placeInLayout(c.userData,c.userData.index,c.userData.initialZ);if(layoutRects&&imageCount!==12&&c.userData.index<imageCount&&(!layoutRects[0].saved||c.userData.index>=layoutRects.length))placeInOpenSpace(c.userData,c.userData.initialZ);c.userData.placementClaimed=c.userData.index<imageCount;assignImage(c,c.userData.imageIndex);});cards.forEach(c=>c.userData.placementClaimed=false);staggerSpeeds();updateRadii();entranceElapsed=0;}
 function coverTexture(map,[,,w,h]){const frame=w/h,source=1;if(frame>source){map.repeat.set(1,source/frame);map.offset.set(0,(1-map.repeat.y)/2);}else{map.repeat.set(frame/source,1);map.offset.set((1-map.repeat.x)/2,0);}map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;}
 function assignImage(mesh,index){const source=loadedTextures[index];if(!source)return;mesh.userData.textureMap?.dispose();const map=source.clone();coverTexture(map,mesh.userData.slot);mesh.userData.textureMap=map;mesh.material.map=map;mesh.material.color.setHex(0xffffff);mesh.material.needsUpdate=true;}
 Promise.all(editorialImages.map(image=>new THREE.TextureLoader().loadAsync(image.src).catch(()=>null))).then(textures=>{if(disposed){textures.forEach(texture=>texture?.dispose());return;}loadedTextures.push(...textures);cards.forEach(mesh=>assignImage(mesh,mesh.userData.imageIndex));ready=true;start();});
 function measure(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render(0);}
 function recordSettled(){if(cards.some(c=>c.userData.recycleReadyAt!=null)){scrollTimer=setTimeout(recordSettled,100);return;}window.dispatchEvent(new CustomEvent('orange-arrangement',{detail:capture()}));}
 function input(delta){if(reduced.matches||!enabled)return;const now=performance.now();
  // An upward page gesture can continue emitting deltas after reaching the hero.
  if(delta<0&&(window.scrollY>0||now<ignoreReverseUntil)){ignoreReverseUntil=now+RETURN_GESTURE_IDLE_MS;return;}
  if(handoffReturn?.restored)return;
  const dt=Math.max(8,now-state.lastInput);if(!state.lastInput||now-state.lastInput>180)window.dispatchEvent(new Event('hero-depth-input'));state.velocity=state.velocity*.3+delta*CONFIG.scrollGain*1000/dt*.7;state.velocity=THREE.MathUtils.clamp(state.velocity,-CONFIG.velocityLimit,CONFIG.velocityLimit);state.target+=delta*CONFIG.scrollGain;state.lastInput=now;start();clearTimeout(scrollTimer);scrollTimer=setTimeout(recordSettled,1200);}
 function wheel(e){
  // Native page travel supplies the depth change between sections.
  if(e.ctrlKey||e.deltaY>=0||window.scrollY>0)return;
  input(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1));
 }
 function pageScroll(){
  const y=window.scrollY;
  if(y<previousPageScroll)ignoreReverseUntil=performance.now()+RETURN_GESTURE_IDLE_MS;
  if(!reduced.matches&&previousPageScroll<=0&&y>0){
   state.target=state.position;state.velocity=0;
   window.dispatchEvent(new Event('hero-depth-input'));
  }
  previousPageScroll=y;
  start();
 }
 function move(e){if(e.pointerType==='touch'||!fine.matches)return;state.inside=true;const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/width*2-1,-((e.clientY-rect.top)/height*2-1));state.targetX=pointer.x*CONFIG.sensitivity*100;state.targetY=pointer.y*CONFIG.sensitivity*100;cursor.style.left=`${e.clientX}px`;cursor.style.top=`${e.clientY}px`;cursor.classList.toggle('on',fine.matches&&!reduced.matches);start();}
 function leave(){state.inside=false;state.targetX=state.targetY=0;pointer.set(3,3);cursor.classList.remove('on');start();}
 let touchY=0;
 function touchStart(e){touchY=e.touches[0].clientY;}
 function touchMove(e){const y=e.touches[0].clientY;if(window.scrollY===0&&y>touchY)input((touchY-y)*2);touchY=y;}
 function key(e){if(!enabled||e.target.closest('a,button,input,textarea,select,[role=slider]'))return;const values={ArrowDown:80,ArrowUp:-80,PageDown:350,PageUp:-350,' ':350};if(e.key==='Home'){e.preventDefault();window.scrollTo(0,0);state.target=state.position=state.velocity=0;resetPositions();start();}else if(e.key in values){e.preventDefault();window.scrollBy(0,values[e.key]);}}
 function render(dt){const ticks=dt?Math.min(dt,50)/16.667:1;const lerp=1-Math.pow(1-CONFIG.follow,ticks);state.velocity*=Math.pow(CONFIG.friction,ticks);if(Math.abs(state.velocity)<.001)state.velocity=0;if(!reduced.matches){state.target+=state.velocity*dt/1000;state.position+=(state.target-state.position)*lerp;state.cameraX+=(state.targetX-state.cameraX)*(1-Math.pow(1-CONFIG.cameraFollow,ticks));state.cameraY+=(state.targetY-state.cameraY)*(1-Math.pow(1-CONFIG.cameraFollow,ticks));}camera.position.set(reduced.matches?0:state.cameraX,reduced.matches?0:state.cameraY,CONFIG.cameraZ);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 // The shipped reference adds extra velocity decay after 100ms without input,
 // while smoothed depth continues approaching its target each frame.
 if(state.lastInput&&performance.now()-state.lastInput>100)state.velocity*=Math.pow(.8,ticks);
 if(!ready)return;
 entranceElapsed+=Math.min(dt,50);const entranceProgress=reduced.matches?1:Math.min(entranceElapsed/CONFIG.entranceMs,1);const entrance=entranceProgress*entranceProgress*(3-2*entranceProgress);
 const now=performance.now();
 const pageProgress=reduced.matches?0:THREE.MathUtils.clamp(window.scrollY/host.parentElement.offsetHeight,0,1);
 const pageDepth=pageProgress*CONFIG.depth*.35;
 const pageOpacity=1-THREE.MathUtils.smoothstep(pageProgress,.72,1);
 cards.forEach(mesh=>{const d=mesh.userData;if(d.index>=imageCount){mesh.visible=false;mesh.material.opacity=0;return;}let z=d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed;
 const distance=CONFIG.cameraZ-z;
 const targetOpacity=distance>=405&&distance<=1890?1:0;
 d.opacity=reduced.matches?1:THREE.MathUtils.lerp(d.opacity,targetOpacity,lerp);
 // Opacity has its own clock: it reaches zero even when depth travel settles.
 const recycleEligible=!reduced.matches&&d.opacity<.01&&(z>1600||distance>1300);
 if(recycleEligible&&d.recycleReadyAt==null)d.recycleReadyAt=now;
 if(!recycleEligible)d.recycleReadyAt=null;
 if(recycleEligible&&(z>1600||now-d.recycleReadyAt>=newLayoutDelay)){
   const exitingNear=z>1600;const fresh=randomPosition();d.baseX=fresh.baseX;d.baseY=fresh.baseY;d.naturalSpeed=fresh.speed;d.speed=fresh.speed*(d.linger?.65:1);
   const preset=layoutRects?.[d.index%layoutRects.length];
   z=preset?.saved?preset.depth:exitingNear?-random()*CONFIG.depth:CONFIG.depth*(.2+random()*.5);
   d.initialZ=z-state.position*CONFIG.depth*CONFIG.speed*d.speed;d.opacity=0;
   // Telescope arrangements are complete compositions: each plane retains
   // its own slot so recycling cannot duplicate slots or abandon regions.
   placeInLayout(d,layoutRects?d.index:Math.floor(random()*CONFIG.count),z);
   if(z>=-390&&z<=1095&&(!preset?.saved||d.index>=layoutRects.length))placeInOpenSpace(d,z);
   d.imageIndex=nextImage++%editorialImages.length;assignImage(mesh,d.imageIndex);
   updateRadii();
   d.recycleReadyAt=null;
 }
 // Page projection never recycles a card, so reverse travel retraces the scale.
 z+=pageDepth*d.speed;
 const nearOpacity=THREE.MathUtils.smoothstep(CONFIG.cameraZ-z,405,600);
 const scale=.3+.9*(1-THREE.MathUtils.clamp((CONFIG.cameraZ-z)/CONFIG.depth,0,1));
 mesh.position.set(d.baseX*(1+gap/100),navigationSafeY(d,z,scale),z);mesh.scale.set((d.baseWidth||CONFIG.planeWidth)*scale,(d.baseHeight||CONFIG.planeHeight)*scale,1);
 mesh.material.opacity=d.handoff?0:d.opacity*entrance*pageOpacity*(reduced.matches?1:nearOpacity);mesh.visible=z>-CONFIG.depth*2&&z<CONFIG.cameraZ;
 });cards.forEach(c=>c.userData.placementClaimed=false);
 for(let i=outgoing.length-1;i>=0;i--){const mesh=outgoing[i],d=mesh.userData,z=d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed,scale=.3+.9*(1-THREE.MathUtils.clamp((CONFIG.cameraZ-z)/CONFIG.depth,0,1)),distance=CONFIG.cameraZ-z;const lifetime=Math.max(0,1-(now-d.retiredAt)/1600),target=distance>=405&&distance<=1890?d.retiredOpacity*lifetime:0;mesh.material.opacity=THREE.MathUtils.lerp(mesh.material.opacity,target,lerp);mesh.position.set(d.baseX*(1+gap/100),navigationSafeY(d,z,scale),z);mesh.scale.set((d.baseWidth||350)*scale,(d.baseHeight||250)*scale,1);mesh.visible=z<1500&&z>-2400;if(lifetime===0&&mesh.material.opacity<.01){scene.remove(mesh);mesh.material.map?.dispose();mesh.material.dispose();outgoing.splice(i,1);}}
 renderer.render(scene,camera);}
 function tick(time){frame=0;if(disposed||!enabled||!visible||document.hidden)return;const dt=lastTime?time-lastTime:16.667;lastTime=time;render(dt);const unsettled=outgoing.length>0||Math.abs(state.target-state.position)>.00001||Math.abs(state.velocity)>.001||Math.abs(state.targetX-state.cameraX)>.02||Math.abs(state.targetY-state.cameraY)>.02||cards.some(c=>{const d=c.userData;if(d.index>=imageCount)return false;const distance=CONFIG.cameraZ-(d.initialZ+state.position*CONFIG.depth*CONFIG.speed*d.speed);const target=distance>=405&&distance<=1890?1:0;return d.recycleReadyAt!=null||Math.abs(d.opacity-target)>.0001;});if(!reduced.matches&&(state.inside||unsettled||ready&&entranceElapsed<CONFIG.entranceMs))frame=requestAnimationFrame(tick);}
 function start(){if(!frame&&!disposed&&visible&&enabled){lastTime=0;frame=requestAnimationFrame(tick);}}
 function exportLayout(){
  const frame=host.parentElement.getBoundingClientRect(),round=value=>Math.round(value*1e6)/1e6;
  const visible=cards.filter(c=>c.userData.index<imageCount&&c.visible&&c.material.opacity>.15).map(c=>{const d=c.userData,z=c.position.z;return {index:d.index,rect:projectedRect(d,z),z};}).filter(c=>c.rect.right>frame.left&&c.rect.left<frame.right&&c.rect.bottom>frame.top&&c.rect.top<frame.bottom).sort((a,b)=>a.z-b.z);
  return {viewport:{width:Math.round(frame.width),height:Math.round(frame.height)},containers:visible.map((c,layer)=>({id:`container-${c.index+1}`,x:round((c.rect.left-frame.left)/frame.width),y:round((c.rect.top-frame.top)/frame.height),width:round(c.rect.w/frame.width),height:round(c.rect.h/frame.height),aspectRatio:round(c.rect.w/c.rect.h),layer,depth:round(c.z)}))};
 }
 function capture(){return {imageCount,viewport:{width,height},state:{...state,inside:false,velocity:0,cameraX:0,cameraY:0,targetX:0,targetY:0},cards:cards.map(c=>{const {textureMap,...data}=c.userData;return data;}),nextImage};}
 // Saved layouts already include their tuned edge spacing. The hero's overflow
 // clips the oversized canvas; an additional inset created a visible teal mask.
 function clipPadding(value){padding=value;host.style.clipPath='none';}
 window.heroField={capture,densityStats(){return densityStats.slice();},cornerRadii(){return cards.filter(c=>c.userData.index<imageCount).map(c=>c.userData.radius).sort((a,b)=>a-b);},handoffStatus(){return {remaining:cards.filter(c=>c.userData.index<imageCount&&c.userData.linger&&c.visible&&c.material.opacity>.2).length,delay:newLayoutDelay,active:cards.some(c=>c.userData.recycleReadyAt!=null),frozenCopies:0};},setRecycleLayout(rects,arrangement,settings={}){layoutRects=rects;placementArrangement=arrangement;gap=0;clipPadding(settings.padding??41);imageCount=settings.imageCount??imageCount;remainingImages=settings.imagesRemaining??remainingImages;newLayoutDelay=settings.newLayoutDelayMs??newLayoutDelay;staggerSpeeds();updateRadii();},configure(options){clearPending();const count=Math.max(4,Math.min(CONFIG.count,Math.round(options.imageCount??(options.layoutRects?12:40)))),countChanged=count!==imageCount;imageCount=count;remainingImages=Math.max(0,Math.min(8,Math.round(options.remainingImages??3)));newLayoutDelay=options.newLayoutDelay??0;enabled=options.enabled;gap=options.gap;clipPadding(options.padding);placementArrangement=options.seed;
 const nextKey=JSON.stringify(options.layoutRects||null),layoutChanged=nextKey!==layoutKey;layoutKey=nextKey;layoutRects=options.layoutRects||null;
 if(options.snapshot&&options.snapshot.imageCount===imageCount&&options.snapshot.cards.length===cards.length&&options.snapshot.viewport?.width===width&&options.snapshot.viewport?.height===height){lastSeed=options.seed;Object.assign(state,options.snapshot.state);nextImage=options.snapshot.nextImage;cards.forEach((c,i)=>{Object.assign(c.userData,options.snapshot.cards[i],{recycleReadyAt:null,incomingHandoff:null});assignImage(c,c.userData.imageIndex);});}
 else if(options.forceReset||lastSeed!==options.seed||layoutChanged||countChanged){lastSeed=options.seed;let seed=options.seed|0;random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};state.target=state.position=state.velocity=0;nextImage=0;cards.forEach(c=>{c.userData.placementClaimed=false;c.material.opacity=0;});cards.forEach(c=>{Object.assign(c.userData,randomPosition(),{opacity:0,imageIndex:nextImage++%editorialImages.length});if(layoutRects)c.userData.initialZ=layoutRects[c.userData.index%layoutRects.length].depth??200+random()*500;placeInLayout(c.userData,c.userData.index,c.userData.initialZ);if(layoutRects&&imageCount!==12&&c.userData.index<imageCount&&(!layoutRects[0].saved||c.userData.index>=layoutRects.length))placeInOpenSpace(c.userData,c.userData.initialZ);c.userData.placementClaimed=c.userData.index<imageCount;assignImage(c,c.userData.imageIndex);});cards.forEach(c=>c.userData.placementClaimed=false);updateRadii();entranceElapsed=0;}
 cards.forEach(c=>{c.userData.naturalSpeed??=c.userData.speed;});staggerSpeeds();updateRadii();
 if(!enabled){cancelAnimationFrame(frame);frame=0;clearTimeout(scrollTimer);leave();}else{render(0);start();}
 }};
 window.heroField.exportLayout=exportLayout;
 window.heroField.beginHandoff=destination=>{
  const hero=host.parentElement.getBoundingClientRect();
  const maxOriginX=Math.min(hero.left+hero.width/3,destination.left+destination.width/2-24);
  const minOriginY=hero.top+hero.height*.38;
  const idealX=hero.left+hero.width*.12,idealY=hero.top+hero.height*.64;
  const candidates=cards
   .filter(card=>card.userData.index<imageCount&&card.visible&&card.material.opacity>.25)
   .map(c=>({c,r:projectedRect(c.userData,c.position.z)}))
   .filter(({r})=>r.cx<maxOriginX&&r.cy>=minOriginY&&r.w>40&&r.w<hero.width*.4&&
    Math.min(r.right,hero.right)-Math.max(r.left,hero.left)>=24&&
    Math.min(r.bottom,hero.bottom,innerHeight)-Math.max(r.top,hero.top,0)>=24);
  const score=({r})=>Math.hypot(r.cx-idealX,r.cy-idealY);
  const selected=candidates.sort((a,b)=>score(a)-score(b))[0];
  if(!selected)return null;
  const {c,r}=selected;
  handoffReturn={snapshot:capture(),selected:c.userData.index,cameraX:state.cameraX,cameraY:state.cameraY,restored:false};
  c.userData.handoff=true;c.material.opacity=0;renderer.render(scene,camera);
  return {left:r.left,top:r.top-hero.top,width:r.w,height:r.h,radius:c.userData.radius,src:editorialImages[c.userData.imageIndex].src,alt:editorialImages[c.userData.imageIndex].alt};
 };
 window.heroField.restoreHandoff=()=>{
  if(!handoffReturn||handoffReturn.restored)return;
  const {snapshot,selected,cameraX,cameraY}=handoffReturn;
  handoffReturn.restored=true;
  if(snapshot.viewport.width!==width||snapshot.viewport.height!==height||snapshot.imageCount!==imageCount)return;
  clearTimeout(scrollTimer);clearOutgoing();nextImage=snapshot.nextImage;
  Object.assign(state,snapshot.state,{target:snapshot.state.position,cameraX,cameraY,targetX:cameraX,targetY:cameraY,lastInput:0});
  cards.forEach((card,index)=>{
   const saved=snapshot.cards[index];
   const cropChanged=card.userData.imageIndex!==saved.imageIndex||card.userData.slot[2]!==saved.slot[2]||card.userData.slot[3]!==saved.slot[3];
   Object.assign(card.userData,saved,{handoff:index===selected,recycleReadyAt:null});
   if(cropChanged)assignImage(card,card.userData.imageIndex);
  });
  render(0);start();
 };
 window.heroField.endHandoff=()=>{
  if(!handoffReturn)return;
  window.heroField.restoreHandoff();handoffReturn=null;ignoreReverseUntil=performance.now()+RETURN_GESTURE_IDLE_MS;
  cards.forEach(c=>c.userData.handoff=false);render(0);start();
 };
 const configureField=window.heroField.configure;
 window.heroField.configure=options=>{clearOutgoing();configureField(options);};
 const selectIncomingTemplate=window.heroField.setRecycleLayout;
 window.heroField.layoutCounts=()=>({incoming:imageCount,outgoing:outgoing.filter(c=>c.material.opacity>.01).length,independent:INDEPENDENT_INCOMING_LAYOUTS});
 window.heroField.setRecycleLayout=(rects,arrangement,settings={})=>{
  retainOutgoing();outgoing.forEach(c=>{if(c.material.opacity===0)c.material.opacity=c.userData.retiredOpacity;});selectIncomingTemplate(rects,arrangement,settings);
  if(INDEPENDENT_INCOMING_LAYOUTS){cards.filter(c=>c.userData.index<imageCount).forEach(c=>{const d=c.userData,preset=rects[d.index%rects.length],z=preset.depth;d.initialZ=z-state.position*CONFIG.depth*CONFIG.speed*d.speed;d.opacity=0;d.recycleReadyAt=null;c.material.opacity=0;placeInLayout(d,d.index,z);assignImage(c,nextImage++%editorialImages.length);});updateRadii();start();}
 };
 const resize=new ResizeObserver(measure);resize.observe(host);const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}});observer.observe(host);
 function motionChange(){state.target=state.position=state.velocity=state.cameraX=state.cameraY=state.targetX=state.targetY=0;resetPositions();leave();render(0);}
 host.addEventListener('wheel',wheel,{passive:true});host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);host.addEventListener('touchstart',touchStart,{passive:true});host.addEventListener('touchmove',touchMove,{passive:true});window.addEventListener('keydown',key);window.addEventListener('scroll',pageScroll,{passive:true});reduced.addEventListener('change',motionChange);
 const visibility=()=>{if(document.hidden){leave();cancelAnimationFrame(frame);frame=0;}else start();};document.addEventListener('visibilitychange',visibility);
 function dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();host.removeEventListener('wheel',wheel);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('touchstart',touchStart);host.removeEventListener('touchmove',touchMove);window.removeEventListener('keydown',key);reduced.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);cards.forEach(c=>{c.userData.textureMap?.dispose();c.material.dispose();});loadedTextures.forEach(texture=>texture?.dispose());placeholderTexture.dispose();geometry.dispose();renderer.dispose();}
 const lost=e=>{e.preventDefault();dispose();fallback();};renderer.domElement.addEventListener('webglcontextlost',lost,{once:true});window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});measure();start();
 window.addEventListener('pagehide',e=>{if(!e.persisted){clearTimeout(scrollTimer);clearPending();window.removeEventListener('scroll',pageScroll);}});
}
