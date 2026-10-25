/* Bladder Brawl sprite layer: generated art (see art/), drawn and animated in code. */
'use strict';
const SPR=(function(){
  const webp=(()=>{try{return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp')===0}catch(e){return false}})();
  const I={},names=['plate5c','lip5','toeL5','toeR5','toe5','stream5','fan5','flushW5','flushF5','flushS5','can5','hand-press','hand-grip','lever5','leverbg5','phone','cake','hero-front','en-roach','en-fly','en-mosq','en-maggot','en-snail','en-gecko','en-spider','boss-fly','boss-snail','boss-spider'];
  let left=names.length;const waiters=[];
  for(const n of names){const im=new Image();const jpg=n.startsWith('wall-')||n==='plate5c';im.onload=im.onerror=()=>{if(im.decode&&im.naturalWidth)im.decode().catch(()=>{});if(--left===0)waiters.splice(0).forEach(f=>f());};
    im.decoding='async';im.src='art/'+n+(webp?'.webp':(jpg?'.jpg':'.png'));I[n]=im;}
  const ok=n=>I[n]&&I[n].complete&&I[n].naturalWidth>0;
  const MAP={mosq:['en-mosq',2.9],fly:['en-fly',2.5],ant:['en-maggot',2.6],roach:['en-roach',2.7],snail:['en-snail',2.7],gecko:['en-gecko',3.2],baby:['en-spider',2.4],
    bfly:['boss-fly',2.5],bsnail:['boss-snail',2.4],bspider:['boss-spider',2.5],
    /* v7 bugs: painted base sprite + colour grade (tint [r,g,b,amount]) + code-drawn props (game.js drawAcc) */
    gnat:['en-mosq',3.4,[120,105,90,.55]],dodger:['en-roach',2.7,[70,150,255,.7]],armor:['en-roach',2.6,[120,170,70,.6]],blob:['en-maggot',2.6,[120,230,70,.72]],mini:['en-maggot',2.6,[150,240,90,.7]],
    climber:['en-gecko',3.2,[255,120,40,.75]],spitter:['en-fly',2.5,[200,230,40,.55]],healer:['en-snail',2.7,[255,120,190,.6]]};
  const BG=['wall-gas','wall-club','wall-porta'],WALL=BG;
  // outlined (and gold) bug sprites, baked once for contrast on bright porcelain
  const OC={};function outl(n,gold,tn){const k=n+(gold?'g':'')+(tn?tn.join():'');if(OC[k])return OC[k];const im=I[n],s=Math.min(1,180/im.naturalHeight),w=Math.round(im.naturalWidth*s),h=Math.round(im.naturalHeight*s),p=5;
    const a=document.createElement('canvas');a.width=w+p*2;a.height=h+p*2;const x=a.getContext('2d');
    const t=document.createElement('canvas');t.width=a.width;t.height=a.height;const y=t.getContext('2d');y.drawImage(im,p,p,w,h);if(gold){y.globalCompositeOperation='source-atop';y.fillStyle='rgba(255,196,40,.62)';y.fillRect(0,0,t.width,t.height);}
    if(tn){try{const d=y.getImageData(0,0,t.width,t.height),a=d.data,m=tn[3];for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const l=(a[i]*.3+a[i+1]*.59+a[i+2]*.11)/255,e=Math.min(1,l*1.55);a[i]=a[i]*(1-m)+tn[0]*e*m;a[i+1]=a[i+1]*(1-m)+tn[1]*e*m;a[i+2]=a[i+2]*(1-m)+tn[2]*e*m;}y.putImageData(d,0,0);}catch(e){}}
    const m=document.createElement('canvas');m.width=a.width;m.height=a.height;const z=m.getContext('2d');z.drawImage(im,p,p,w,h);z.globalCompositeOperation='source-in';z.fillStyle=gold?'#5a3a00':'#140c10';z.fillRect(0,0,m.width,m.height);
    for(let i=0;i<12;i++){const q=i/12*6.283;x.drawImage(m,Math.cos(q)*3,Math.sin(q)*3);}x.drawImage(t,0,0);OC[k]={c:a,r:a.width/a.height,hh:a.height/h};return OC[k];}
  function oimg(c,n,h,gold,tn){const o=outl(n,gold,tn),H=h*o.hh,Wd=H*o.r;c.drawImage(o.c,-Wd/2,-H/2,Wd,H);}
  function img(c,n,x,y,h,ax,ay){if(!ok(n))return false;const im=I[n],w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,x-w*(ax==null?.5:ax),y-h*(ay==null?.5:ay),w,h);return true;}
  function cover(c,n,w,h,ox,oy){if(!ok(n))return false;const im=I[n],s=Math.max(w/im.naturalWidth,h/im.naturalHeight)*1.06,iw=im.naturalWidth*s,ih=im.naturalHeight*s;c.drawImage(im,(w-iw)/2+(ox||0),(h-ih)/2+(oy||0),iw,ih);return true;}
  // bug: sprite faces up at rot 0
  function bug(c,b,t){const T=BT[b.type],m=MAP[b.type];if(!m||!ok(m[0]))return false;const h=T.r*m[1]*1.3;
    const k=b.type;let sx=1,sy=1,r=0;
    if(k==='fly'||k==='mosq'||k==='bfly'||k==='gnat'||k==='spitter'){sx=1+Math.sin(t*38)*.06;}
    else if(k==='ant'||k==='bsnail'||k==='snail'||k==='blob'||k==='mini'||k==='healer'){sy=1+Math.sin(t*6)*.07;sx=1-Math.sin(t*6)*.04;}
    else r=Math.sin(t*16)*.07;
    if(b.hide>0){sx*=.8;sy*=.8;}
    c.save();c.rotate(r);c.scale(sx,sy);if(k==='spitter'&&b.wind>0){const q=1+b.wind*.5;sx*=q;sy*=1/q*1.1;}oimg(c,m[0],h,b.gold,m[2]);if(b.gold){c.globalCompositeOperation='lighter';c.globalAlpha=.25+.2*Math.sin(t*9);oimg(c,m[0],h,1);c.globalAlpha=1;c.globalCompositeOperation='source-over';}
    if(b.hitT>0){c.globalCompositeOperation='lighter';c.globalAlpha=b.hitT/.15*.45;img(c,m[0],0,0,h);}
    c.restore();if(window.drawAcc)drawAcc(c,b,t,h);
    if(b.dead&&b.mood===3){c.save();c.rotate(-b.spin);c.fillStyle='#fff6a0';for(let i=0;i<3;i++){const a=t*8+i*2.1;c.beginPath();c.arc(Math.cos(a)*h*.35,-h*.45+Math.sin(a)*h*.1,2.2,0,6.3);c.fill();}c.restore();}
    return true;}
  function hero(c,x,base,top,t,aim,fire,bounce){if(!ok('hero-back'))return false;const h=(base-top)*1.35;
    c.save();c.translate(x,base+h*.18);c.rotate(clamp(aim,-200,200)*.0007+Math.sin(t*2)*.01);c.scale(1+bounce*.04,1-bounce*.04+(fire?Math.sin(t*20)*.004:0));
    c.globalAlpha=.35;c.fillStyle='#000';c.beginPath();c.ellipse(0,-h*.05,h*.32,h*.06,0,0,6.3);c.fill();c.globalAlpha=1;
    img(c,'hero-back',0,0,h,.5,1);c.restore();return true;}
  return {I,ok,img,cover,bug,hero,BG,WALL,ready:f=>left?waiters.push(f):f()};
})();
