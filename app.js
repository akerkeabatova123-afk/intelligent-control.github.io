const P=document.body.dataset.page, demo=document.getElementById('demo');
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cv=(w=640,h=300)=>`<canvas width="${w}" height="${h}"></canvas>`;
const $=s=>demo.querySelector(s);
function plot(g,w,h,series,y0,y1){g.clearRect(0,0,w,h);g.strokeStyle='#ccd';g.strokeRect(0,0,w,h);
 series.forEach(s=>{g.beginPath();g.strokeStyle=s.c;g.lineWidth=s.w||2;s.d.forEach((v,i)=>{const x=i/(s.d.length-1)*w,y=h-(v-y0)/(y1-y0)*(h-10)-5;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()})}
/* ---- чистые функции (используются и в тестах) ---- */
const ndvi=(nir,red)=>(nir+red)===0?0:(nir-red)/(nir+red);
const toLocal=(lat,lon,lat0,lon0)=>{const R=6378137,r=Math.PI/180;return{x:R*(lon-lon0)*r*Math.cos(lat0*r),y:R*(lat-lat0)*r}};
const movAvg=(a,w)=>a.map((_,i)=>{let s=0,n=0;for(let j=i-w;j<=i+w;j++)if(a[j]!==undefined){s+=a[j];n++}return s/n});
const needPhoto=(v,thr)=>v<thr;
function pidSim(kp,ki,kd,T=8,dt=.02){let x=0,v=0,I=0,pe=1,out=[];for(let t=0;t<T;t+=dt){const e=1-x;I+=e*dt;const u=kp*e+ki*I+kd*(e-pe)/dt;pe=e;v+=(u-.8*v)*dt;x+=v*dt;out.push(x)}return out}
/* ---- этапы ---- */
const demos={
s1(){demo.innerHTML=`<div class=ctl><label>Шум <input type=range id=n min=0 max=60 value=25></label><label>Окно фильтра <input type=range id=w min=1 max=15 value=6></label></div>${cv()}<p class=note id=o></p>`;
 const g=$('canvas').getContext('2d');const base=Array.from({length:200},(_,i)=>50+30*Math.sin(i/18));const rs=Array.from({length:200},()=>rnd()-.5);
 const run=()=>{const n=+$('#n').value,w=+$('#w').value;const noisy=base.map((v,i)=>v+rs[i]*n*2),f=movAvg(noisy,w);
 const mn=Math.min(...f),mx=Math.max(...f),norm=f.map(v=>(v-mn)/(mx-mn)*100);const rm=(a)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-base[i])**2,0)/a.length);
 plot(g,640,300,[{d:noisy,c:'#bbb',w:1},{d:base,c:'#888',w:1},{d:f,c:'#1f7a55',w:3},{d:norm,c:'#c0582a',w:1.5}],-20,120);
 $('#o').innerHTML=`Серый — сигнал датчика с шумом, зелёный — после фильтра (скользящее среднее), оранжевый — после нормализации 0–100. Ошибка (RMSE): до фильтра <b>${rm(noisy).toFixed(2)}</b>, после <b>${rm(f).toFixed(2)}</b>.`};
 demo.oninput=run;run()},
s2(){demo.innerHTML=`<div class=ctl><label>Траектория <select id=t><option value=c>Круговая</option><option value=e>Восьмёрка</option><option value=r>Произвольная</option></select></label><label><input type=checkbox id=ob checked> учитывать препятствия</label></div>${cv(640,360)}<p class=note id=o></p>`;
 const g=$('canvas').getContext('2d'),obs=[[320,70,34],[430,200,30],[220,240,28]];
 const run=()=>{seed=3;const t=$('#t').value;let pts=[];const N=240;
 for(let i=0;i<N;i++){const a=i/N*2*Math.PI;pts.push(t=='c'?[320+170*Math.cos(a),180+120*Math.sin(a)]:t=='e'?[320+200*Math.sin(a),180+110*Math.sin(2*a)/1]:null)}
 if(t=='r'){const w=Array.from({length:7},()=>[70+rnd()*500,50+rnd()*260]);pts=[];for(let k=0;k<w.length;k++){const a=w[k],b=w[(k+1)%w.length];for(let s=0;s<35;s++)pts.push([a[0]+(b[0]-a[0])*s/35,a[1]+(b[1]-a[1])*s/35])}}
 if($('#ob').checked)pts=pts.map(p=>{obs.forEach(o=>{const dx=p[0]-o[0],dy=p[1]-o[1],d=Math.hypot(dx,dy),m=o[2]+14;if(d<m){p=[o[0]+dx/d*m,o[1]+dy/d*m]}});return p});
 g.clearRect(0,0,640,360);obs.forEach(o=>{g.fillStyle='#c0582a';g.beginPath();g.arc(o[0],o[1],o[2],0,7);g.fill()});
 g.strokeStyle='#1f7a55';g.lineWidth=3;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();
 let L=0;pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];L+=Math.hypot(p[0]-q[0],p[1]-q[1])});
 $('#o').textContent=`Красные круги — препятствия. Длина маршрута: ${(L*.5).toFixed(0)} м (масштаб 1 пиксель = 0,5 м). Точки, попавшие в зону препятствия, смещаются на безопасное расстояние.`};
 demo.oninput=run;run()},
s3(){demo.innerHTML=`<div class=ctl><label>Kp <input type=number id=kp value=4 step=.5 min=0></label><label>Ki <input type=number id=ki value=1 step=.5 min=0></label><label>Kd <input type=number id=kd value=1.5 step=.5 min=0></label></div>${cv(640,260)}<p class=note id=o></p>`;
 const g=$('canvas').getContext('2d');const run=()=>{const o=pidSim(+$('#kp').value,+$('#ki').value,+$('#kd').value);
 plot(g,640,260,[{d:o.map(()=>1),c:'#999',w:1},{d:o,c:'#1f7a55',w:3}],-.2,1.8);const mx=Math.max(...o);let ts=0;o.forEach((v,i)=>{if(Math.abs(v-1)>.02)ts=i*.02});
 $('#o').innerHTML=`Серый — заданное значение (например, высота 1 м), зелёный — отклик дрона. Перерегулирование: <b>${Math.max(0,(mx-1)*100).toFixed(1)}%</b>, время установления (±2%): <b>${ts.toFixed(1)} с</b>.`};
 demo.oninput=run;run()},
s4(){demo.innerHTML=`<div class=ctl><label>Порог уверенности <input type=range id=c min=10 max=95 value=50></label><b id=cv></b></div>${cv(640,340)}<div class=table-wrap><table id=tb></table></div><p class=note>Демонстрация: объекты и «уверенность» заданы программно (имитация выхода YOLOv8). Реальный запуск — в коде ниже.</p>`;
 const g=$('canvas').getContext('2d');seed=11;const names=['дерево','здание','автомобиль','человек','дерево','здание'];
 const objs=names.map((n,i)=>({n,x:40+rnd()*480,y:40+rnd()*230,w:50+rnd()*50,h:40+rnd()*40,c:.3+rnd()*.68}));
 const run=()=>{const th=+$('#c').value/100;$('#cv').textContent=th.toFixed(2);g.fillStyle='#9bc58a';g.fillRect(0,0,640,340);g.fillStyle='#b8a888';g.fillRect(0,150,640,22);
 let rows='<tr><th>Класс</th><th>Уверенность</th><th>Пиксели (x,y)</th><th>Локально, м (x,y)</th></tr>';
 objs.forEach(o=>{g.fillStyle='#5c7a4c';g.fillRect(o.x,o.y,o.w,o.h);if(o.c>=th){g.strokeStyle='#e03030';g.lineWidth=2;g.strokeRect(o.x,o.y,o.w,o.h);g.fillStyle='#e03030';g.font='13px sans-serif';g.fillText(o.n+' '+o.c.toFixed(2),o.x,o.y-4);
 rows+=`<tr><td>${o.n}</td><td>${o.c.toFixed(2)}</td><td>${(o.x+o.w/2).toFixed(0)}, ${(o.y+o.h/2).toFixed(0)}</td><td>${((o.x+o.w/2)*.5).toFixed(1)}, ${((340-o.y-o.h/2)*.5).toFixed(1)}</td></tr>`}});$('#tb').innerHTML=rows};
 demo.oninput=run;run()},
s5(){demo.innerHTML=`<div class=ctl><button class=btn id=go>Запустить картирование</button></div>${cv(640,360)}<p class=note id=o>Серое — неизвестно, белое — свободно, тёмное — препятствие. Дрон строит карту занятости (occupancy grid) по данным дальности.</p>`;
 const g=$('canvas').getContext('2d'),W=40,H=22,S=16;seed=5;const gr=[];for(let y=0;y<H;y++){gr.push([]);for(let x=0;x<W;x++)gr[y].push(0)}
 for(let k=0;k<9;k++){const bx=3+Math.floor(rnd()*34),by=2+Math.floor(rnd()*17),bw=1+Math.floor(rnd()*4),bh=1+Math.floor(rnd()*3);for(let y=by;y<by+bh;y++)for(let x=bx;x<bx+bw;x++)gr[y][x]=1}
 let known=gr.map(r=>r.map(()=>-1)),tm;const draw=(dx,dy)=>{g.clearRect(0,0,640,360);known.forEach((r,y)=>r.forEach((v,x)=>{g.fillStyle=v<0?'#c9cfcc':v?'#2b3a34':'#fff';g.fillRect(x*S,y*S,S-1,S-1)}));if(dx!==undefined){g.fillStyle='#e03030';g.beginPath();g.arc(dx*S+8,dy*S+8,7,0,7);g.fill()}};
 draw();$('#go').onclick=()=>{clearInterval(tm);known=gr.map(r=>r.map(()=>-1));const path=[];for(let y=1;y<H;y+=3)for(let i=0;i<W;i++)path.push([y%2?i:W-1-i,y]);let i=0;
 tm=setInterval(()=>{const[p,q]=path[i++]||[];if(p===undefined){clearInterval(tm);draw();const n=known.flat().filter(v=>v>=0).length;$('#o').textContent=`Готово: исследовано ${(n/(W*H)*100).toFixed(0)}% карты, найдено препятствий: ${known.flat().filter(v=>v==1).length} ячеек.`;return}
 for(let y=q-2;y<=q+2;y++)for(let x=p-2;x<=p+2;x++)if(gr[y]&&gr[y][x]!==undefined)known[y][x]=gr[y][x];draw(p,q)},25)}},
s6(){demo.innerHTML=`<div class=ctl><label>Начало (lat0) <input type=number id=a0 value=51.1694 step=.0001></label><label>lon0 <input type=number id=o0 value=71.4491 step=.0001></label></div><div class=ctl><label>Дрон (lat) <input type=number id=a1 value=51.1712 step=.0001></label><label>lon <input type=number id=o1 value=71.4530 step=.0001></label></div><p id=o></p><p class=note>Формулы: x = R·Δλ·cos φ₀, y = R·Δφ, R = 6 378 137 м (приближение «плоской земли», достаточно для района в несколько км).</p>`;
 const run=()=>{const v=i=>+$(i).value,r=toLocal(v('#a1'),v('#o1'),v('#a0'),v('#o0'));$('#o').innerHTML=`Локальные координаты: <b>x = ${r.x.toFixed(1)} м</b> (восток), <b>y = ${r.y.toFixed(1)} м</b> (север). Расстояние до начала: <b>${Math.hypot(r.x,r.y).toFixed(1)} м</b>.`};demo.oninput=run;run()}};
if(demos[P])demos[P]();
/* ---- итоговая страница: NDVI, карта, прогноз, обучение, тесты ---- */
if(P==='result'){
 const q=s=>document.querySelector(s);const col=v=>{const t=Math.max(0,Math.min(1,(v-.1)/.5));return`hsl(${t*110},65%,${70-t*30}%)`};
 const nir=q('#nir'),red=q('#red'),thr=q('#thr');
 const calc=()=>{const v=ndvi(+nir.value,+red.value);q('#nv').textContent=`NIR=${(+nir.value).toFixed(2)}, Red=${(+red.value).toFixed(2)} → NDVI = ${v.toFixed(3)}`;q('#dec').innerHTML=needPhoto(v,+thr.value)?`<b class=bad>ДА: NDVI (${v.toFixed(2)}) &lt; порога (${(+thr.value).toFixed(2)}) — подозрение на фитостресс, дрон делает снимок</b>`:`<b class=ok>НЕТ: NDVI (${v.toFixed(2)}) ≥ порога — растения в норме, дрон летит дальше</b>`;q('#tv').textContent=(+thr.value).toFixed(2)};
 [nir,red,thr].forEach(e=>e.oninput=calc);calc();
 const W=36,H=20,S=16;seed=21;const f=[];for(let y=0;y<H;y++){f.push([]);for(let x=0;x<W;x++){const d=Math.hypot(x-24,y-6),d2=Math.hypot(x-8,y-14);f[y].push(Math.max(.12,.55-.35*Math.exp(-d*d/20)-.3*Math.exp(-d2*d2/14)+(rnd()-.5)*.06))}}
 const g=q('#map').getContext('2d');let tm;const drawMap=(n,photos)=>{g.clearRect(0,0,576,320);f.forEach((r,y)=>r.forEach((v,x)=>{g.fillStyle=col(v);g.fillRect(x*S,y*S,S,S)}));
 if(n){g.strokeStyle='#123';g.lineWidth=1.5;g.beginPath();for(let i=0;i<n;i++){const p=pathF[i];i?g.lineTo(p[0]*S+8,p[1]*S+8):g.moveTo(p[0]*S+8,p[1]*S+8)}g.stroke();const c=pathF[n-1];g.fillStyle='#fff';g.strokeStyle='#000';g.beginPath();g.arc(c[0]*S+8,c[1]*S+8,7,0,7);g.fill();g.stroke()}
 photos.forEach(p=>{g.fillStyle='#e03030';g.fillRect(p[0]*S+3,p[1]*S+3,10,10)})};
 const pathF=[];for(let y=1;y<H;y+=3)for(let i=0;i<W;i++)pathF.push([y%3==1&&((y-1)/3)%2?W-1-i:i,y]);
 const fixPath=()=>{pathF.length=0;let k=0;for(let y=1;y<H;y+=3,k++)for(let i=0;i<W;i++)pathF.push([k%2?W-1-i:i,y])};fixPath();
 drawMap(0,[]);q('#fly').onclick=()=>{clearInterval(tm);let i=0,ph=[];const T=+thr.value;tm=setInterval(()=>{i+=2;const p=pathF[Math.min(i,pathF.length)-1];if(f[p[1]][p[0]]<T&&!ph.some(a=>Math.hypot(a[0]-p[0],a[1]-p[1])<3))ph.push(p);drawMap(Math.min(i,pathF.length),ph);
  if(i>=pathF.length){clearInterval(tm);const n=f.flat().filter(v=>v<T).length;q('#fres').textContent=`Полёт завершён. Ячеек ниже порога ${T.toFixed(2)}: ${n} из ${W*H} (${(n/W/H*100).toFixed(0)}%). Сделано снимков: ${ph.length} (красные квадраты). Средний NDVI поля: ${(f.flat().reduce((a,b)=>a+b)/W/H).toFixed(3)}.`}},30)};
 /* прогноз: линейная регрессия */
 {seed=4;const wk=[1,2,3,4,5,6,7,8,9,10],y=wk.map(w=>.62-.018*w+(rnd()-.5)*.03),n=10,mx=5.5,my=y.reduce((a,b)=>a+b)/n;
  const b=wk.reduce((s,w,i)=>s+(w-mx)*(y[i]-my),0)/wk.reduce((s,w)=>s+(w-mx)**2,0),a=my-b*mx;const pred=Array.from({length:13},(_,i)=>a+b*(i+1));
  const r2=1-y.reduce((s,v,i)=>s+(v-pred[i])**2,0)/y.reduce((s,v)=>s+(v-my)**2,0);const gg=q('#reg').getContext('2d');
  plot(gg,560,220,[{d:pred,c:'#1f7a55',w:2},{d:[...y,null,null,null].map((v,i)=>v===null?pred[i]:v),c:'#c0582a',w:1}],.25,.7);
  gg.fillStyle='#c0582a';y.forEach((v,i)=>{gg.beginPath();gg.arc(i/12*560,220-(v-.25)/.45*210-5,4,0,7);gg.fill()});
  q('#rego').innerHTML=`Модель NDVI(неделя) = ${a.toFixed(3)} ${b<0?'−':'+'} ${Math.abs(b).toFixed(4)}·неделя, R² = <b>${r2.toFixed(3)}</b>. Прогноз на неделю 13: <b>${pred[12].toFixed(3)}</b> (точки — измерения, линия — модель).`}
 /* кривая обучения (имитация) */
 {seed=9;const tr=Array.from({length:50},(_,i)=>.9*Math.exp(-i/9)+.06+(rnd()-.5)*.01),va=Array.from({length:50},(_,i)=>.95*Math.exp(-i/9)+.1+(rnd()-.5)*.02);
  plot(q('#loss').getContext('2d'),560,220,[{d:tr,c:'#1f7a55',w:2},{d:va,c:'#c0582a',w:2}],0,1.05);
  q('#losso').innerHTML=`Зелёная — ошибка на обучении (${tr[49].toFixed(3)}), оранжевая — на проверке (${va[49].toFixed(3)}). Кривые сходятся — переобучения нет. <span class=tag>демонстрационные данные</span>`}
 /* тесты */
 const T=[['NDVI(0.8; 0.2) = 0.6',Math.abs(ndvi(.8,.2)-.6)<1e-9],['NDVI(0; 0) = 0 (нет деления на ноль)',ndvi(0,0)===0],['NDVI всегда в диапазоне [−1; 1]',[[1,0],[0,1],[.3,.3]].every(([a,b])=>Math.abs(ndvi(a,b))<=1)],['NDVI 0.3 < порога 0.4 → снимок',needPhoto(.3,.4)===true],['NDVI 0.5 ≥ порога 0.4 → без снимка',needPhoto(.5,.4)===false],['Начало координат → (0; 0) м',(r=>Math.abs(r.x)+Math.abs(r.y)<1e-9)(toLocal(51.1,71.4,51.1,71.4))],['0.001° широты ≈ 111 м',Math.abs(toLocal(51.101,71.4,51.1,71.4).y-111.3)<1],['Скользящее среднее константы = константа',movAvg([5,5,5,5],1).every(v=>v===5)],['PID приводит систему к заданному значению',Math.abs(pidSim(4,1,1.5,15).pop()-1)<.02]];
 q('#tests').innerHTML=T.map(t=>`<tr><td>${t[0]}</td><td class="${t[1]?'ok':'bad'}">${t[1]?'✓ пройден':'✗ ошибка'}</td></tr>`).join('')+`<tr><th>Итого</th><th>${T.filter(t=>t[1]).length} из ${T.length}</th></tr>`;
}
