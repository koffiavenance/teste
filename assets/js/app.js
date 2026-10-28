/* ===== Bloom Shoes — boutique ===== */
(function () {
  'use strict';

  var DRAFT_KEY = 'bloom_brouillon';
  var track = function (n, d) { if (window.bloomTrack) window.bloomTrack(n, d); };
  var data = window.BLOOM_CATALOGUE;
  var preview = /[?&]apercu=1/.test(location.search);

  // Aperçu : affiche le brouillon enregistré depuis admin.html (uniquement sur cet appareil)
  if (preview) {
    try {
      var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        data = draft;
        var b = document.createElement('div');
        b.className = 'preview-banner';
        b.innerHTML = 'Mode aperçu : vous voyez le brouillon de l\'administration. <a href="admin.html">Retour à l\'administration</a>';
        document.body.prepend(b);
      }
    } catch (e) { /* stockage indisponible */ }
  }
  if (!data) return;

  var shop = data.boutique || {};
  var cats = data.categories || [];
  var prods = (data.produits || []).filter(function (p) { return p.nom; });
  var offres = shop.offres || {};
  var ess = offres.essentiel || { nom: 'Offre Essentielle' };
  var vip = offres.vip || { nom: 'Pack VIP Professionnel', contenu: [], supplement: 0 };
  var state = { cat: 'all', q: '', sort: '', offre: '' };
  var current = null;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n === null || n === undefined || n === '') return 'Prix sur demande';
    return Number(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' ' + (shop.devise || 'FCFA');
  }
  function vipPrice(p) {
    if (p.prixVIP !== null && p.prixVIP !== undefined && p.prixVIP !== '') return Number(p.prixVIP);
    if (p.prix === null || p.prix === undefined || p.prix === '') return null;
    return Number(p.prix) + Number(vip.supplement || 0);
  }
  function offerPrice(p, o) { return o === 'vip' ? vipPrice(p) : p.prix; }
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function catName(id) {
    var c = cats.find(function (x) { return x.id === id; });
    return c ? c.nom : '';
  }
  function waLink(text) {
    var num = String(shop.whatsapp || '').replace(/\D/g, '');
    return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* --- Infos boutique --- */
  $$('[data-wa]').forEach(function (a) {
    a.addEventListener('click', function () { track('contact'); });
    a.href = waLink('Bonjour ' + (shop.nom || 'Bloom Shoes') + ', je souhaite avoir des informations sur vos chaussures.');
  });
  $$('[data-tel]').forEach(function (el) { el.textContent = shop.telephone || ''; });
  $$('[data-adresse]').forEach(function (el) { el.textContent = shop.adresse || ''; });
  $$('[data-call]').forEach(function (a) { a.href = 'tel:+' + String(shop.whatsapp || '').replace(/\D/g, ''); });
  $$('[data-shop]').forEach(function (el) {
    var v = getPath(shop, el.dataset.shop);
    if (v !== undefined && v !== null && v !== '') el.textContent = v;
  });
  $('#year').textContent = new Date().getFullYear();

  /* --- Section « Nos offres » --- */
  $$('[data-offre-nom="essentiel"]').forEach(function (el) { el.textContent = ess.nom; });
  $$('[data-offre-nom="vip"]').forEach(function (el) { el.textContent = vip.nom; });
  if (ess.description) $('[data-offre-desc]').textContent = ess.description;
  $('#vip-contenu').innerHTML = (vip.contenu || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
  if (vip.image) $('#vip-visual').innerHTML = '<img src="' + esc(vip.image) + '" alt="' + esc(vip.nom) + '" loading="lazy">';
  function minPrice(o) {
    var v = prods.map(function (p) { return offerPrice(p, o); }).filter(function (n) { return n !== null && !isNaN(n); });
    return v.length ? Math.min.apply(null, v) : null;
  }
  $('[data-offre-min="essentiel"]').textContent = money(minPrice('essentiel'));
  $('[data-offre-min="vip"]').textContent = money(minPrice('vip'));
  $$('[data-choisir]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.offre = b.dataset.choisir;
      renderOfferBanner();
      $('#boutique').scrollIntoView({ behavior: 'smooth' });
    });
  });
  var banner = document.createElement('div');
  banner.className = 'offer-banner';
  banner.hidden = true;
  $('#grid').before(banner);
  function renderOfferBanner() {
    banner.hidden = !state.offre;
    if (!state.offre) return;
    banner.innerHTML = 'Offre choisie : <b>' + esc(state.offre === 'vip' ? vip.nom : ess.nom) + '</b>. Cliquez maintenant sur le modèle de votre choix. <button type="button">Changer</button>';
    $('button', banner).onclick = function () { state.offre = ''; renderOfferBanner(); $('#offres').scrollIntoView({ behavior: 'smooth' }); };
  }
  $('#stat-produits').textContent = prods.length;
  $('#stat-categories').textContent = cats.length;

  /* --- Mots animés du hero --- */
  var words = ['mocassins', 'richelieus', 'bottines Chelsea', 'loafers', 'modèles en daim'];
  var wi = 0, rot = $('#rotator');
  setInterval(function () {
    wi = (wi + 1) % words.length;
    rot.innerHTML = '<span>' + words[wi] + '</span>';
  }, 2600);

  /* --- Catégories --- */
  $('#cats').innerHTML = cats.map(function (c) {
    var n = prods.filter(function (p) { return p.categorie === c.id; }).length;
    return '<button class="cat reveal" data-cat="' + esc(c.id) + '">' +
      '<img src="' + esc(c.image) + '" alt="' + esc(c.nom) + '" loading="lazy">' +
      '<div class="cat__info"><h3>' + esc(c.nom) + '</h3><p>' + esc(c.description) + '</p>' +
      '<span class="cat__count">' + n + ' modèle' + (n > 1 ? 's' : '') + '</span></div></button>';
  }).join('');
  $$('.cat').forEach(function (el) {
    el.addEventListener('click', function () {
      setCat(el.dataset.cat);
      $('#boutique').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* --- Filtres --- */
  $('#chips').innerHTML = '<button class="chip is-active" data-cat="all">Tous</button>' +
    cats.map(function (c) { return '<button class="chip" data-cat="' + esc(c.id) + '">' + esc(c.nom) + '</button>'; }).join('');
  $$('.chip').forEach(function (el) { el.addEventListener('click', function () { setCat(el.dataset.cat); }); });
  function setCat(id) {
    state.cat = id;
    $$('.chip').forEach(function (c) { c.classList.toggle('is-active', c.dataset.cat === id); });
    render();
  }
  $('#search').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
  $('#sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });

  /* --- Grille produits --- */
  function render() {
    var list = prods.filter(function (p) {
      if (state.cat !== 'all' && p.categorie !== state.cat) return false;
      if (state.q) {
        var hay = (p.nom + ' ' + p.description + ' ' + (p.couleurs || []).join(' ') + ' ' + catName(p.categorie)).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    });
    if (state.sort === 'asc') list.sort(function (a, b) { return (a.prix || 0) - (b.prix || 0); });
    if (state.sort === 'desc') list.sort(function (a, b) { return (b.prix || 0) - (a.prix || 0); });
    if (state.sort === 'az') list.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });

    $('#empty').hidden = list.length > 0;
    $('#grid').innerHTML = list.map(function (p, i) {
      var badge = p.disponible === false ? '<span class="badge badge--off">Épuisé</span>' : (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '');
      var old = p.ancienPrix ? '<s>' + money(p.ancienPrix) + '</s>' : '';
      return '<article class="card" style="animation-delay:' + Math.min(i * 45, 500) + 'ms" data-id="' + esc(p.id) + '" tabindex="0" role="button" aria-label="Commander ' + esc(p.nom) + '">' +
        '<div class="card__media"><img src="' + esc(p.image) + '" alt="' + esc(p.nom) + '" width="400" height="400" loading="' + (i < 4 ? 'eager' : 'lazy') + '" decoding="async">' + badge +
        '<span class="card__quick btn btn--orange btn--block">Commander</span></div>' +
        '<div class="card__body"><span class="card__cat">' + esc(catName(p.categorie)) + '</span>' +
        '<h3 class="card__name">' + esc(p.nom) + '</h3>' +
        '<div class="swatches">' + (p.couleurs || []).slice(0, 3).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' +
        (vipPrice(p) !== null ? '<span class="card__vip">' + esc(vip.nom) + ' : <b>' + money(vipPrice(p)) + '</b></span>' : '') +
        '<div class="card__foot"><span class="price">' + money(p.prix) + old + '</span><span class="card__btn" aria-hidden="true">+</span></div></div></article>';
    }).join('');
  }
  $('#grid').addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card) openModal(card.dataset.id);
  });
  $('#grid').addEventListener('keydown', function (e) {
    var card = e.target.closest('.card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModal(card.dataset.id); }
  });
  render();

  /* --- Fenêtre de commande --- */
  var modal = $('#modal'), form = $('#order'), lastFocus = null;
  function openModal(id) {
    var p = prods.find(function (x) { return x.id === id; });
    if (!p) return;
    current = p;
    track('voir_produit', { id: p.id, nom: p.nom, prix: p.prix });
    lastFocus = document.activeElement;
    $('#m-img').src = p.image;
    $('#m-img').alt = p.nom;
    $('#m-cat').textContent = catName(p.categorie);
    $('#m-nom').textContent = p.nom;
    $('#m-prix-ess').textContent = money(p.prix);
    $('#m-prix-vip').textContent = money(vipPrice(p));
    var choix = state.offre || 'essentiel';
    $$('input[name=offre]').forEach(function (r) { r.checked = r.value === choix; });
    updateModalPrice();
    $('#m-desc').textContent = p.description || '';
    var cols = (p.couleurs && p.couleurs.length ? p.couleurs : ['Noir', 'Marron']).concat(['Autre (préciser)']);
    $('#m-couleur').innerHTML = '<option value="">Choisir…</option>' + cols.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    if (p.couleurs && p.couleurs.length === 1) $('#m-couleur').value = p.couleurs[0];
    var sizes = shop.pointures && shop.pointures.length ? shop.pointures : [39, 40, 41, 42, 43, 44, 45, 46];
    $('#m-pointure').innerHTML = '<option value="">Choisir…</option>' + sizes.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '<option value="Je ne sais pas, conseillez-moi">Je ne sais pas</option>';
    $('#form-error').hidden = true;
    $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });
    restoreClient();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('[name=nom]', form).focus({ preventScroll: true }); }, 50);
  }
  function updateModalPrice() {
    if (!current) return;
    var o = $('input[name=offre]:checked').value;
    var old = o === 'essentiel' && current.ancienPrix ? ' <s style="color:#9ca3af;font-weight:400;font-size:.9rem">' + money(current.ancienPrix) + '</s>' : '';
    $('#m-prix').innerHTML = money(offerPrice(current, o)) + old + ' <small style="font-size:.8rem;color:#6b7280;font-weight:500">· ' + esc(o === 'vip' ? vip.nom : ess.nom) + '</small>';
  }
  $$('input[name=offre]').forEach(function (r) { r.addEventListener('change', updateModalPrice); });
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Mémorise les coordonnées du client sur son appareil pour ses prochaines commandes
  var CLIENT_KEY = 'bloom_client';
  function restoreClient() {
    try {
      var c = JSON.parse(localStorage.getItem(CLIENT_KEY) || '{}');
      ['nom', 'prenom', 'telephone', 'ville'].forEach(function (k) { if (c[k] && !form[k].value) form[k].value = c[k]; });
    } catch (e) { /* ignore */ }
  }

  form.addEventListener('input', function (e) {
    if (e.target.classList.contains('is-invalid') && e.target.value.trim()) e.target.classList.remove('is-invalid');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    $$('[required]', form).forEach(function (el) {
      var bad = !el.value.trim() || (el.name === 'telephone' && el.value.replace(/\D/g, '').length < 8);
      el.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    $('#form-error').hidden = ok;
    if (!ok) { var first = $('.is-invalid', form); if (first) first.focus(); return; }

    var f = form.elements;
    var qte = Math.max(1, parseInt(f.quantite.value, 10) || 1);
    var o = $('input[name=offre]:checked').value;
    var prix = offerPrice(current, o);
    var offreTxt = o === 'vip' ? vip.nom + ' : ' + (vip.contenu || []).join(', ') : ess.nom + ' (chaussure seule)';
    var lines = [
      '*NOUVELLE COMMANDE — ' + (shop.nom || 'Bloom Shoes').toUpperCase() + '*',
      '',
      '*Produit :* ' + current.nom,
      '*Catégorie :* ' + catName(current.categorie),
      '*Offre :* ' + offreTxt,
      '*Prix :* ' + money(prix) + (qte > 1 && prix !== null ? ' × ' + qte + ' = ' + money(prix * qte) : ''),
      '*Couleur :* ' + f.couleur.value,
      '*Pointure :* ' + f.pointure.value,
      '*Quantité :* ' + qte,
      '*Confort souhaité :* ' + f.confort.value,
      '',
      '*Client*',
      'Nom : ' + f.nom.value.trim(),
      'Prénom : ' + f.prenom.value.trim(),
      'Téléphone / WhatsApp : ' + f.telephone.value.trim(),
      'Ville : ' + f.ville.value.trim()
    ];
    if (f.details.value.trim()) lines.push('', '*Description :* ' + f.details.value.trim());
    lines.push('', 'Réf. : ' + current.id);

    try {
      localStorage.setItem(CLIENT_KEY, JSON.stringify({ nom: f.nom.value, prenom: f.prenom.value, telephone: f.telephone.value, ville: f.ville.value }));
    } catch (err) { /* ignore */ }

    track('commande', { id: current.id, nom: current.nom + ' — ' + (o === 'vip' ? vip.nom : ess.nom), prix: (prix || 0) * qte });
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    closeModal();
    form.details.value = '';
    toast('Merci ! Votre commande est prête dans WhatsApp, appuyez sur « Envoyer ».');
  });

  /* --- Bandeau d'actualité : met en avant de vrais produits et services de la boutique --- */
  (function () {
    var live = $('#live'), body = $('#live-body');
    var closed = false;
    try { closed = sessionStorage.getItem('bloom_live_off') === '1'; } catch (e) { /* ignore */ }
    if (closed || !prods.length) return;
    var msgs = [];
    prods.forEach(function (p) {
      if (p.disponible === false) return;
      var label = p.badge || 'Disponible';
      msgs.push({ id: p.id, img: p.image, tag: label, html: '<b>' + esc(p.nom) + '</b> à ' + money(p.prix) + (p.couleurs && p.couleurs.length > 1 ? ', en ' + p.couleurs.length + ' coloris' : '') });
    });
    var extra = [
      { img: 'images/site/favicon.png', tag: vip.nom, html: esc((vip.contenu || []).join(' + ')) + '. <b>Commandez-le en un clic.</b>', go: '#offres' },
      { img: 'images/site/favicon.png', tag: 'Livraison', html: 'Livraison à Abidjan en <b>' + esc(getPath(shop, 'livraison.abidjan') || '24 à 48 heures') + '</b>.', go: '#offres' },
      { img: 'images/site/favicon.png', tag: 'Satisfait ou remboursé', html: '<b>' + esc(getPath(shop, 'retours.jours') || 7) + ' jours</b> pour changer d\'avis.', go: 'livraison-retours.html' }
    ];
    // Mélange : les produits mis en avant (étiquette) d'abord, puis le reste, avec les infos boutique intercalées
    msgs.sort(function (a, b) { return (b.tag !== 'Disponible') - (a.tag !== 'Disponible') || Math.random() - .5; });
    var list = [];
    msgs.forEach(function (m, i) { list.push(m); if (i % 3 === 1 && extra.length) list.push(extra.shift()); });
    list = list.concat(extra);
    var i = 0, timer;
    function show() {
      var m = list[i++ % list.length];
      body.innerHTML = '<img src="' + esc(m.img) + '" alt=""><div><small>' + esc(m.tag) + '</small><p>' + m.html + '</p></div>';
      body.onclick = function () {
        if (m.id) openModal(m.id);
        else if (m.go.charAt(0) === '#') $(m.go).scrollIntoView({ behavior: 'smooth' });
        else location.href = m.go;
      };
      live.classList.remove('is-out');
      live.hidden = false;
      live.style.animation = 'none'; void live.offsetWidth; live.style.animation = '';
      timer = setTimeout(function () {
        live.classList.add('is-out');
        timer = setTimeout(show, 5000);
      }, 7000);
    }
    $('.live__close', live).addEventListener('click', function () {
      clearTimeout(timer);
      live.hidden = true;
      try { sessionStorage.setItem('bloom_live_off', '1'); } catch (e) { /* ignore */ }
    });
    setTimeout(show, 6000);
  })();

  /* --- Fenêtre quand le visiteur veut quitter le site (une fois par visite) --- */
  (function () {
    var box = $('#exit'), shown = false, start = Date.now();
    var pop = shop.popup || {};
    if (pop.titre) $('#exit-titre').textContent = pop.titre;
    $('#exit-texte').textContent = pop.texte || '';
    try { shown = sessionStorage.getItem('bloom_exit') === '1'; } catch (e) { /* ignore */ }
    function open() {
      if (shown || !modal.hidden || Date.now() - start < 8000) return;
      shown = true;
      try { sessionStorage.setItem('bloom_exit', '1'); } catch (e) { /* ignore */ }
      box.hidden = false;
    }
    $$('[data-exit-close]', box).forEach(function (el) { el.addEventListener('click', function () { box.hidden = true; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.hidden = true; });
    // Ordinateur : la souris sort par le haut de la fenêtre (vers les onglets / la croix)
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) open(); });
    // Téléphone : remontée rapide vers le haut après avoir parcouru la page, ou retour sur l'onglet
    var samples = [], maxY = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, t = Date.now();
      maxY = Math.max(maxY, y);
      samples.push([t, y]);
      while (samples.length && t - samples[0][0] > 500) samples.shift();
      var up = samples.length ? samples[0][1] - y : 0;
      if (maxY > window.innerHeight * 1.5 && up > window.innerHeight * 0.9 && y < maxY * 0.6) open();
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - start > 20000) open();
    });
  })();

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.hidden = true; }, 5000);
  }

  /* --- Header, menu mobile, navigation active --- */
  var header = $('#header'), burger = $('#burger'), nav = $('#nav');
  window.addEventListener('scroll', function () { header.classList.toggle('is-scrolled', window.scrollY > 10); }, { passive: true });
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    nav.classList.toggle('is-open', open);
  });
  $$('a', nav).forEach(function (a) {
    a.addEventListener('click', function () { burger.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); });
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); });

    var links = $$('a', nav);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }
})();
