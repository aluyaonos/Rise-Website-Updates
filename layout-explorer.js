import {createDialKit,createDialRoot} from './vendor/dialkit/index.js';
import {preferredLayouts,preferredRectangles} from './preferred-layouts.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=document.querySelector('.hero');
const orange=document.querySelector('.field');
const missionMotion=window.missionMotion??={titleDelay:180,flagPadding:8,flagSpringStiffness:300,flagSpringDamping:20};
const status=document.createElement('div');status.className='explorer-status';status.setAttribute('aria-live','polite');hero.append(status);
const root=createDialRoot({position:'bottom-right',theme:'dark',versions:'menu',defaultOpen:false});
const snapshots=new Map();try{for(const [n,snapshot] of JSON.parse(sessionStorage.getItem('rise-shared-arrangements')||'[]'))snapshots.set(n,snapshot);}catch{}
let quiet=false,freshEntry=true;
let arrangementBag=[],previousLayout='',lastPreferredId='';try{previousLayout=sessionStorage.getItem('rise-last-preferred-layout')||'';}catch{}
function nextPreferredLayout(){if(!arrangementBag.length){arrangementBag=preferredLayouts.slice();for(let i=arrangementBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arrangementBag[i],arrangementBag[j]]=[arrangementBag[j],arrangementBag[i]];}const end=arrangementBag.length-1;if(arrangementBag[end].id===previousLayout)[arrangementBag[0],arrangementBag[end]]=[arrangementBag[end],arrangementBag[0]];}const layout=arrangementBag.pop();previousLayout=layout.id;try{sessionStorage.setItem('rise-last-preferred-layout',layout.id);}catch{}return layout;}
function selectPreferred(layout){const wasQuiet=quiet;quiet=true;lastPreferredId=layout.id;kit.setValues({Telescope:{'Saved layout':layout.id,'Image count':12,Gap:0,Padding:layout.padding,Arrangement:layout.arrangement,'Images remaining':2,'New layout delay (ms)':0}});quiet=wasQuiet;}
const kit=createDialKit('Image layout explorer',{
 Variant:{type:'select',options:['International Orange','Telescope'],default:'Telescope'},
 Orange:{_collapsed:true,'Image count':[40,4,60,1],Gap:[0,0,100,1],Padding:[0,0,160,1],Arrangement:[1,1,100,1],'Images remaining':[3,0,8,1],'New layout delay (ms)':[0,0,2000,50],Previous:{type:'action'},Next:{type:'action'},Shuffle:{type:'action'},'Record scroll layouts':true},
 Telescope:{'Saved layout':{type:'select',options:[{value:'original',label:'Original Telescope'},...preferredLayouts.map(l=>({value:l.id,label:l.name}))],default:'original'},'Image count':[12,4,60,1],Gap:[0,0,120,1],Padding:[0,0,160,1],Arrangement:[1,1,100,1],'Images remaining':[2,0,8,1],'New layout delay (ms)':[0,0,2000,50],Previous:{type:'action'},Next:{type:'action'},Shuffle:{type:'action'},'Record scroll layouts':true},
 Mission:{'Title delay (ms)':[180,0,2000,10],'Flag padding (px)':[8,0,24,1],'Flag spring stiffness':[300,40,360,10],'Flag spring damping':[20,4,40,1]},
},{id:'rise-layout-explorer',persist:true,onAction(path){const [folder,action]=path.split('.');if(folder==='Telescope'){const index=preferredLayouts.findIndex(l=>l.id===kit.getValues().Telescope['Saved layout']);const layout=action==='Shuffle'?nextPreferredLayout():preferredLayouts[(index+(action==='Previous'?-1:1)+preferredLayouts.length)%preferredLayouts.length];selectPreferred(layout);apply(kit.getValues());return;}const n=kit.getValues()[folder].Arrangement;kit.setValue(`${folder}.Arrangement`,action==='Previous'?Math.max(1,n-1):action==='Next'?Math.min(100,n+1):1+Math.floor(Math.random()*100));}});
// One-time migration from the former timed/frozen handoff. Later edits persist.
try{if(!localStorage.getItem('rise-continuous-handoff-v1')){kit.setValues({Orange:{'New layout delay (ms)':0},Telescope:{'New layout delay (ms)':0}});localStorage.setItem('rise-continuous-handoff-v1','1');}}catch{}
try{if(!localStorage.getItem('rise-mission-motion-v2')){kit.setValues({Mission:{'Title delay (ms)':180,'Flag padding (px)':8,'Flag spring stiffness':150,'Flag spring damping':18}});localStorage.setItem('rise-mission-motion-v2','1');}}catch{}
try{if(!localStorage.getItem('rise-flag-spring-v3')){kit.setValue('Mission.Flag spring stiffness',230);localStorage.setItem('rise-flag-spring-v3','1');}}catch{}
try{if(!localStorage.getItem('rise-flag-spring-v4')){kit.setValues({Mission:{'Flag padding (px)':8,'Flag spring stiffness':300,'Flag spring damping':18}});localStorage.setItem('rise-flag-spring-v4','1');}}catch{}
try{if(!localStorage.getItem('rise-flag-spring-v5')){kit.setValue('Mission.Flag spring damping',20);localStorage.setItem('rise-flag-spring-v5','1');}}catch{}

function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
// Telescope's desktop CSS slots: x/y are top-left, width is viewport width.
// Scene 1 reproduces the reference composition. Other scenes intentionally
// vary its spatial rhythm for this requested exploration (not source behavior).
const anchors=[[-5,21,11.5,1],[29,15,9.2,1.4],[36,3,11.5,1.1],[62.4,11,7.6,.9],[89.9,5,6.1,1.4],[79.8,28,13.2,.9],[96.8,61,4.7,1.1],[70,77,15,1.4],[53.7,89,8.3,1.4],[16,71,10.5,1.1],[29,68,5.9,1.15],[7.5,47,5.2,1.2]];
function telescopeLayout(values){const {Arrangement:scene,Gap:gap,Padding:padding}=values;const random=rng(scene*743);const W=hero.clientWidth,H=hero.clientHeight;const mobile=W<700;
 const preferred=preferredLayouts.find(l=>l.id===values['Saved layout']);if(preferred)return preferredRectangles(preferred,W,H);
 const rects=anchors.map(([x,y,w,ar],i)=>{const jitter=scene===1?0:1;const width=Math.max(42,W*w/100*(mobile?1.35:1)*(1+jitter*(random()-.5)*.45));const height=width/ar;let cx=(x+w/2)/100*W+(random()-.5)*W*.13*jitter,cy=y/100*H+height/2+(random()-.5)*H*.12*jitter;return {cx,cy,w:width,h:height,ar,i};});
 if(scene===1&&gap===0&&padding===0)return rects;
 // Resolve local overlaps with the requested image-to-image gap. An empty
 // center keeps the headline readable; padding controls edge cropping.
 for(let pass=0;pass<18;pass++)for(let i=0;i<rects.length;i++){const a=rects[i];for(let j=i+1;j<rects.length;j++){const b=rects[j],dx=b.cx-a.cx,dy=b.cy-a.cy,ox=(a.w+b.w)/2+gap-Math.abs(dx),oy=(a.h+b.h)/2+gap-Math.abs(dy);if(ox>0&&oy>0){if(ox<oy){const shift=ox*.51*(dx<0?-1:1);a.cx-=shift;b.cx+=shift;}else{const shift=oy*.51*(dy<0?-1:1);a.cy-=shift;b.cy+=shift;}}}
 const left=W*.22,right=W*.78,top=H*.31,bottom=H*.64;
 if(a.cx+a.w/2>left&&a.cx-a.w/2<right&&a.cy+a.h/2>top&&a.cy-a.h/2<bottom){const edges=[{v:Math.abs(a.cx-(left-a.w/2-gap)),x:left-a.w/2-gap},{v:Math.abs(a.cx-(right+a.w/2+gap)),x:right+a.w/2+gap},{v:Math.abs(a.cy-(top-a.h/2-gap)),y:top-a.h/2-gap},{v:Math.abs(a.cy-(bottom+a.h/2+gap)),y:bottom+a.h/2+gap}].sort((a,b)=>a.v-b.v);if('x'in edges[0])a.cx=edges[0].x;else a.cy=edges[0].y;}
 const edge=padding>0?padding:-Math.min(a.w,a.h)*.45;a.cx=Math.max(edge+a.w/2,Math.min(W-edge-a.w/2,a.cx));a.cy=Math.max(edge+a.h/2,Math.min(H-edge-a.h/2,a.cy));}
 return rects;
}
function snapshotKey(folder,values){return `${folder}:${values.Arrangement}:${values.Gap}:${values.Padding}:${values['Image count']}`;}
function apply(v){const nextMotion={titleDelay:v.Mission['Title delay (ms)'],flagPadding:v.Mission['Flag padding (px)'],flagSpringStiffness:v.Mission['Flag spring stiffness'],flagSpringDamping:v.Mission['Flag spring damping']};const motionChanged=Object.entries(nextMotion).some(([key,value])=>missionMotion[key]!==value);Object.assign(missionMotion,nextMotion);if(motionChanged)window.dispatchEvent(new CustomEvent('mission-motion-change',{detail:{...missionMotion}}));if(quiet)return;const isTelescope=v.Variant==='Telescope';orange.hidden=false;hero.dataset.variant=isTelescope?'telescope':'orange';
 const preferred=preferredLayouts.find(l=>l.id===v.Telescope['Saved layout']);if(isTelescope&&preferred&&lastPreferredId!==preferred.id){selectPreferred(preferred);v=kit.getValues();}else if(isTelescope&&!preferred)lastPreferredId='';
 const active=isTelescope?'Telescope':'Orange',values=v[active];
 window.heroField?.configure({enabled:true,forceReset:freshEntry,imageCount:values['Image count'],gap:isTelescope?0:values.Gap,padding:values.Padding,seed:values.Arrangement,remainingImages:values['Images remaining'],newLayoutDelay:values['New layout delay (ms)'],layoutRects:isTelescope?telescopeLayout(values):null,snapshot:freshEntry||isTelescope?null:snapshots.get(snapshotKey(active,values))});freshEntry=false;
 const folder=isTelescope?'Telescope':'Orange';status.textContent=`${v.Variant} · arrangement ${v[folder].Arrangement}`;
}
function enterTelescope(reload=false){quiet=true;kit.setValues({Variant:'Telescope',Telescope:{'Saved layout':'original','Image count':12,Gap:0,Padding:0,Arrangement:1,'Images remaining':2,'New layout delay (ms)':0}});lastPreferredId='';if(reload)selectPreferred(nextPreferredLayout());quiet=false;}
enterTelescope(performance.getEntriesByType('navigation')[0]?.type==='reload');
kit.subscribe(apply);
window.addEventListener('pageshow',e=>{if(e.persisted){freshEntry=true;enterTelescope(false);apply(kit.getValues());}});
window.addEventListener('hero-depth-input',()=>{if(kit.getValues().Variant!=='Telescope')return;const layout=nextPreferredLayout();selectPreferred(layout);window.heroField?.setRecycleLayout(preferredRectangles(layout,hero.clientWidth,hero.clientHeight),layout.arrangement,layout);status.textContent=`Telescope · saved ${layout.name}`;});
window.addEventListener('orange-arrangement',e=>{const v=kit.getValues(),folder=v.Variant==='Telescope'?'Telescope':'Orange';if(!v[folder]['Record scroll layouts'])return;const n=folder==='Telescope'?v.Telescope.Arrangement:v[folder].Arrangement%100+1;snapshots.set(snapshotKey(folder,{...v[folder],Arrangement:n}),e.detail);try{sessionStorage.setItem('rise-shared-arrangements',JSON.stringify([...snapshots]));}catch{}quiet=true;kit.setValue(`${folder}.Arrangement`,n);quiet=false;status.textContent=`${v.Variant} · arrangement ${n} · scroll snapshot`;});
window.addEventListener('resize',()=>apply(kit.getValues()));
window.heroExplorer={kit,root,snapshots,preferredLayouts};
function currentLayoutExport(){
 const v=kit.getValues(),folder=v.Variant==='Telescope'?'Telescope':'Orange',s=v[folder],layout=window.heroField?.exportLayout();
 if(!layout)throw new Error('The image field is not ready to export.');
 return {schema:'rise-image-layout',schemaVersion:1,name:`${v.Variant} — arrangement ${s.Arrangement}`,capturedAt:new Date().toISOString(),coordinateSystem:'hero-relative-0-to-1',...layout,containerCount:layout.containers.length,settings:{variant:v.Variant,arrangement:s.Arrangement,imageCount:s['Image count'],gap:s.Gap,padding:s.Padding,imagesRemaining:s['Images remaining'],newLayoutDelayMs:s['New layout delay (ms)']}};
}
window.heroExplorer.exportLayout=currentLayoutExport;
const copyLayout=e=>{if(e.detail.panelName==='Image layout explorer')e.detail.text=JSON.stringify(currentLayoutExport(),null,2);};
window.addEventListener('dialkit:copy',copyLayout);
queueMicrotask(()=>{const button=document.querySelector('.dialkit-toolbar-primary[aria-label="Copy parameters"]');if(button){button.setAttribute('aria-label','Copy current layout');button.title='Copy current image positions and layout settings as JSON';}});
window.addEventListener('pagehide',e=>{if(!e.persisted)window.removeEventListener('dialkit:copy',copyLayout);});
window.addEventListener('pagehide',e=>{if(!e.persisted){kit.destroy();root.destroy();}});
