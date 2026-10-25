(function(){
const {DB,esc,fmt,discountPct,bundleTotal}=SF;
const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
const d=DB.load(),shop=d.shop;
if(q.get('ref'))try{sessionStorage.setItem('sf_ref',q.get('ref').toUpperCase())}catch(e){}
const p=DB.product(q.get('p'));
const root=$('#sf');
const head=`<div class="sf-head"><span>${esc(shop.name)}</span><a href="${esc(SF.waUrl?SF.waUrl():'https://wa.me/'+shop.whatsapp.replace(/\D/g,''))}" class="small" style="text-decoration:none">💬 Aide</a></div>${shop.active?'':'<div class="preview-bar">Aperçu privé — votre boutique n’est pas encore en ligne</div>'}`;
const wa=`<a class="wa" href="https://wa.me/${esc(shop.whatsapp.replace(/\D/g,''))}" target="_blank" rel="noopener" aria-label="Discuter sur WhatsApp">💬</a>`;
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
function shell(inner,extra=''){root.innerHTML=`<div class="sf-wrap">${head}${inner}</div>${extra}`}
function notFound(){shell('<div class="sec empty">Produit introuvable ou non publié.</div>')}

function product(){
  if(!p||(p.status!=='active'&&!q.get('preview')&&p.status==='archived'))return notFound();
  DB.trackVisit();
  const B=p.blocks,off=discountPct(p);
  let sel=(p.bundles.find(b=>b.qty===1)||p.bundles[0]).qty;
  const low=p.stock<=p.lowStock;
  const bl={
    quantity:()=>`<div class="sec"><h2>Choisissez votre offre</h2><div id="bund">${p.bundles.map(b=>{const tot=bundleTotal(p,b);return `<label class="bundle ${b.qty===sel?'on':''}">${b.badge?`<span class="bd">${esc(b.badge)}</span>`:''}<input type="radio" name="q" value="${b.qty}" ${b.qty===sel?'checked':''}><span><b>${b.qty} unité${b.qty>1?'s':''}</b>${b.discount?`<br><span class="small muted">-${b.discount}%</span>`:''}</span><span class="amt">${fmt(tot)}${b.discount?`<small>Vous économisez ${fmt(p.price*b.qty-tot)}</small>`:''}</span></label>`}).join('')}</div></div>`,
    urgency:()=>`<div class="sec"><div class="urgency"><div class="small"><b>Offre expire bientôt</b></div><div class="t" id="cd">--:--</div><div class="small">👀 <b id="viewers">23</b> personnes sont en train de voir ce produit</div>${p.stock<=Math.max(p.lowStock,10)?`<div class="small mt"><b>Stock limité</b>, plus que ${p.stock>0?'quelques unités':'0 unité'} disponibles. Profitez-en avant la rupture.</div>`:''}</div></div>`,
    steps:()=>`<div class="sec"><h2>Comment ça marche ?</h2><div class="how">${p.steps.map((s,i)=>`<div><i>${i+1}</i><span>${esc(s)}</span></div>`).join('')}</div></div>`,
    guarantee:()=>`<div class="sec"><h2>🛡️ Garantie</h2><p>${esc(p.guarantee)}</p></div>`,
    reviews:()=>p.reviews.length?`<div class="sec"><h2>Avis clients</h2>${p.reviews.map(r=>`<div class="rev"><b>${esc(r.name)}</b> <span class="rating">${stars(r.rating)}</span><p style="margin:.3em 0 0">${esc(r.text)}</p></div>`).join('')}</div>`:'',
    timeline:()=>p.timeline.length?`<div class="sec"><h2>Guide d’entretien</h2><div class="tl">${p.timeline.map(t=>`<div>${esc(t)}</div>`).join('')}</div></div>`:'',
    highlights:()=>p.highlights.length?`<div class="sec"><h2>Points forts</h2><ul class="ticks">${p.highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>`:'',
    demo:()=>p.videoUrl?`<div class="sec"><h2>Démo produit</h2><video controls playsinline preload="none" src="${esc(p.videoUrl)}" style="width:100%;border-radius:12px"></video></div>`:'',
    comparison:()=>p.comparison.length?`<div class="sec"><h2>Comparaison</h2><table class="cmp"><thead><tr><th></th><th>${esc(shop.name)}</th><th>Autres</th></tr></thead><tbody>${p.comparison.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1]||'')}</td><td>${esc(r[2]||'')}</td></tr>`).join('')}</tbody></table></div>`:'',
    results:()=>'',
    faq:()=>p.faq.length?`<div class="sec"><h2>Questions fréquentes</h2>${p.faq.map(f=>`<details class="faq"><summary>${esc(f[0])}</summary><p>${esc(f[1]||'')}</p></details>`).join('')}</div>`:'',
    final:()=>{const rel=d.products.filter(x=>x.id!==p.id&&x.status==='active').slice(0,3);return `<div class="sec" style="text-align:center"><h2>Prêt à commander ?</h2><p class="muted">Paiement à la réception — vous ne payez qu’une fois le colis en main.</p>${rel.length?`<h3 class="mt">Vous aimerez aussi</h3><div class="row" style="justify-content:center">${rel.map(r=>`<a href="?p=${esc(r.slug)}" style="text-decoration:none;color:inherit;width:140px"><img src="${esc(r.images[0]||'')}" alt="" style="border-radius:12px;aspect-ratio:1;object-fit:cover"><div class="small"><b>${esc(r.title)}</b></div><div class="small">${fmt(r.price)}</div></a>`).join('')}</div>`:''}</div>`}
  };
  const order=['quantity','urgency','steps','guarantee','reviews','timeline','highlights','demo','comparison','results','faq','final'];
  shell(`<div class="gal">${off?`<span class="badge">-${off}%</span>`:''}<img class="main-img" id="mi" src="${esc(p.images[0]||'')}" alt="${esc(p.title)}">${p.images.length>1?`<div class="dots">${p.images.map((s,i)=>`<img src="${esc(s)}" alt="Vue ${i+1}" class="${i?'':'on'}" data-i="${i}">`).join('')}</div>`:''}</div>
  <div class="sec"><div class="rating">★★★★★ <span style="color:var(--text)">Excellent ! ${p.rating}${p.ratingCount?` (${p.ratingCount} clients satisfaits)`:''}</span></div>
  <h1 style="margin-top:8px">${esc(p.title)}</h1><p class="muted">${esc(p.hook)} ${esc(p.desc)}</p>
  <div class="price"><b>${fmt(p.price)}</b>${p.compareAt>p.price?`<s>${fmt(p.compareAt)}</s>`:''}</div>
  <ul class="ticks">${p.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><p class="small muted">${esc(p.deliveryInfo)}</p></div>
  ${order.filter(k=>B[k]).map(k=>bl[k]()).join('')}`,
  `${wa}<div class="sticky"><a class="btn primary lg" id="buy" href="#">Commander maintenant</a></div>`);
  const go=()=>{location.href=`commande.html?p=${encodeURIComponent(p.slug)}&q=${sel}`};
  $('#buy').onclick=e=>{e.preventDefault();p.stock>0?go():alert('Produit momentanément en rupture.')};
  document.querySelectorAll('.gal .dots img').forEach(i=>i.onclick=()=>{$('#mi').src=p.images[i.dataset.i];document.querySelectorAll('.gal .dots img').forEach(x=>x.classList.toggle('on',x===i))});
  const bund=$('#bund');if(bund)bund.onchange=e=>{sel=+e.target.value;bund.querySelectorAll('.bundle').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked))};
  // Compte à rebours persistant par visiteur (se réarme à zéro)
  const cd=$('#cd');if(cd){
    const k='sf_cd_'+p.id;let end=+localStorage.getItem(k)||0;
    const tick=()=>{let r=end-Date.now();if(r<=0){end=Date.now()+p.urgencyMinutes*60000;try{localStorage.setItem(k,end)}catch(e){}r=end-Date.now()}
      const s=Math.floor(r/1000);cd.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
    tick();setInterval(tick,1000);
    let v=15+Math.floor(Math.random()*25);const vw=$('#viewers');vw.textContent=v;
    setInterval(()=>{v=Math.max(8,v+Math.floor(Math.random()*5)-2);vw.textContent=v},6000);
  }
}

function checkout(){
  if(!p)return notFound();
  let qty=+q.get('q')||1;if(!p.bundles.some(b=>b.qty===qty))qty=p.bundles[0].qty;
  const cc=shop.countryCode||'+225';
  const draw=()=>{
    const b=p.bundles.find(x=>x.qty===qty),sub=bundleTotal(p,b),tot=sub+(p.shipping||0);
    $('#sum').innerHTML=`<div class="sumline"><span>Sous-total</span><span>${fmt(sub)}</span></div><div class="sumline"><span>Livraison</span><span>${p.shipping?fmt(p.shipping):'Gratuite'}</span></div><div class="sumline total"><span>Total à payer</span><span>${fmt(tot)}</span></div>`;
    document.querySelectorAll('#bund .bundle').forEach(l=>l.classList.toggle('on',+l.querySelector('input').value===qty));
  };
  shell(`<div class="sec"><a href="produit.html?p=${esc(p.slug)}" class="small">← Retour au produit</a><h1 style="margin-top:8px">Finaliser la commande</h1>
  <div class="row"><img class="thumb" src="${esc(p.images[0]||'')}" alt=""><b>${esc(p.title)}</b></div></div>
  <div class="sec"><div id="bund">${p.bundles.map(b=>{const tot=bundleTotal(p,b);return `<label class="bundle">${b.badge?`<span class="bd">${esc(b.badge)}</span>`:''}<input type="radio" name="q" value="${b.qty}"><span><b>${b.qty} unité${b.qty>1?'s':''}</b>${b.discount?` <span class="small muted">-${b.discount}%</span>`:''}</span><span class="amt">${fmt(tot)}</span></label>`}).join('')}</div></div>
  <form class="sec" id="cf" novalidate>
   <label class="f">Nom complet *<input type="text" id="nm" autocomplete="name" required></label>
   <label class="f">Téléphone *<div class="phone"><input class="cc" type="text" value="${esc(cc)}" readonly aria-label="Indicatif"><input type="tel" id="ph" inputmode="tel" autocomplete="tel-national" placeholder="07 00 00 00 00" required></div></label>
   <label class="f">Lieu de livraison *<input type="text" id="pl" autocomplete="address-level2" placeholder="Ex : Yamoussoukro" required></label>
   <div id="sum"></div>
   ${shop.active?'':'<div class="notice">Aperçu privé : votre boutique n’est pas encore en ligne. Les commandes seront possibles dès que vous aurez choisi un abonnement.</div>'}
   <div class="secure">🔒 Paiement à la livraison — 100 % sécurisé</div>
   <p class="small" id="err" style="color:var(--bad)" role="alert"></p>
   <button class="btn primary lg" style="width:100%" ${shop.active?'':'disabled'}>Confirmer la commande</button></form>`,wa);
  document.querySelector('#bund').onchange=e=>{qty=+e.target.value;draw()};draw();
  // Panier abandonné : enregistré dès qu’un numéro valide est saisi
  const phoneVal=()=>cc+' '+$('#ph').value.replace(/[^\d ]/g,'').trim();
  const digits=()=>$('#ph').value.replace(/\D/g,'');
  $('#ph').addEventListener('blur',()=>{
    if(digits().length<8)return;const D=DB.load(),ph=phoneVal();
    if(D.orders.some(o=>o.phone===ph&&Date.now()-o.created<36e5))return;
    const b=p.bundles.find(x=>x.qty===qty);
    D.carts=D.carts.filter(c=>c.phone!==ph);
    D.carts.unshift({id:SF.uid('c'),name:$('#nm').value.trim(),phone:ph,pid:p.id,title:p.title,total:bundleTotal(p,b),created:Date.now()});DB.save();
  });
  $('#cf').onsubmit=e=>{
    e.preventDefault();const err=$('#err');
    const name=$('#nm').value.trim(),place=$('#pl').value.trim();
    if(!name)return err.textContent='Indiquez votre nom complet.';
    if(digits().length<8||digits().length>12)return err.textContent='Numéro de téléphone invalide.';
    if(!place)return err.textContent='Indiquez votre lieu de livraison.';
    if(!shop.active)return;
    const o=DB.placeOrder({pid:p.id,qty,name,phone:phoneVal(),place});
    const ref=sessionStorage.getItem('sf_ref');if(ref){o.ref=ref;DB.save()}
    shell(`<div class="sec" style="text-align:center;padding:48px 20px"><div style="font-size:3rem">✅</div><h1>Merci ${esc(name.split(' ')[0])} !</h1><p>Commande <b>${o.id}</b> enregistrée. Nous vous appelons très vite pour confirmer la livraison.</p><p class="muted">Total à payer à la réception : <b>${fmt(o.total)}</b></p><a class="btn" href="produit.html?p=${esc(p.slug)}">Retour à la boutique</a></div>`,wa);
  };
}
window.SF_PAGE==='checkout'?checkout():product();
})();
