/* Bladder Brawl — all art is drawn in code (no image assets). Style: glossy vinyl-toy cartoon,
   soft gradients, warm rim light, chunky dark outline. */
'use strict';
const TAU=Math.PI*2, OL='#2a1a2e';
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function ell(c,x,y,rx,ry,rot){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rot||0,0,TAU);}
function circ(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.01,r),0,TAU);}
function rad(c,x,y,r,a,b,d){const g=c.createRadialGradient(x-r*.35,y-r*.45,r*.05,x,y,r*1.05);g.addColorStop(0,a);g.addColorStop(.55,b);g.addColorStop(1,d);return g;}
function lin(c,x0,y0,x1,y1,st){const g=c.createLinearGradient(x0,y0,x1,y1);st.forEach((s,i)=>g.addColorStop(s[0],s[1]));return g;}
function fillS(c,f,lw,s){c.fillStyle=f;c.fill();if(lw){c.lineWidth=lw;c.strokeStyle=s||OL;c.lineJoin='round';c.stroke();}}
function gloss(c,x,y,rx,ry,a){c.save();c.globalAlpha=a==null?.55:a;ell(c,x,y,rx,ry,-.5);c.fillStyle='#fff';c.fill();c.restore();}
/* big cartoon eyes: look = direction vector, mood: 0 normal, 1 hit (x x), 2 angry, 3 dizzy */
function eyes(c,x,y,r,gap,look,mood,blink){
  for(const s of[-1,1]){const ex=x+s*gap;
    if(mood===1){c.strokeStyle=OL;c.lineWidth=r*.35;c.lineCap='round';c.beginPath();c.moveTo(ex-r*.6,y-r*.6);c.lineTo(ex+r*.6,y+r*.6);c.moveTo(ex+r*.6,y-r*.6);c.lineTo(ex-r*.6,y+r*.6);c.stroke();continue;}
    circ(c,ex,y,r);fillS(c,'#fff',r*.22);
    if(blink>0.85){c.fillStyle='#f3d9ff';ell(c,ex,y,r,r*.25);c.fill();continue;}
    const px=ex+(look?look[0]:0)*r*.35,py=y+(look?look[1]:0)*r*.35;
    if(mood===3){c.strokeStyle=OL;c.lineWidth=r*.2;c.beginPath();for(let a=0;a<9;a+=.3){const q=r*.08*a;c.lineTo(ex+Math.cos(a)*q,y+Math.sin(a)*q);}c.stroke();continue;}
    circ(c,px,py,r*.55);c.fillStyle=OL;c.fill();circ(c,px-r*.18,py-r*.2,r*.2);c.fillStyle='#fff';c.fill();
    if(mood===2){c.fillStyle=OL;c.beginPath();c.moveTo(ex-r*1.1,y-r*(s>0?.4:1.2));c.lineTo(ex+r*1.1,y-r*(s>0?1.2:.4));c.lineTo(ex+r*1.1,y-r*1.5);c.lineTo(ex-r*1.1,y-r*1.5);c.fill();}
  }
}
function blush(c,x,y,r,gap){c.save();c.globalAlpha=.45;c.fillStyle='#ff7aa8';for(const s of[-1,1]){ell(c,x+s*gap,y,r,r*.6);c.fill();}c.restore();}
function wing(c,x,y,rx,ry,rot){c.save();ell(c,x,y,rx,ry,rot);c.fillStyle='rgba(225,245,255,.55)';c.fill();c.lineWidth=2;c.strokeStyle='rgba(42,26,46,.55)';c.stroke();ell(c,x-rx*.2,y-ry*.2,rx*.4,ry*.25,rot);c.fillStyle='rgba(255,255,255,.7)';c.fill();c.restore();}
function legs(c,n,x,y,dx,len,t,col,lw){c.strokeStyle=col||OL;c.lineWidth=lw||3;c.lineCap='round';for(let i=0;i<n;i++){const yy=y+(i-(n-1)/2)*dx,w=Math.sin(t*14+i*2)*.35;for(const s of[-1,1]){c.beginPath();c.moveTo(x,yy);const kx=x+s*len*.6,ky=yy-len*.35+w*len*.4*s;c.quadraticCurveTo(kx,ky,x+s*len,yy+len*.25-w*len*.3*s);c.stroke();}}}
/* ---------------- BUGS (all drawn centred at 0,0, facing up = climbing) ---------------- */
const BUGART={
 mosq(c,b,t){const fl=Math.sin(t*60);wing(c,-14,-4,15,6,-.5+fl*.3);wing(c,14,-4,15,6,.5-fl*.3);
  legs(c,3,0,6,5,17,t,OL,2);ell(c,0,10,6,11);fillS(c,rad(c,0,10,11,'#ffd1f2','#d36bd8','#7d2f92'),2.5);
  circ(c,0,-4,11);fillS(c,rad(c,0,-4,11,'#ffe6fb','#e07ce6','#8a3aa0'),2.5);
  c.strokeStyle=OL;c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(0,-12);c.lineTo(0,-24);c.stroke();
  eyes(c,0,-6,4.6,5,b.look,b.mood,b.blink);gloss(c,-4,-11,3.5,2);},
 fly(c,b,t){const fl=Math.sin(t*70);wing(c,-13,0,14,8,-.8+fl*.25);wing(c,13,0,14,8,.8-fl*.25);
  legs(c,3,0,6,6,18,t,OL,2.5);circ(c,0,4,16);fillS(c,rad(c,0,4,16,'#9ff4d8','#1e9f86','#0b4c47'),3);
  c.save();circ(c,0,4,16);c.clip();c.fillStyle='rgba(10,50,45,.35)';for(let i=0;i<3;i++){c.fillRect(-20,6+i*6,40,2.4);}c.restore();
  eyes(c,0,-6,7,7,b.look,b.mood,b.blink);gloss(c,-6,-4,5,3);},
 ant(c,b,t){legs(c,3,0,2,7,15,t,OL,2.5);
  for(const [y,r] of [[13,9],[2,7],[-9,9]]){circ(c,0,y,r);fillS(c,rad(c,0,y,r,'#ffd0a8','#f0603a','#9a2412'),2.5);}
  c.strokeStyle=OL;c.lineWidth=2;c.beginPath();c.moveTo(-3,-16);c.quadraticCurveTo(-9,-24,-12,-22);c.moveTo(3,-16);c.quadraticCurveTo(9,-24,12,-22);c.stroke();
  eyes(c,0,-10,3.8,4,b.look,b.mood,b.blink);gloss(c,-3,10,3,2);},
 roach(c,b,t){legs(c,3,0,4,9,20,t,'#5a2a12',3);ell(c,0,4,14,19);fillS(c,lin(c,0,-15,0,23,[[0,'#ffb46b'],[.5,'#b5501c'],[1,'#5a2108']]),3);
  c.strokeStyle='rgba(42,26,46,.7)';c.lineWidth=2;c.beginPath();c.moveTo(0,-8);c.lineTo(0,22);c.stroke();
  c.strokeStyle=OL;c.lineWidth=2;c.beginPath();c.moveTo(-4,-15);c.quadraticCurveTo(-14,-34,-22,-30);c.moveTo(4,-15);c.quadraticCurveTo(14,-34,22,-30);c.stroke();
  circ(c,0,-12,9);fillS(c,rad(c,0,-12,9,'#ffc88d','#c25c22','#6a2a0c'),3);eyes(c,0,-13,4.2,4.5,b.look,b.mood,b.blink);gloss(c,-6,-2,4,8,.35);},
 snail(c,b,t){const hid=b.hide>0;const sq=1+Math.sin(t*4)*.04;
  if(!hid){ell(c,0,10,12,20*sq);fillS(c,rad(c,0,10,18,'#d8ffb8','#7fd36a','#3c8a3a'),3);
   c.strokeStyle=OL;c.lineWidth=2.5;c.beginPath();c.moveTo(-5,-6);c.lineTo(-8,-20);c.moveTo(5,-6);c.lineTo(8,-20);c.stroke();
   eyes(c,0,-21,4.4,8,b.look,b.mood,b.blink);}
  const R=hid?19:17;circ(c,0,hid?6:10,R);fillS(c,rad(c,0,8,R,'#ffd7ec','#ff7fb5','#a83470'),3);
  c.strokeStyle='rgba(120,20,70,.65)';c.lineWidth=3;c.beginPath();for(let a=0;a<12;a+=.25){const q=R*.85*(1-a/13);c.lineTo(Math.cos(a)*q,(hid?6:10)+Math.sin(a)*q);}c.stroke();gloss(c,-7,hid?-3:1,5,3);},
 gecko(c,b,t){const w=Math.sin(t*12)*.5;c.strokeStyle=OL;c.lineWidth=3;c.lineCap='round';
  if(!b.noTail){c.beginPath();c.moveTo(0,14);c.quadraticCurveTo(12*w,30,-6*w,44);c.lineWidth=9;c.stroke();c.strokeStyle='#8be05c';c.lineWidth=5;c.stroke();}
  for(const [y,s] of [[-4,1],[10,-1]])for(const d of[-1,1]){c.strokeStyle=OL;c.lineWidth=5;c.beginPath();c.moveTo(0,y);c.lineTo(d*16,y+(d*s*w*8)-6);c.stroke();circ(c,d*16,y+(d*s*w*8)-6,3.5);c.fillStyle='#8be05c';c.fill();}
  ell(c,0,4,10,16);fillS(c,rad(c,0,4,16,'#eaffb0','#79d24a','#2f7d2a'),3);ell(c,0,-13,11,9);fillS(c,rad(c,0,-13,11,'#f0ffc0','#86dc56','#2f7d2a'),3);
  c.fillStyle='rgba(255,230,90,.85)';for(const[y,x] of [[0,-3],[7,3],[-1,4]]){circ(c,x,y,2);c.fill();}
  eyes(c,0,-15,4.6,6,b.look,b.mood,b.blink);gloss(c,-5,-17,4,2);},
 baby(c,b,t){legs(c,4,0,2,4,16,t,OL,2.5);circ(c,0,2,11);fillS(c,rad(c,0,2,11,'#d9c6ff','#6a4bd6','#2a1673'),2.5);eyes(c,0,0,3.8,4,b.look,b.mood,b.blink);gloss(c,-4,-4,3,2);},
 /* bosses */
 bfly(c,b,t){c.save();c.scale(2.6,2.6);BUGART.fly(c,b,t);c.restore();crown(c,0,-40,1.3);},
 bsnail(c,b,t){c.save();c.scale(2.4,2.4);BUGART.snail(c,b,t);c.restore();helmet(c,0,b.hide>0?-28:-56);},
 bspider(c,b,t){const R=44;legs(c,4,0,8,14,70,t*.6,OL,7);legs(c,4,0,8,14,70,t*.6,'#5b3fc4',3.5);
  circ(c,0,22,R*.9);fillS(c,rad(c,0,22,R,'#c7b5ff','#5a3fd0','#1f1060'),4);
  c.fillStyle='#ff5f8a';c.beginPath();c.moveTo(0,8);c.lineTo(10,22);c.lineTo(0,36);c.lineTo(-10,22);c.fill();
  circ(c,0,-20,R*.62);fillS(c,rad(c,0,-20,R*.62,'#d9ccff','#6d50e0','#24106a'),4);
  eyes(c,0,-24,8,11,b.look,b.mood||2,b.blink);for(const s of[-1,1]){circ(c,s*22,-36,4);fillS(c,'#ff5f8a',2);}
  c.fillStyle='#fff';for(const s of[-1,1]){c.beginPath();c.moveTo(s*4,-8);c.lineTo(s*9,-8);c.lineTo(s*6,2);c.fill();}
  crown(c,0,-52,1.5);gloss(c,-14,6,10,6,.4);}
};
function crown(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.beginPath();c.moveTo(-14,6);c.lineTo(-16,-8);c.lineTo(-7,-1);c.lineTo(0,-12);c.lineTo(7,-1);c.lineTo(16,-8);c.lineTo(14,6);c.closePath();
  fillS(c,lin(c,0,-12,0,6,[[0,'#fff6b0'],[.5,'#ffc928'],[1,'#d47a00']]),2.5);circ(c,0,1,2.6);c.fillStyle='#ff4f7a';c.fill();c.restore();}
function helmet(c,x,y){c.save();c.translate(x,y);c.beginPath();c.arc(0,8,22,Math.PI,0);c.closePath();fillS(c,lin(c,0,-14,0,8,[[0,'#e8f0ff'],[1,'#7f8fb0']]),3);
  c.fillStyle='#ff4f6a';rr(c,-3,-26,6,14,3);c.fill();c.strokeStyle=OL;c.lineWidth=2;c.stroke();c.restore();}
/* ---------------- HERO: Gus, an original green giant, seen from behind (waist up) ---------------- */
function drawGusBack(c,x,y,s,t,aimX,fire,bounce){
  c.save();c.translate(x,y);c.scale(s,s);const br=Math.sin(t*2.2)*1.5-(bounce||0)*8;const lean=Math.max(-.12,Math.min(.12,(aimX||0)*.0016));c.rotate(lean);
  // arms (hands on hips, elbows out)
  for(const d of[-1,1]){c.beginPath();c.moveTo(d*70,-118+br);c.quadraticCurveTo(d*128,-80,d*112,-30);c.quadraticCurveTo(d*104,-10,d*84,-14);c.quadraticCurveTo(d*92,-60,d*66,-80);c.closePath();fillS(c,lin(c,d*70,-120,d*120,-20,[[0,'#8fe06a'],[1,'#3f9a3a']]),5);}
  // torso
  c.beginPath();c.moveTo(-96,10);c.bezierCurveTo(-104,-70,-86,-128+br,-40,-140+br);c.lineTo(40,-140+br);c.bezierCurveTo(86,-128+br,104,-70,96,10);c.closePath();
  fillS(c,lin(c,0,-140,0,10,[[0,'#9ae870'],[.6,'#58b544'],[1,'#2f7a32']]),5);
  // tank top
  c.beginPath();c.moveTo(-74,10);c.bezierCurveTo(-78,-50,-66,-96+br,-46,-118+br);c.quadraticCurveTo(-30,-120+br,-24,-108+br);c.quadraticCurveTo(0,-100+br,24,-108+br);c.quadraticCurveTo(30,-120+br,46,-118+br);c.bezierCurveTo(66,-96+br,78,-50,74,10);c.closePath();
  fillS(c,lin(c,0,-120,0,10,[[0,'#ffffff'],[1,'#d9d2e6']]),4);
  c.save();c.clip();c.fillStyle='rgba(255,200,40,.55)';ell(c,30,-40,12,8,.4);c.fill();ell(c,-40,-14,7,5);c.fill();c.restore(); // grub stains (crude humour)
  // head (bald) + bandana
  ell(c,0,-162+br,44,40);fillS(c,rad(c,0,-170+br,46,'#c3ff98','#6cc64e','#2f7a32'),5);
  for(const d of[-1,1]){ell(c,d*44,-160+br,9,13,d*.3);fillS(c,'#64bd48',4);}
  c.beginPath();c.moveTo(-44,-176+br);c.quadraticCurveTo(0,-186+br,44,-176+br);c.lineTo(44,-162+br);c.quadraticCurveTo(0,-172+br,-44,-162+br);c.closePath();fillS(c,lin(c,0,-186,0,-160,[[0,'#ff6b6b'],[1,'#c8203a']]),3.5);
  const fl=Math.sin(t*7)*5;circ(c,0,-170+br,7);fillS(c,'#e3344d',3);
  for(const d of[-1,1]){c.beginPath();c.moveTo(0,-170+br);c.quadraticCurveTo(d*10,-150+br,d*16+fl*d*.4,-132+br+fl*.3);c.lineTo(d*6,-136+br);c.closePath();fillS(c,'#e3344d',3);}
  c.fillStyle='#fff';for(let i=-30;i<=30;i+=15){circ(c,i,-176+br-Math.abs(i)*.08,2.2);c.fill();}
  gloss(c,-16,-188+br,14,6,.35);
  // shoulders highlights
  c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=4;c.beginPath();c.arc(-62,-104+br,20,3.6,4.6);c.stroke();c.beginPath();c.arc(62,-104+br,20,4.8,5.8);c.stroke();
  c.restore();
}
/* ---------------- HERO front view (title mascot) ---------------- */
function drawGusFront(c,x,y,s,t,o){o=o||{};
  // t is loop phase seconds; all motions periodic in 4s
  const P=t/4*TAU, bob=Math.sin(P*2)*6, sq=1+Math.sin(P*2)*.025, flex=(Math.sin(P)+1)/2, blink=(t%4>2.3&&t%4<2.42)?1:0;
  c.save();c.translate(x,y);c.scale(s,s*sq);
  // shadow
  c.save();c.scale(1,.25);circ(c,0,0,110-bob);c.fillStyle='rgba(0,0,0,.25)';c.fill();c.restore();
  c.translate(0,bob*.3);
  // legs / shorts
  for(const d of[-1,1]){rr(c,d*44-24,-90,48,90,20);fillS(c,lin(c,0,-90,0,0,[[0,'#7fd85a'],[1,'#3a8c34']]),5);ell(c,d*46,-4,34,16);fillS(c,lin(c,0,-20,0,10,[[0,'#7a5236'],[1,'#3d2414']]),5);}
  rr(c,-82,-150,164,80,30);fillS(c,lin(c,0,-150,0,-70,[[0,'#5f8bff'],[1,'#2846b8']]),5);
  c.fillStyle='#ffd23c';for(let i=-60;i<=60;i+=30){circ(c,i,-104+((i/30)%2?10:0),5);c.fill();}
  // belly + tank
  c.beginPath();c.moveTo(-100,-140);c.bezierCurveTo(-120,-230,-90,-300+bob*.2,-50,-310);c.lineTo(50,-310);c.bezierCurveTo(90,-300,120,-230,100,-140);c.closePath();fillS(c,lin(c,0,-310,0,-140,[[0,'#98e86e'],[1,'#3f9a3a']]),5);
  c.beginPath();c.moveTo(-84,-146);c.bezierCurveTo(-100,-220,-80,-270,-56,-296);c.quadraticCurveTo(-40,-300,-34,-286);c.quadraticCurveTo(0,-250,34,-286);c.quadraticCurveTo(40,-300,56,-296);c.bezierCurveTo(80,-270,100,-220,84,-146);c.closePath();
  fillS(c,lin(c,0,-300,0,-146,[[0,'#ffffff'],[1,'#dcd3ea']]),4);
  c.fillStyle='rgba(255,196,40,.6)';ell(c,-30,-190,13,9,.3);c.fill();ell(c,36,-226,7,5);c.fill();
  // belly button
  c.strokeStyle='rgba(42,26,46,.5)';c.lineWidth=3;c.beginPath();c.arc(0,-160,5,0,Math.PI);c.stroke();
  // arms: left flex (up), right holds plunger, swing
  const up=-1*flex;
  // left arm (screen left) flexing
  c.save();c.translate(-92,-270);c.rotate(-.4+up*.9);rr(c,-26,-10,52,96,26);fillS(c,lin(c,-26,0,26,0,[[0,'#8fe06a'],[1,'#3f9a3a']]),5);
  ell(c,0,30,30+flex*10,26+flex*8);fillS(c,rad(c,0,30,34,'#c7ffa0','#6cc64e','#337f33'),5);circ(c,0,96,24);fillS(c,'#73cc52',5);c.restore();
  // right arm with plunger
  c.save();c.translate(92,-270);c.rotate(.5-Math.sin(P*2)*.25);rr(c,-26,-10,52,96,26);fillS(c,lin(c,-26,0,26,0,[[0,'#8fe06a'],[1,'#3f9a3a']]),5);
  c.translate(0,96);rr(c,-6,-150,12,160,6);fillS(c,lin(c,-6,0,6,0,[[0,'#f2c07c'],[1,'#9a5a22']]),4);
  c.beginPath();c.moveTo(-46,-200);c.bezierCurveTo(-46,-140,46,-140,46,-200);c.quadraticCurveTo(0,-212,-46,-200);c.closePath();fillS(c,lin(c,0,-200,0,-150,[[0,'#ff7a7a'],[1,'#b5142c']]),5);gloss(c,-16,-178,10,5,.5);
  circ(c,0,0,24);fillS(c,'#73cc52',5);c.restore();
  // head
  const hy=-350+bob*.2;ell(c,0,hy,70,64);fillS(c,rad(c,0,hy,72,'#c8ffa0','#6cc64e','#2f7a32'),5);
  for(const d of[-1,1]){ell(c,d*70,hy+4,13,18,d*.3);fillS(c,'#64bd48',5);}
  c.beginPath();c.moveTo(-70,hy-30);c.quadraticCurveTo(0,-56+hy,70,hy-30);c.lineTo(70,hy-10);c.quadraticCurveTo(0,hy-36,-70,hy-10);c.closePath();fillS(c,lin(c,0,hy-56,0,hy-10,[[0,'#ff6b6b'],[1,'#c8203a']]),4);
  c.fillStyle='#fff';for(let i=-50;i<=50;i+=20){circ(c,i,hy-31-Math.abs(i)*.1,3);c.fill();}
  // brows
  c.strokeStyle=OL;c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(-40,hy-8);c.lineTo(-14,hy-2+flex*4);c.moveTo(40,hy-8);c.lineTo(14,hy-2+flex*4);c.stroke();
  eyes(c,0,hy+14,13,26,[Math.sin(P)*.6,.1],0,blink);
  // nose + grin with gap tooth
  ell(c,0,hy+32,13,9);fillS(c,'#5fb845',4);
  c.beginPath();c.moveTo(-34,hy+42);c.quadraticCurveTo(0,hy+80+flex*6,34,hy+42);c.closePath();fillS(c,'#5a1830',4);
  c.fillStyle='#fff';c.fillRect(-20,hy+44,14,10);c.fillRect(4,hy+44,14,10);
  blush(c,0,hy+36,11,46);gloss(c,-26,hy-44,18,8,.35);
  c.restore();
}
/* tiny cartoon fly for title orbit + poster */
function drawMiniFly(c,x,y,s,t,dizzy){c.save();c.translate(x,y);c.scale(s,s);BUGART.fly(c,{look:[0,0],mood:dizzy?3:0,blink:0},t);c.restore();}
/* stink / sparkle lines */
function stink(c,x,y,s,t,col){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=col||'rgba(160,220,90,.7)';c.lineWidth=4;c.lineCap='round';
  for(let i=0;i<3;i++){const ph=(t*.8+i/3)%1;c.globalAlpha=Math.sin(ph*Math.PI)*.8;c.beginPath();for(let k=0;k<=12;k++){const yy=-k*4-ph*30;c.lineTo((i-1)*14+Math.sin(k*.8+t*6+i)*5,yy);}c.stroke();}c.restore();}
if(typeof module!=='undefined')module.exports={};
