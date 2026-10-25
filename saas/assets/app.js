(function(){
const {DB,esc,uid,fmt,slugify,discountPct,placeholder,ALL_BLOCKS,THEMES,applyTheme}=SF;
const $=s=>document.querySelector(s);
const view=$('#view'),side=$('#side');
const ST={to_confirm:['À confirmer','warn'],unreachable:['Injoignable','bad'],scheduled:['Programmée','info'],to_ship:['À expédier','info'],shipping:['En livraison',''],delivered:['Livrée','ok'],cancelled:['Annulée','bad']};
const NAV=[
 ['Vendre',[['dashboard','🏠','Tableau de bord'],['produits','📦','Produits'],['commandes','🧾','Commandes'],['paniers','🛒','Paniers abandonnés']]],
 ['Clients & IA',[['clients','👥','Clients'],['inbox','💬','Inbox IA']]],
 ['Développeur & Marketing',[['boutique','🏬','Ma Boutique'],['marketing','📣','Marketing'],['analytique','📊','Analytique'],['feedback','🐞','Bug & Suggestions'],['affiliation','🤝','Affiliation','Nouveau'],['theme','🎨','Thème'],['parametres','⚙️','Paramètres']]]];

function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2400)}
function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="card" role="dialog" aria-modal="true">${html}</div>`;m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.append(m);return m}
function pill(s){const [l,c]=ST[s]||[s,''];return `<span class="pill ${c}">${l}</span>`}
function ago(t){const m=Math.round((Date.now()-t)/60000);return m<60?`il y a ${m} min`:m<1440?`il y a ${Math.round(m/60)} h`:`il y a ${Math.round(m/1440)} j`}
function waLink(phone,text){return 'https://wa.me/'+String(phone).replace(/\D/g,'')+(text?'?text='+encodeURIComponent(text):'')}
function storeUrl(p){const u=new URL('produit.html',location.href);u.searchParams.set('p',p.slug);return u.href}
function resizeImage(file,max=900){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(file)})}
function inPeriod(t,per){const d=Date.now()-t;return per==='today'?new Date(t).toDateString()===new Date().toDateString():per==='7'?d<7*864e5:per==='30'?d<30*864e5:true}
function save(){if(!DB.save())toast('Stockage du navigateur plein — réduisez les images.')}

function renderSide(route){
  const d=DB.load();
  side.innerHTML=`<div class="brand"><span class="logo">S</span>ShopFlow</div>
  <div class="shopchip"><span>${esc(d.shop.name)}</span><span class="pill ${d.shop.active?'ok':'warn'}">${d.shop.active?'En ligne':'Aperçu'}</span></div>
  <nav class="nav" aria-label="Navigation principale">${NAV.map(([g,items])=>`<div class="navgrp">${g}</div>`+items.map(([r,ic,l,tag])=>`<a href="#/${r}" class="${route===r?'on':''}"><span class="ic">${ic}</span>${l}${tag?`<span class="tag">${tag}</span>`:''}</a>`).join('')).join('')}</nav>
  <div style="margin-top:auto;padding:10px 6px" class="row"><button class="btn sm" data-act="theme-toggle">☀️ / 🌙</button></div>`;
}

/* ---------- Vues ---------- */
const V={};
V.dashboard=()=>{
  const d=DB.load(),per=sessionStorage.getItem('per')||'today';
  const os=d.orders.filter(o=>o.status!=='cancelled'&&inPeriod(o.created,per));
  const visits=Object.entries(d.stats.visits).filter(([k])=>inPeriod(new Date(k).getTime()+43200000,per)).reduce((a,[,v])=>a+v,0);
  const rev=os.reduce((a,o)=>a+o.total,0),conv=visits?(os.length/visits*100):0;
  const cnt=s=>d.orders.filter(o=>o.status===s).length;
  const steps=[['Créer un produit',d.products.some(p=>p.status==='active')],['Personnaliser la boutique',!!d.shop.checklist.custom],['Activer la boutique',d.shop.active],['Recevoir une commande',d.orders.length>0],['Livrer une commande',d.orders.some(o=>o.status==='delivered')]];
  const done=steps.filter(s=>s[1]).length,next=steps.find(s=>!s[1]);
  const L=d.shop.links||{};
  const link=(k,l)=>L[k]?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(L[k])}">${l}</a>`:`<a class="btn sm" href="#/parametres" title="À renseigner dans Paramètres">${l} (à configurer)</a>`;
  return `<h1>Bonjour 👋 ${esc(d.shop.name)}</h1>
  ${sessionStorage.getItem('hideApp')?'':`<div class="banner"><span>📲 <b>Installe l’application ShopFlow</b> — reçois tes commandes en notification.</span><button class="btn sm" data-act="hide-app">Plus tard</button></div>`}
  ${d.shop.active?'':`<div class="banner hero"><span><b>Activer la boutique, à seulement ${fmt(d.shop.activationFee)}</b><br><span class="small">Tes clients pourront commander dès l’activation.</span></span><button class="btn" data-act="activate" style="color:var(--p-700)">Activer</button></div>`}
  <div class="banner"><span>🔎 <b>Trouve ton prochain produit gagnant</b> — les publicités qui vendent en ce moment.</span><a class="btn sm primary" href="#/marketing">Créer mes pubs</a></div>
  <div class="row between mb mt"><h2 style="margin:0">Chiffre d’affaires</h2>
    <select id="per" style="width:auto;margin:0" aria-label="Période">${[['today','Aujourd’hui'],['7','7 jours'],['30','30 jours'],['all','Tout']].map(([v,l])=>`<option value="${v}" ${v===per?'selected':''}>${l}</option>`).join('')}</select></div>
  <div class="cards kpis">
    <div class="card kpi"><div class="l"><span class="live"></span>Visiteurs en ligne</div><div class="v">${DB.onlineCount()}</div></div>
    <div class="card kpi"><div class="l">Chiffre d’affaires</div><div class="v">${fmt(rev)}</div></div>
    <div class="card kpi"><div class="l">Commandes</div><div class="v">${os.length}</div></div>
    <div class="card kpi"><div class="l">Visites</div><div class="v">${visits}</div></div>
    <div class="card kpi"><div class="l">Taux de conversion</div><div class="v">${conv.toFixed(1)} %</div></div></div>
  <div class="mt"><button class="btn sm" data-act="chart">📈 Voir le graphique</button></div><div id="chart"></div>
  <div class="card mt"><div class="row between"><h3 style="margin:0">Parcours vendeur</h3><span class="muted small">${done}/${steps.length}</span></div>
    <div class="progress mt"><b style="width:${done/steps.length*100}%"></b></div>
    <p class="small muted">${next?`Prochaine étape : <b>${next[0]}</b>`:'Bravo, toutes les étapes sont terminées 🎉'}</p>
    <div class="steps">${steps.map(s=>`<span class="step ${s[1]?'done':''}">${s[1]?'✓ ':''}${s[0]}</span>`).join('')}</div></div>
  <h2 class="mt">Commandes à traiter</h2>
  <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
   ${[['to_confirm','À confirmer','Nouvelles commandes à appeler'],['to_ship','À expédier','Prêtes à remettre aux livreurs'],['unreachable','Clients injoignables','À relancer'],['scheduled','Programmées','Livraisons planifiées'],['shipping','En cours de livraison','Chez les transporteurs']].map(([s,l,h])=>`<a class="card todo" href="#/commandes/${s}"><div class="v">${cnt(s)}</div><b>${l}</b><div class="muted small">${h}</div></a>`).join('')}</div>
  <h2 class="mt">Communauté & support</h2>
  <div class="card row">${link('youtube','▶️ YouTube')}${link('whatsapp','💬 Communauté WhatsApp')}${link('telegram','✈️ Telegram')}<a class="btn sm" href="#/feedback">💡 Partage tes idées</a>${link('facebook','Facebook')}${link('instagram','Instagram')}${link('tiktok','TikTok')}</div>`;
};

V.produits=(arg)=>{
  const d=DB.load();
  if(arg==='new')return productChooser();
  if(arg)return productEditor(arg);
  const tab=sessionStorage.getItem('ptab')||'all';
  const list=d.products.filter(p=>tab==='all'||p.status===tab);
  return `<div class="row between mb"><h1>Produits</h1><a class="btn primary" href="#/produits/new">+ Ajouter un produit</a></div>
  <div class="tabs">${[['all','Tous'],['active','Actifs'],['draft','Brouillons'],['archived','Archivés']].map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="ptab" data-v="${k}">${l}</button>`).join('')}</div>
  ${list.length?`<div class="tablewrap"><table><thead><tr><th></th><th>Produit</th><th>Statut</th><th>Prix</th><th>Stock</th><th></th></tr></thead><tbody>${list.map(p=>`<tr>
   <td><img class="thumb" src="${esc(p.images[0]||'')}" alt=""></td><td><b>${esc(p.title)}</b><div class="muted small">${esc(p.collection)}</div></td>
   <td><span class="pill ${p.status==='active'?'ok':p.status==='draft'?'warn':''}">${{active:'Actif',draft:'Brouillon',archived:'Archivé'}[p.status]}</span></td>
   <td>${fmt(p.price)}${discountPct(p)?` <span class="pill bad">-${discountPct(p)}%</span>`:''}</td>
   <td>${p.stock<=p.lowStock?`<span class="pill bad">${p.stock} (faible)</span>`:p.stock}</td>
   <td class="right"><a class="btn sm" href="#/produits/${p.id}">Modifier</a> <a class="btn sm" target="_blank" href="${esc(storeUrl(p))}">Voir</a></td></tr>`).join('')}</tbody></table></div>`
   :`<div class="card empty">Aucun produit ici.</div>`}`;
};
function productChooser(){
  return `<h1>Nouveau produit</h1><div class="chooser">
  <button class="choice" data-act="ai-create"><div class="big">✨</div><h3>Créer avec l’IA</h3><p class="muted">Dépose une photo → fiche complète en moins d’une minute.</p></button>
  <button class="choice" data-act="manual-create"><div class="big">✍️</div><h3>Créer manuellement</h3><p class="muted">Remplir la fiche moi-même.</p></button></div>
  <input type="file" id="aifile" accept="image/jpeg,image/png,image/webp" hidden>`;
}
function blankProduct(){
  const t=DB.load().products[0];
  return {id:uid('p'),title:'',slug:'',hook:'',price:0,compareAt:0,shipping:0,desc:'',badge:'',collection:'',status:'draft',stock:10,lowStock:5,variants:[],rating:4.9,ratingCount:0,urgencyMinutes:15,images:[],
   blocks:Object.fromEntries(ALL_BLOCKS.map(([k])=>[k,['quantity','urgency','steps','guarantee','faq'].includes(k)])),
   bundles:[{qty:1,discount:0,badge:''},{qty:2,discount:10,badge:'Plus populaire'},{qty:3,discount:15,badge:'Meilleure offre'}],
   bullets:[],guarantee:'Garantie 14 jours — essayez en toute confiance.',deliveryInfo:'Livraison à domicile, paiement à la réception.',
   steps:t?t.steps.slice():[],reviews:[],timeline:[],highlights:[],comparison:[],faq:[],created:Date.now(),_new:true};
}
const lines=v=>v.split('\n').map(s=>s.trim()).filter(Boolean);
const pairs=v=>lines(v).map(l=>l.split('|').map(s=>s.trim()));
function productEditor(id){
  const d=DB.load();let p=d.products.find(x=>x.id===id);
  if(!p){p=window.__draft&&window.__draft.id===id?window.__draft:null}
  if(!p)return `<div class="card empty">Produit introuvable. <a href="#/produits">Retour</a></div>`;
  window.__edit=p;
  const T=(k,l,h='')=>`<label class="f">${l}<span class="hint">${h}</span><textarea data-f="${k}">${esc((p[k]||[]).map?p[k].join('\n'):p[k])}</textarea></label>`;
  return `<div class="row between mb"><h1>${p._new?'Nouveau produit':'Modifier le produit'}</h1><div class="row">
    <a class="btn" href="#/produits">Annuler</a>${p._new?'':`<button class="btn danger" data-act="del-product" data-id="${p.id}">Supprimer</button>`}<button class="btn primary" data-act="save-product">Enregistrer</button></div></div>
  <form id="pf" class="cards" onsubmit="return false">
  <div class="card"><h3>Images</h3><p class="muted small">Jusqu’à 8 images — JPG, PNG, WEBP.</p>
   <div class="imgs" id="imgs">${imgsHtml(p)}</div><input type="file" id="imgin" accept="image/jpeg,image/png,image/webp" multiple hidden></div>
  <div class="card"><h3>Informations</h3>
   <label class="f">Titre du produit<input type="text" data-f="title" value="${esc(p.title)}" placeholder="Montre connectée Pro X500"></label>
   <label class="f">URL du produit<span class="hint">générée automatiquement</span><input type="text" id="slugview" value="${esc(p.slug||'')}" readonly></label>
   <label class="f">Accroche<input type="text" data-f="hook" value="${esc(p.hook)}" placeholder="La montre qui change votre vie"></label>
   <div class="grid2"><label class="f">Prix de vente (XOF)<input type="number" min="0" data-f="price" data-n value="${p.price}"></label>
    <label class="f">Prix barré (XOF)<span class="hint" id="disc">${discountPct(p)?'-'+discountPct(p)+'%':''}</span><input type="number" min="0" data-f="compareAt" data-n value="${p.compareAt}"></label>
    <label class="f">Frais de livraison (XOF)<input type="number" min="0" data-f="shipping" data-n value="${p.shipping}"></label>
    <label class="f">Stock<input type="number" min="0" data-f="stock" data-n value="${p.stock}"></label>
    <label class="f">Seuil d’alerte stock<input type="number" min="0" data-f="lowStock" data-n value="${p.lowStock}"></label>
    <label class="f">Statut<select data-f="status">${[['draft','Brouillon'],['active','Actif'],['archived','Archivé']].map(([v,l])=>`<option value="${v}" ${p.status===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <label class="f">Badge<input type="text" data-f="badge" value="${esc(p.badge)}" placeholder="Best-seller"></label>
    <label class="f">Collection<input type="text" data-f="collection" value="${esc(p.collection)}"></label></div>
   <label class="f">Description détaillée<textarea data-f="desc">${esc(p.desc)}</textarea></label>
   <label class="f">Livraison<textarea data-f="deliveryInfo">${esc(p.deliveryInfo)}</textarea></label>
   <label class="f">Garantie<textarea data-f="guarantee">${esc(p.guarantee)}</textarea></label></div>
  <div class="card"><h3>Offres groupées</h3><p class="muted small">Quantité, remise (%) et badge. Laissez la quantité à 0 pour retirer une ligne.</p>
   ${[0,1,2,3].map(i=>{const b=p.bundles[i]||{qty:0,discount:0,badge:''};return `<div class="grid2" style="grid-template-columns:80px 100px 1fr;gap:10px"><input type="number" min="0" aria-label="Quantité" data-b="${i}.qty" value="${b.qty}"><input type="number" min="0" max="90" aria-label="Remise %" data-b="${i}.discount" value="${b.discount}"><input type="text" aria-label="Badge" data-b="${i}.badge" value="${esc(b.badge||'')}" placeholder="Badge"></div><div style="height:8px"></div>`}).join('')}</div>
  <div class="card"><h3>Blocs de la page produit</h3><p class="muted small">Activez ou désactivez chaque bloc marketing.</p>
   ${ALL_BLOCKS.map(([k,l])=>`<div class="blockrow"><span>${l}</span><label class="switch"><input type="checkbox" data-blk="${k}" ${p.blocks[k]?'checked':''} aria-label="${esc(l)}"><i></i></label></div>`).join('')}
   <label class="f mt">Durée du compte à rebours (minutes)<input type="number" min="1" data-f="urgencyMinutes" data-n value="${p.urgencyMinutes}"></label></div>
  <div class="card"><h3>Contenu des blocs</h3>
   ${T('bullets','Arguments de vente','un par ligne')}${T('steps','Étapes de livraison','une par ligne')}${T('highlights','Points forts','un par ligne')}${T('timeline','Timeline / entretien','une étape par ligne')}
   <label class="f">Avis clients<span class="hint">Nom | note (1-5) | texte</span><textarea data-f="reviews" data-fmt="rev">${esc(p.reviews.map(r=>`${r.name} | ${r.rating} | ${r.text}`).join('\n'))}</textarea></label>
   <label class="f">FAQ<span class="hint">Question | Réponse</span><textarea data-f="faq" data-fmt="pair">${esc(p.faq.map(q=>q.join(' | ')).join('\n'))}</textarea></label>
   <label class="f">Comparaison<span class="hint">Critère | nous | autres</span><textarea data-f="comparison" data-fmt="pair">${esc(p.comparison.map(q=>q.join(' | ')).join('\n'))}</textarea></label></div>
  <div class="card"><h3>Outils marketing</h3><div class="row"><a class="btn" href="#/marketing?p=${p.id}">🎬 Créer des visuels / pubs</a></div></div>
  </form>`;
}
function imgsHtml(p){return p.images.map((s,i)=>`<div class="im"><img src="${esc(s)}" alt="Image ${i+1}"><button type="button" data-act="rm-img" data-i="${i}" aria-label="Retirer">×</button></div>`).join('')+(p.images.length<8?`<div class="add" data-act="add-img" role="button" tabindex="0" aria-label="Ajouter une image">+</div>`:'')}
function collectProduct(){
  const p=window.__edit;
  document.querySelectorAll('#pf [data-f]').forEach(el=>{
    const k=el.dataset.f;let v=el.value;
    if(el.dataset.n!==undefined)v=Math.max(0,Number(v)||0);
    else if(el.dataset.fmt==='rev')v=pairs(v).map(a=>({name:a[0]||'Client',rating:Math.min(5,Math.max(1,Number(a[1])||5)),text:a.slice(2).join(' | ')}));
    else if(el.dataset.fmt==='pair')v=pairs(v);
    else if(Array.isArray(p[k]))v=lines(v);
    p[k]=v;
  });
  document.querySelectorAll('[data-blk]').forEach(el=>p.blocks[el.dataset.blk]=el.checked);
  const bs=[];for(let i=0;i<4;i++){const q=Number(document.querySelector(`[data-b="${i}.qty"]`).value)||0;if(q>0)bs.push({qty:q,discount:Math.min(90,Number(document.querySelector(`[data-b="${i}.discount"]`).value)||0),badge:document.querySelector(`[data-b="${i}.badge"]`).value.trim()})}
  p.bundles=bs.length?bs:[{qty:1,discount:0,badge:''}];
  return p;
}

V.commandes=(arg)=>{
  const d=DB.load(),tab=arg||'all';
  const list=d.orders.filter(o=>tab==='all'||o.status===tab);
  return `<h1>Commandes</h1><div class="tabs">${[['all','Toutes'],...Object.entries(ST).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button class="${tab===k?'on':''}" onclick="location.hash='#/commandes/${k}'">${l}</button>`).join('')}</div>
  ${list.length?`<div class="tablewrap"><table><thead><tr><th>N°</th><th>Client</th><th>Produit</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>${list.map(o=>`<tr><td><b>${o.id}</b><div class="muted small">${ago(o.created)}</div></td>
   <td>${esc(o.customer)}<div class="muted small">${esc(o.phone)} · ${esc(o.place)}</div></td><td>${esc(o.title)} ×${o.qty}</td><td>${fmt(o.total)}</td>
   <td><select data-act="status" data-id="${o.id}" style="margin:0;width:auto" aria-label="Statut">${Object.entries(ST).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v[0]}</option>`).join('')}</select></td>
   <td class="right"><a class="btn sm" target="_blank" rel="noopener" href="tel:${esc(o.phone.replace(/\s/g,''))}">📞</a> <a class="btn sm" target="_blank" rel="noopener" href="${waLink(o.phone,`Bonjour ${o.customer}, concernant votre commande ${o.id} (${o.title})…`)}">WhatsApp</a></td></tr>`).join('')}</tbody></table></div>`:`<div class="card empty">Aucune commande.</div>`}`;
};
V.paniers=()=>{
  const d=DB.load();
  return `<h1>Paniers abandonnés</h1><p class="muted">Clients qui ont saisi leur numéro sans confirmer la commande.</p>
  ${d.carts.length?`<div class="tablewrap"><table><thead><tr><th>Client</th><th>Produit</th><th>Montant</th><th>Quand</th><th></th></tr></thead><tbody>${d.carts.map(c=>`<tr><td>${esc(c.name||'—')}<div class="muted small">${esc(c.phone)}</div></td><td>${esc(c.title)}</td><td>${fmt(c.total)}</td><td>${ago(c.created)}</td>
   <td class="right"><a class="btn sm primary" target="_blank" rel="noopener" href="${waLink(c.phone,`Bonjour ${c.name||''}, vous avez laissé « ${c.title} » dans votre panier. On vous le réserve ?`)}">Relancer</a> <button class="btn sm" data-act="rm-cart" data-id="${c.id}">Ignorer</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="card empty">Aucun panier abandonné 🎉</div>`}`;
};
V.clients=()=>{
  const d=DB.load(),m={};
  d.orders.forEach(o=>{const c=m[o.phone]||(m[o.phone]={name:o.customer,phone:o.phone,place:o.place,n:0,sum:0,last:0});c.n++;c.sum+=o.status==='cancelled'?0:o.total;c.last=Math.max(c.last,o.created)});
  const list=Object.values(m).sort((a,b)=>b.sum-a.sum);
  return `<h1>Clients</h1>${list.length?`<div class="tablewrap"><table><thead><tr><th>Client</th><th>Ville</th><th>Commandes</th><th>Total dépensé</th><th>Dernière</th></tr></thead><tbody>${list.map(c=>`<tr><td><b>${esc(c.name)}</b><div class="muted small">${esc(c.phone)}</div></td><td>${esc(c.place)}</td><td>${c.n}${c.n>1?' <span class="pill ok">fidèle</span>':''}</td><td>${fmt(c.sum)}</td><td>${ago(c.last)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="card empty">Pas encore de client.</div>`}`;
};
function aiReply(text,d){
  const t=text.toLowerCase(),p=d.products.find(x=>x.status==='active')||d.products[0];
  if(/livr|cocody|yopougon|adresse/.test(t))return `Bonjour ! Oui, nous livrons à domicile et vous payez à la réception. Quelle est votre ville ?`;
  if(/prix|combien|tarif/.test(t)&&p)return `${p.title} est à ${fmt(p.price)}${p.shipping?'':' (livraison gratuite)'}. Souhaitez-vous commander ?`;
  if(/pointure|taille/.test(t))return `Dites-moi votre pointure habituelle, je vous confirme la disponibilité.`;
  if(/stock|dispo/.test(t)&&p)return p.stock>0?`Oui, il reste ${p.stock} unité(s) de ${p.title}.`:`Désolé, ${p.title} est momentanément en rupture.`;
  return `Merci pour votre message ! Un conseiller vous répond très vite.`;
}
V.inbox=(arg)=>{
  const d=DB.load(),c=d.conversations.find(x=>x.id===arg)||d.conversations[0];
  return `<div class="row between mb"><h1>Inbox IA</h1><label class="row small"><span>Réponses automatiques</span><span class="switch"><input type="checkbox" id="aiauto" ${d.aiRules.auto?'checked':''}><i></i></span></label></div>
  <p class="muted small">Les suggestions utilisent des règles locales (livraison, prix, pointure, stock). Branchez un modèle de langage côté serveur pour des réponses libres.</p>
  <div class="card chat"><div class="list">${d.conversations.map(x=>`<div class="conv ${c&&x.id===c.id?'on':''}" onclick="location.hash='#/inbox/${x.id}'"><b>${esc(x.customer)}</b><div class="muted small">${esc(x.msgs.at(-1).text).slice(0,40)}</div></div>`).join('')||'<div class="empty">Aucune conversation</div>'}</div>
  <div>${c?`<div style="min-height:300px">${c.msgs.map(m=>`<div class="bubble ${m.from==='c'?'':m.from==='ai'?'ai':'me'}">${esc(m.text)}${m.from==='ai'?'<div class="small" style="opacity:.7">IA</div>':''}</div>`).join('')}</div>
   <div class="row mt"><input type="text" id="reply" class="grow" style="margin:0" placeholder="Votre réponse…" aria-label="Réponse"><button class="btn" data-act="ai-suggest" data-id="${c.id}">✨ Suggérer</button><button class="btn primary" data-act="send" data-id="${c.id}">Envoyer</button></div>`:''}</div></div>`;
};
V.boutique=()=>{
  const s=DB.load().shop;
  return `<h1>Ma Boutique</h1><div class="card"><form id="shopf" onsubmit="return false">
  <label class="f">Nom de la boutique<input type="text" name="name" value="${esc(s.name)}"></label>
  <label class="f">Slogan<input type="text" name="tagline" value="${esc(s.tagline)}"></label>
  <div class="grid2"><label class="f">Indicatif pays<input type="text" name="countryCode" value="${esc(s.countryCode)}"></label><label class="f">WhatsApp boutique<input type="tel" name="whatsapp" value="${esc(s.whatsapp)}"></label></div>
  <div class="row"><button class="btn primary" data-act="save-shop">Enregistrer</button>
  <span class="pill ${s.active?'ok':'warn'}">${s.active?'Boutique en ligne':'Mode aperçu privé'}</span>${s.active?'':`<button class="btn" data-act="activate">Activer — ${fmt(s.activationFee)}</button>`}</div></form></div>`;
};
V.marketing=()=>{
  const d=DB.load(),q=new URLSearchParams(location.hash.split('?')[1]||''),sel=q.get('p')||d.products[0]?.id,p=d.products.find(x=>x.id===sel)||d.products[0];
  const px=d.shop.pixels||{};
  return `<h1>Marketing</h1>
  <div class="card mb"><h3>Générateur de pubs</h3><label class="f">Produit<select id="mkp">${d.products.map(x=>`<option value="${x.id}" ${p&&x.id===p.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label>
   <div id="ads">${p?adsHtml(p):'<p class="muted">Créez un produit d’abord.</p>'}</div></div>
  <div class="card"><h3>Pixels de suivi</h3><form id="pxf" onsubmit="return false"><div class="grid2"><label class="f">Meta (Facebook) Pixel ID<input type="text" name="meta" value="${esc(px.meta||'')}" inputmode="numeric"></label><label class="f">TikTok Pixel ID<input type="text" name="tiktok" value="${esc(px.tiktok||'')}"></label></div><button class="btn primary" data-act="save-px">Enregistrer</button></form></div>`;
};
function adsHtml(p){
  const off=discountPct(p);
  const ads=[[`${p.title}${off?` : -${off}%`:''}`,`${p.hook||p.desc} Livraison à domicile, paiement à la réception. Commandez maintenant 👉`],[`Plus que ${p.stock} en stock !`,`${p.title} — ${fmt(p.price)}. Offre limitée, ne la ratez pas.`],[`Pourquoi tout le monde veut ${p.title}`,`${p.bullets.slice(0,3).join(' • ')}.`]];
  return ads.map(a=>`<div class="card mb" style="background:var(--surface-2)"><b>${esc(a[0])}</b><p>${esc(a[1])}</p><button class="btn sm" data-act="copy" data-t="${esc(a[0]+'\n'+a[1])}">Copier</button></div>`).join('')+`<p class="small muted">Textes générés par modèles. La génération d’images/vidéos IA nécessite un service externe à brancher.</p><div>Lien produit : <span class="code">${esc(storeUrl(p))}</span></div>`;
}
V.analytique=()=>{
  const d=DB.load(),days=[...Array(7)].map((_,i)=>{const t=new Date(Date.now()-(6-i)*864e5),k=t.toISOString().slice(0,10);return {k,l:t.toLocaleDateString('fr-FR',{weekday:'short'}),v:d.stats.visits[k]||0,o:d.orders.filter(o=>new Date(o.created).toISOString().slice(0,10)===k&&o.status!=='cancelled')}});
  const top={};d.orders.filter(o=>o.status!=='cancelled').forEach(o=>top[o.title]=(top[o.title]||0)+o.total);
  const maxv=Math.max(1,...days.map(x=>x.v)),maxo=Math.max(1,...days.map(x=>x.o.length));
  const bars=(f,m)=>`<div class="bars">${days.map(x=>`<div><span>${f(x)}</span><b style="height:${Math.max(2,f(x)/m*100)}%"></b><span>${x.l}</span></div>`).join('')}</div>`;
  return `<h1>Analytique</h1><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="card"><h3>Visites (7 jours)</h3>${bars(x=>x.v,maxv)}</div><div class="card"><h3>Commandes (7 jours)</h3>${bars(x=>x.o.length,maxo)}</div>
  <div class="card"><h3>Ventes par produit</h3>${Object.entries(top).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="sumline"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join('')||'<p class="muted">Pas de données.</p>'}</div></div>`;
};
V.feedback=()=>{
  const d=DB.load();
  return `<h1>Bug & Suggestions</h1><div class="card mb"><form id="fbf" onsubmit="return false"><label class="f">Type<select name="type"><option>Suggestion</option><option>Bug</option></select></label><label class="f">Message<textarea name="msg" required></textarea></label><button class="btn primary" data-act="send-fb">Envoyer</button></form></div>
  ${d.feedback.map(f=>`<div class="card mb"><span class="pill">${esc(f.type)}</span> <span class="muted small">${ago(f.t)}</span><p>${esc(f.msg)}</p></div>`).join('')}`;
};
V.affiliation=()=>{
  const d=DB.load();
  return `<h1>Affiliation <span class="pill">Nouveau</span></h1><p class="muted">Donnez un code à vos affiliés : toute commande passée via <span class="code">?ref=CODE</span> leur est attribuée.</p>
  <div class="card mb"><form id="aff" class="row" onsubmit="return false"><input type="text" name="name" placeholder="Nom" style="width:180px;margin:0" required><input type="text" name="code" placeholder="CODE" style="width:130px;margin:0" required><input type="number" name="rate" value="10" min="1" max="50" style="width:90px;margin:0" aria-label="Commission %"><button class="btn primary" data-act="add-aff">Ajouter</button></form></div>
  ${d.affiliates.length?`<div class="tablewrap"><table><thead><tr><th>Affilié</th><th>Code</th><th>Commandes</th><th>Commission</th><th>Lien</th></tr></thead><tbody>${d.affiliates.map(a=>{const os=d.orders.filter(o=>o.ref===a.code&&o.status!=='cancelled');const p=d.products.find(x=>x.status==='active')||d.products[0];return `<tr><td>${esc(a.name)}</td><td><span class="code">${esc(a.code)}</span></td><td>${os.length}</td><td>${fmt(os.reduce((s,o)=>s+o.total,0)*a.rate/100)} (${a.rate}%)</td><td>${p?`<button class="btn sm" data-act="copy" data-t="${esc(storeUrl(p)+'&ref='+a.code)}">Copier</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="card empty">Aucun affilié.</div>`}`;
};
V.theme=()=>{
  const d=DB.load();
  return `<h1>Thème</h1><div class="card mb"><h3>Affichage</h3><div class="tabs">${[['light','☀️ Clair'],['dark','🌙 Sombre'],['auto','Auto']].map(([k,l])=>`<button class="${d.theme===k?'on':''}" data-act="set-theme" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="card"><h3>Couleur principale (espace vendeur et vitrine)</h3><div class="swatches">${Object.entries(THEMES).map(([k,c])=>`<button class="${d.accent===k?'on':''}" data-act="set-accent" data-v="${k}" style="background:linear-gradient(135deg,${c[0]},${c[1]})" aria-label="${k}" title="${k}"></button>`).join('')}</div></div>`;
};
V.parametres=()=>{
  const L=DB.load().shop.links||{};
  return `<h1>Paramètres</h1><div class="card mb"><h3>Liens communauté & réseaux</h3><form id="lf" onsubmit="return false">${['youtube','whatsapp','telegram','facebook','instagram','tiktok'].map(k=>`<label class="f" style="text-transform:capitalize">${k}<input type="url" name="${k}" value="${esc(L[k]||'')}" placeholder="https://"></label>`).join('')}<button class="btn primary" data-act="save-links">Enregistrer</button></form></div>
  <div class="card"><h3>Données</h3><p class="muted small">Prototype : les données sont stockées dans ce navigateur.</p><div class="row"><button class="btn" data-act="export">Exporter (JSON)</button><button class="btn danger" data-act="reset">Réinitialiser la démo</button></div></div>`;
};

/* ---------- Routeur ---------- */
function render(){
  const [path]=location.hash.slice(2).split('?'),[r='dashboard',arg]=path.split('/');
  const fn=V[r]||V.dashboard;
  renderSide(V[r]?r:'dashboard');
  view.innerHTML=fn(arg);side.classList.remove('open');
  if(!path.includes('produits')||!arg)window.scrollTo(0,0);
}
addEventListener('hashchange',render);

/* ---------- Actions ---------- */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el||el.tagName==='SELECT')return;
  const a=el.dataset.act,d=DB.load();
  if(a==='theme-toggle'){d.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();applyTheme()}
  else if(a==='hide-app'){sessionStorage.setItem('hideApp','1');render()}
  else if(a==='activate'){
    const m=modal(`<h2>Activer la boutique</h2><p>Abonnement : <b>${fmt(d.shop.activationFee)}</b>.</p><p class="notice">Démo : aucun paiement réel n’est effectué. Brancher un agrégateur Mobile Money (Orange, MTN, Wave…) côté serveur.</p><div class="row"><button class="btn primary" id="okact">Simuler le paiement</button><button class="btn" id="cancel">Annuler</button></div>`);
    m.querySelector('#cancel').onclick=()=>m.remove();
    m.querySelector('#okact').onclick=()=>{d.shop.active=true;save();m.remove();toast('Boutique activée ✅');render()};
  }
  else if(a==='chart'){
    const days=[...Array(7)].map((_,i)=>{const t=new Date(Date.now()-(6-i)*864e5);return {l:t.toLocaleDateString('fr-FR',{weekday:'short'}),v:d.orders.filter(o=>o.status!=='cancelled'&&new Date(o.created).toDateString()===t.toDateString()).reduce((s,o)=>s+o.total,0)}});
    const m=Math.max(1,...days.map(x=>x.v));
    $('#chart').innerHTML=`<div class="card mt"><h3>Chiffre d’affaires — 7 jours</h3><div class="bars">${days.map(x=>`<div><span>${x.v?Math.round(x.v/1000)+'k':''}</span><b style="height:${Math.max(2,x.v/m*100)}%"></b><span>${x.l}</span></div>`).join('')}</div></div>`;
  }
  else if(a==='ptab'){sessionStorage.setItem('ptab',el.dataset.v);render()}
  else if(a==='manual-create'){window.__draft=blankProduct();location.hash='#/produits/'+window.__draft.id}
  else if(a==='ai-create')$('#aifile').click();
  else if(a==='add-img')$('#imgin').click();
  else if(a==='rm-img'){const p=collectProduct();p.images.splice(+el.dataset.i,1);$('#imgs').innerHTML=imgsHtml(p)}
  else if(a==='save-product'){
    const p=collectProduct();
    if(!p.title.trim())return toast('Le titre est obligatoire');
    if(p.status==='active'&&!p.images.length)p.images=[placeholder(p.title)];
    p.slug=slugify(p.title)||p.id;
    if(d.products.some(x=>x.slug===p.slug&&x.id!==p.id))p.slug+='-'+p.id.slice(-3);
    if(p._new){delete p._new;d.products.unshift(p)}
    save();toast('Produit enregistré');location.hash='#/produits';
  }
  else if(a==='del-product'){if(confirm('Supprimer ce produit ?')){d.products=d.products.filter(p=>p.id!==el.dataset.id);save();location.hash='#/produits'}}
  else if(a==='rm-cart'){d.carts=d.carts.filter(c=>c.id!==el.dataset.id);save();render()}
  else if(a==='send'||a==='ai-suggest'){
    const c=d.conversations.find(x=>x.id===el.dataset.id),inp=$('#reply');
    if(a==='ai-suggest'){inp.value=aiReply(c.msgs.filter(m=>m.from==='c').at(-1)?.text||'',d);inp.focus();return}
    if(!inp.value.trim())return;c.msgs.push({from:'me',text:inp.value.trim(),t:Date.now()});save();render();
  }
  else if(a==='save-shop'){const f=new FormData($('#shopf'));Object.assign(d.shop,Object.fromEntries(f));d.shop.slug=slugify(d.shop.name);d.shop.checklist.custom=true;save();toast('Boutique mise à jour');render()}
  else if(a==='save-px'){d.shop.pixels=Object.fromEntries(new FormData($('#pxf')));save();toast('Pixels enregistrés')}
  else if(a==='copy'){try{await navigator.clipboard.writeText(el.dataset.t);toast('Copié')}catch(_){toast('Copie impossible')}}
  else if(a==='send-fb'){const f=Object.fromEntries(new FormData($('#fbf')));if(!f.msg.trim())return;d.feedback.unshift({...f,t:Date.now()});save();render();toast('Merci !')}
  else if(a==='add-aff'){const f=Object.fromEntries(new FormData($('#aff')));if(!f.name||!f.code)return;f.code=f.code.toUpperCase().replace(/[^A-Z0-9]/g,'');if(d.affiliates.some(x=>x.code===f.code))return toast('Code déjà utilisé');d.affiliates.push({name:f.name,code:f.code,rate:+f.rate||10});save();render()}
  else if(a==='set-theme'){d.theme=el.dataset.v;save();applyTheme();render()}
  else if(a==='set-accent'){d.accent=el.dataset.v;save();applyTheme();render()}
  else if(a==='save-links'){d.shop.links=Object.fromEntries([...new FormData($('#lf'))].filter(([,v])=>/^https?:\/\//.test(v)));save();toast('Liens enregistrés')}
  else if(a==='export'){const b=new Blob([JSON.stringify(d,null,1)],{type:'application/json'}),u=document.createElement('a');u.href=URL.createObjectURL(b);u.download='shopflow-export.json';u.click()}
  else if(a==='reset'){if(confirm('Réinitialiser toutes les données de démo ?')){DB.reset();render()}}
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.id==='per'){sessionStorage.setItem('per',t.value);render()}
  else if(t.dataset.act==='status'){DB.setOrderStatus(t.dataset.id,t.value);toast('Statut mis à jour');renderSide('commandes')}
  else if(t.id==='aiauto'){DB.load().aiRules.auto=t.checked;save()}
  else if(t.id==='mkp'){const p=DB.product(t.value);$('#ads').innerHTML=adsHtml(p)}
  else if(t.id==='imgin'){
    const p=collectProduct();
    for(const f of [...t.files].slice(0,8-p.images.length)){try{p.images.push(await resizeImage(f))}catch(_){toast('Image illisible')}}
    $('#imgs').innerHTML=imgsHtml(p);t.value='';
  }
  else if(t.id==='aifile'&&t.files[0]){
    const f=t.files[0],m=modal('<h2>✨ Analyse de la photo…</h2><div class="progress"><b style="width:30%"></b></div>');
    try{
      const img=await resizeImage(f),name=f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim()||'Nouveau produit';
      const p=blankProduct();Object.assign(p,{title:name.charAt(0).toUpperCase()+name.slice(1),images:[img],hook:'Le choix malin pour se démarquer.',desc:`Découvrez ${name} : qualité soignée, livraison rapide et paiement à la réception.`,bullets:['Qualité premium','Livraison à domicile','Paiement à la réception','Garantie satisfaction 14 jours'],price:15000,compareAt:20000});
      p.blocks.reviews=false;
      await new Promise(r=>setTimeout(r,700));m.remove();window.__draft=p;toast('Fiche pré-remplie — vérifiez prix et textes');location.hash='#/produits/'+p.id;
    }catch(_){m.remove();toast('Image illisible')}
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.f==='title'){const s=$('#slugview');if(s)s.value=slugify(t.value)}
  if(t.dataset.f==='price'||t.dataset.f==='compareAt'){const pr=+document.querySelector('[data-f=price]').value,cp=+document.querySelector('[data-f=compareAt]').value;$('#disc').textContent=cp>pr&&pr>0?'-'+Math.round((1-pr/cp)*100)+'%':''}
});
$('#burger').onclick=()=>side.classList.toggle('open');
if(!location.hash)location.hash='#/dashboard';render();
setInterval(()=>{if(location.hash.startsWith('#/dashboard'))DB.data=null,DB.load(),render()},60000);
})();
