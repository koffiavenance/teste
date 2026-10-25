/* ShopFlow — couche de données (localStorage). Prototype sans serveur :
   remplacer DB.load/DB.save par des appels API pour passer en production. */
(function(){
const KEY='shopflow.v1';
const THEMES={violet:['#4C1D95','#7C3AED'],indigo:['#312E81','#6366F1'],rose:['#9D174D','#EC4899'],emeraude:['#065F46','#10B981']};

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uid(p='id'){return p+'_'+Math.random().toString(36).slice(2,9)}
function fmt(n){return new Intl.NumberFormat('fr-FR').format(Math.round(n||0)).replace(/ | /g,' ')+' XOF'}
function slugify(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function discountPct(p){return p.compareAt>p.price?Math.round((1-p.price/p.compareAt)*100):0}
function placeholder(label,i=0){
  const hues=[262,272,282,252,292,242,302,232][i%8];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hues},60%,28%)"/><stop offset="1" stop-color="hsl(${hues+20},70%,52%)"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><text x="400" y="420" font-size="190" text-anchor="middle">👞</text><text x="400" y="640" font-size="38" fill="#fff" fill-opacity=".85" text-anchor="middle" font-family="sans-serif">${esc(label).slice(0,28)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function bundleTotal(p,b){const raw=p.price*b.qty;return Math.round(raw*(1-(b.discount||0)/100))}

const ALL_BLOCKS=[
  ['quantity','Sélecteur de quantité (offres groupées)'],['urgency','Urgence (compte à rebours, stock, visiteurs)'],
  ['steps','Étapes de livraison'],['guarantee','Garantie'],['reviews','Témoignages / avis clients'],
  ['timeline','Timeline / guide d’entretien'],['highlights','Points forts'],['demo','Démo produit (vidéo)'],
  ['comparison','Comparaison'],['results','Résultats'],['faq','FAQ'],['final','Appel final & produits associés']];

function seed(){
  const mk=(o,i)=>Object.assign({
    id:uid('p'),status:'active',stock:24,lowStock:5,shipping:0,badge:'',collection:'Chaussures homme',variants:[],rating:4.9,ratingCount:2000,urgencyMinutes:15,
    images:[placeholder(o.title,i),placeholder(o.title+' — détail',i+3)],
    blocks:{quantity:true,urgency:true,steps:true,guarantee:true,reviews:true,timeline:true,highlights:true,demo:false,comparison:false,results:false,faq:true,final:true},
    bundles:[{qty:1,discount:0,badge:''},{qty:2,discount:10,badge:'Plus populaire'},{qty:3,discount:15,badge:'Meilleure offre'}],
    bullets:['Cuir lisse premium au rendu impeccable','Coupe oxford classique, style intemporel','Semelle robuste pour un port prolongé','Convient costume, tenue de soirée et bureau'],
    guarantee:'Garantie 14 jours — essayez ce produit en toute confiance. Pas satisfait ? Échange simple.',
    deliveryInfo:'Livraison à domicile, paiement à la réception : vous ne payez qu’une fois le colis en main.',
    steps:['Remplissez le formulaire rapide','On prépare votre colis sous 24h','Livraison chez vous, payez à la réception'],
    reviews:[{name:'Kozassi A.',rating:5,text:'Très belle finition, livré en 2 jours. Je recommande.'},{name:'Bamba D.',rating:5,text:'Le cuir est top, confortable dès le premier jour.'},{name:'Yas F.',rating:4,text:'Conforme aux photos. Bon rapport qualité/prix.'}],
    timeline:['Dépoussiérer','Nourrir le cuir','Lustrer','Laisser sécher','Ranger avec embauchoir'],
    highlights:['Un style qui impose le respect au bureau','Confort pensé pour la journée entière','Finitions soignées, cuir sélectionné'],
    comparison:[['Cuir véritable','✓','✗'],['Semelle renforcée','✓','✗'],['Paiement à la livraison','✓','✗']],
    faq:[['La chaussure est-elle entièrement en cuir véritable ?','Oui, le dessus est en cuir lisse de qualité.'],['Comment choisir ma pointure ?','Prenez votre pointure habituelle ; en cas de doute, notre équipe vous conseille sur WhatsApp.'],['Comment se passe la livraison et le paiement ?','Nous livrons chez vous et vous payez à la réception.'],['Puis-je les porter tous les jours au bureau ?','Oui, elles sont conçues pour un usage quotidien.']],
    created:Date.now()-i*86400000
  },o);
  const products=[
    mk({title:'Richelieu Wholecut Noir',hook:'Élégance absolue : le richelieu qui impose le respect.',price:30000,compareAt:40000,desc:'Le richelieu en cuir lisse noir qui s’impose au bureau comme en soirée.',badge:'Best-seller'},0),
    mk({title:'Mocassin Cuir Marron',hook:'Le confort chic au quotidien.',price:24000,compareAt:30000,desc:'Mocassin souple en cuir marron, idéal pour toutes vos journées.',stock:3},1),
    mk({title:'Derby Bordeaux',hook:'La touche de couleur qui change tout.',price:27500,compareAt:0,desc:'Derby bordeaux patiné, un classique revisité.',status:'draft',stock:12},2)];
  products.forEach(p=>p.slug=slugify(p.title));
  const names=[['Awa Koné','+225 07 11 22 33 44','Abidjan'],['Jean Yao','+225 05 44 33 22 11','Yamoussoukro'],['Moussa Traoré','+225 01 98 76 54 32','Bouaké']];
  const sts=['to_confirm','to_ship','shipping'];
  const orders=names.map((c,i)=>({id:'CMD-'+(1001+i),pid:products[i%2].id,title:products[i%2].title,qty:1+i%2,total:products[i%2].price*(1+i%2),customer:c[0],phone:c[1],place:c[2],status:sts[i],created:Date.now()-i*3600e3*7,reserved:sts[i]!=='to_confirm',note:''}));
  return {
    v:1,theme:'light',accent:'violet',
    shop:{name:'Bloom Shoes',slug:'bloom-shoes',active:false,activationFee:1500,countryCode:'+225',whatsapp:'+2250748110942',currency:'XOF',tagline:'Chaussures en cuir pour homme',checklist:{}},
    products,orders,carts:[{id:uid('c'),name:'Koffi B.',phone:'+225 07 55 66 77 88',pid:products[0].id,title:products[0].title,total:30000,created:Date.now()-5400e3,recovered:false}],
    conversations:[{id:uid('m'),customer:'Awa Koné',phone:'+225 07 11 22 33 44',msgs:[{from:'c',text:'Bonjour, vous livrez à Cocody ?',t:Date.now()-3e6}]}],
    stats:{visits:{},online:{}},affiliates:[],feedback:[],aiRules:{auto:true,tone:'chaleureux',hours:'8h–20h'}
  };
}

const DB={
  data:null,
  load(){
    if(this.data) return this.data;
    try{const raw=localStorage.getItem(KEY);this.data=raw?JSON.parse(raw):null}catch(e){this.data=null}
    if(!this.data){this.data=seed();this.save()}
    return this.data;
  },
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.data))}catch(e){console.warn('Stockage plein',e);return false}return true},
  reset(){this.data=seed();this.save()},
  product(idOrSlug){return this.load().products.find(p=>p.id===idOrSlug||p.slug===idOrSlug)},
  /* Stock : réservé quand la commande passe « à expédier », restitué si annulée. */
  setOrderStatus(id,status){
    const d=this.load(),o=d.orders.find(x=>x.id===id);if(!o)return;
    const p=d.products.find(x=>x.id===o.pid);
    if(['to_ship','shipping','delivered'].includes(status)&&!o.reserved){if(p)p.stock=Math.max(0,p.stock-o.qty);o.reserved=true}
    if(['cancelled','unreachable','to_confirm'].includes(status)&&o.reserved){if(p)p.stock+=o.qty;o.reserved=false}
    o.status=status;this.save();
  },
  placeOrder({pid,qty,name,phone,place}){
    const d=this.load(),p=this.product(pid);if(!p) throw new Error('Produit introuvable');
    const b=p.bundles.find(x=>x.qty===qty)||{qty,discount:0};
    const o={id:'CMD-'+(1001+d.orders.length),pid:p.id,title:p.title,qty,total:bundleTotal(p,b)+(p.shipping||0),customer:name,phone,place,status:'to_confirm',created:Date.now(),reserved:false,note:''};
    d.orders.unshift(o);
    d.carts=d.carts.filter(c=>c.phone!==phone);
    this.save();return o;
  },
  trackVisit(){
    const d=this.load(),day=new Date().toISOString().slice(0,10);
    if(!sessionStorage.getItem('sf_visit_'+day)){d.stats.visits[day]=(d.stats.visits[day]||0)+1;try{sessionStorage.setItem('sf_visit_'+day,'1')}catch(e){}}
    const sid=sessionStorage.getItem('sf_sid')||uid('s');try{sessionStorage.setItem('sf_sid',sid)}catch(e){}
    d.stats.online[sid]=Date.now();this.save();
  },
  onlineCount(){const d=this.load(),now=Date.now();return Object.values(d.stats.online).filter(t=>now-t<5*60e3).length}
};
function applyTheme(){
  const d=DB.load(),r=document.documentElement;
  const dark=d.theme==='dark'||(d.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  r.dataset.theme=dark?'dark':'light';
  const a=THEMES[d.accent]||THEMES.violet;
  r.style.setProperty('--p-700',a[0]);r.style.setProperty('--p-600',a[0]);r.style.setProperty('--p-500',a[1]);
}
window.SF={DB,esc,uid,fmt,slugify,discountPct,placeholder,bundleTotal,ALL_BLOCKS,THEMES,applyTheme};
applyTheme();
})();
