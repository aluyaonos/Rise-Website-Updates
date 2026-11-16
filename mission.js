// Re-enable only this switch to restore the measured hero-image handoff.
const MISSION_IMAGE_FROM_HERO=true;
const runway=document.querySelector('.hero-runway');
const hero=document.querySelector('.hero');
const destination=document.querySelector('.mission-image');
const overlay=document.querySelector('.handoff-image');
const image=overlay.querySelector('img');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
import {editorialImages} from './media.js';
let source=null,frame=0,previousScroll=window.scrollY;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const handoffEase=t=>t*t*(3-2*t);
function landingRect(){
 const target=destination.getBoundingClientRect();
 const column=destination.parentElement,columnStyle=getComputedStyle(column);
 if(columnStyle.position!=='sticky')return target;
 const heading=column.querySelector('h2').getBoundingClientRect();
 const gap=parseFloat(columnStyle.rowGap||columnStyle.gap)||0;
 const paddingBottom=parseFloat(columnStyle.paddingBottom)||0;
 return {
  left:target.left,
  top:innerHeight-paddingBottom-heading.height-gap-target.height,
  width:target.width,
  height:target.height
 };
}
function prepare(){
 if(source)return true;
 source=window.heroField?.beginHandoff(destination.getBoundingClientRect());
 if(!source)return false;
 image.src=source.src;image.alt=source.alt;
 const still=new Image();still.src=source.src;still.alt=source.alt;destination.replaceChildren(still);
 return true;
}
function render(){
 frame=0;const y=window.scrollY,returning=y<previousScroll;
 previousScroll=y;
 hero.style.setProperty('--hero-visibility',String(reduced.matches?1:1-ease(clamp(y/(innerHeight*.75)))));
 // The dedicated image travels with the mission section as it rises into view.
 if(!MISSION_IMAGE_FROM_HERO)return;
 if(reduced.matches){if(!prepare()){const still=new Image();still.src=editorialImages[0].src;still.alt=editorialImages[0].alt;destination.replaceChildren(still);}destination.style.visibility='visible';overlay.style.visibility='hidden';hero.style.setProperty('--hero-visibility','1');return;}
 if(y<=0){overlay.style.visibility='hidden';destination.style.visibility='hidden';hero.style.setProperty('--hero-visibility','1');window.heroField?.endHandoff();source=null;return;}
 const end=runway.offsetHeight;
 if(!prepare()){
  // Direct entry can land after the canvas has faded out or paused offscreen.
  if(y>=end){destination.style.visibility='visible';overlay.style.visibility='hidden';return;}
  frame=requestAnimationFrame(render);return;
 }
 const progress=clamp(y/end),t=handoffEase(progress),target=landingRect();
 if(progress>=1){overlay.style.visibility='hidden';destination.style.visibility='visible';return;}
 if(returning)window.heroField?.restoreHandoff();
 destination.style.visibility='hidden';overlay.style.visibility='visible';
 const mix=(a,b)=>a+(b-a)*t;
 overlay.style.transform=`translate3d(${mix(source.left,target.left)}px,${mix(source.top,target.top)}px,0)`;
 overlay.style.width=`${mix(source.width,target.width)}px`;overlay.style.height=`${mix(source.height,target.height)}px`;overlay.style.borderRadius=`${mix(source.radius,16)}px`;
}
function update(){if(!frame)frame=requestAnimationFrame(render);}
window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update,{passive:true});reduced.addEventListener('change',update);
if(MISSION_IMAGE_FROM_HERO)window.addEventListener('wheel',e=>{if(e.deltaY>0&&window.scrollY===0&&!reduced.matches)prepare();},{passive:true,capture:true});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);reduced.removeEventListener('change',update);});
if(MISSION_IMAGE_FROM_HERO)destination.style.visibility='hidden';
update();
