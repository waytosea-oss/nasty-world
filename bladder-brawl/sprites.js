/* Bladder Brawl sprite layer: generated art (see art/), drawn and animated in code. */
'use strict';
const SPR=(function(){
  const webp=(()=>{try{return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp')===0}catch(e){return false}})();
  const I={},names=['bg-gas','bg-club','bg-porta','bowl','hero-back','hero-front','en-roach','en-fly','en-mosq','en-maggot','en-snail','en-gecko','en-spider','boss-fly','boss-snail','boss-spider'];
  let left=names.length;const waiters=[];
  for(const n of names){const im=new Image();const jpg=n.startsWith('bg-');im.onload=im.onerror=()=>{if(--left===0)waiters.splice(0).forEach(f=>f());};
    im.src='art/'+n+(webp?'.webp':(jpg?'.jpg':'.png'));I[n]=im;}
  const ok=n=>I[n]&&I[n].complete&&I[n].naturalWidth>0;
  const MAP={mosq:['en-mosq',2.9],fly:['en-fly',2.5],ant:['en-maggot',2.6],roach:['en-roach',2.7],snail:['en-snail',2.7],gecko:['en-gecko',3.2],baby:['en-spider',2.4],
    bfly:['boss-fly',2.5],bsnail:['boss-snail',2.4],bspider:['boss-spider',2.5]};
  const BG=['bg-gas','bg-club','bg-porta'];
  function img(c,n,x,y,h,ax,ay){if(!ok(n))return false;const im=I[n],w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,x-w*(ax==null?.5:ax),y-h*(ay==null?.5:ay),w,h);return true;}
  function cover(c,n,w,h,ox,oy){if(!ok(n))return false;const im=I[n],s=Math.max(w/im.naturalWidth,h/im.naturalHeight)*1.06,iw=im.naturalWidth*s,ih=im.naturalHeight*s;c.drawImage(im,(w-iw)/2+(ox||0),(h-ih)/2+(oy||0),iw,ih);return true;}
  // bug: sprite faces up at rot 0
  function bug(c,b,t){const T=BT[b.type],m=MAP[b.type];if(!m||!ok(m[0]))return false;const h=T.r*m[1]*1.3;
    const k=b.type;let sx=1,sy=1,r=0;
    if(k==='fly'||k==='mosq'||k==='bfly'){sx=1+Math.sin(t*38)*.06;}
    else if(k==='ant'||k==='bsnail'||k==='snail'){sy=1+Math.sin(t*6)*.07;sx=1-Math.sin(t*6)*.04;}
    else r=Math.sin(t*16)*.07;
    if(b.hide>0){sx*=.8;sy*=.8;}
    c.save();c.rotate(r);c.scale(sx,sy);img(c,m[0],0,0,h);
    if(b.hitT>0){c.globalCompositeOperation='lighter';c.globalAlpha=b.hitT/.15*.45;img(c,m[0],0,0,h);}
    c.restore();
    if(b.dead&&b.mood===3){c.save();c.rotate(-b.spin);c.fillStyle='#fff6a0';for(let i=0;i<3;i++){const a=t*8+i*2.1;c.beginPath();c.arc(Math.cos(a)*h*.35,-h*.45+Math.sin(a)*h*.1,2.2,0,6.3);c.fill();}c.restore();}
    return true;}
  function hero(c,x,base,top,t,aim,fire,bounce){if(!ok('hero-back'))return false;const h=(base-top)*1.35;
    c.save();c.translate(x,base+h*.18);c.rotate(clamp(aim,-200,200)*.0007+Math.sin(t*2)*.01);c.scale(1+bounce*.04,1-bounce*.04+(fire?Math.sin(t*20)*.004:0));
    c.globalAlpha=.35;c.fillStyle='#000';c.beginPath();c.ellipse(0,-h*.05,h*.32,h*.06,0,0,6.3);c.fill();c.globalAlpha=1;
    img(c,'hero-back',0,0,h,.5,1);c.restore();return true;}
  return {I,ok,img,cover,bug,hero,BG,ready:f=>left?waiters.push(f):f()};
})();
