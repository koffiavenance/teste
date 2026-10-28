/* ===== Bloom Shoes — administration du catalogue ===== */
(function () {
  'use strict';

  var DRAFT_KEY = 'bloom_brouillon';
  var GH_KEY = 'bloom_github';
  var live = window.BLOOM_CATALOGUE || { boutique: {}, categories: [], produits: [] };
  var data = clone(live);

  try {
    var saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (saved && saved.produits) data = saved;
  } catch (e) { /* stockage indisponible */ }

  // Brouillon créé avant une mise à jour du site : on ajoute les nouveaux réglages sans toucher aux modifications
  (function migrate(dst, src) {
    Object.keys(src).forEach(function (k) {
      if (dst[k] === undefined) dst[k] = clone(src[k]);
      else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') migrate(dst[k], src[k]);
    });
  })(data.boutique = data.boutique || {}, live.boutique || {});
  if (data.boutique.adresse === 'Abidjan, Jamé') data.boutique.adresse = live.boutique.adresse;
  data.produits.forEach(function (p) { if (p.prixVIP === undefined) p.prixVIP = null; });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'element';
  }
  function uid(base) { return slug(base) + '-' + Date.now().toString(36).slice(-4); }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.hidden = true; }, 4000);
  }

  /* --- Enregistrement automatique du brouillon --- */
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch (e) {
        toast('Mémoire du navigateur pleine : publiez vos modifications pour libérer de la place.');
      }
      updateStatus();
    }, 250);
  }
  function updateStatus() {
    var dirty = JSON.stringify(data) !== JSON.stringify(live);
    var s = $('#status');
    s.textContent = dirty ? 'Modifications non publiées' : 'À jour';
    s.classList.toggle('is-dirty', dirty);
  }

  /* --- Images : redimensionnées dans le navigateur avant envoi --- */
  function readImage(file, cb, noMark) {
    if (!file || !/^image\//.test(file.type)) { toast('Choisissez une image (JPG, PNG…).'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1000, w = img.width, h = img.height, r = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * r); c.height = Math.round(h * r);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        if (noMark || data.boutique.filigrane === false) { cb(c.toDataURL('image/jpeg', 0.82)); return; }
        // Logo Bloom Shoes ajouté automatiquement en bas à droite (mêmes proportions que les photos d'origine)
        var mark = new Image();
        mark.onload = function () {
          var lw = Math.round(c.width * 0.30), lh = Math.round(lw * mark.height / mark.width), mg = Math.round(c.width * 0.025);
          var x = c.width - lw - mg, y = c.height - lh - mg;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
          ctx.drawImage(mark, x, y, lw, lh);
          ctx.restore();
          cb(c.toDataURL('image/jpeg', 0.82));
        };
        mark.onerror = function () { cb(c.toDataURL('image/jpeg', 0.82)); };
        mark.src = 'images/site/filigrane.png';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* --- Onglets --- */
  $$('.a-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.a-tab').forEach(function (x) { x.classList.toggle('is-active', x === b); });
      $$('.panel').forEach(function (p) { p.hidden = p.id !== 'p-' + b.dataset.tab; });
    });
  });

  /* --- Produits --- */
  var fCat = $('#filter-cat'), fQ = $('#filter-q');
  function catOptions(selected, withAll) {
    return (withAll ? '<option value="">Toutes les catégories</option>' : '') +
      data.categories.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.nom) + '</option>';
      }).join('');
  }
  function renderProducts() {
    var keep = fCat.value;
    fCat.innerHTML = catOptions(keep, true);
    var q = fQ.value.trim().toLowerCase();
    var list = data.produits.filter(function (p) {
      return (!fCat.value || p.categorie === fCat.value) && (!q || (p.nom + ' ' + p.description).toLowerCase().indexOf(q) !== -1);
    });
    $('#prod-count').textContent = list.length + ' / ' + data.produits.length + ' produit(s)';
    $('#prod-list').innerHTML = list.map(function (p) {
      return '<article class="item" data-id="' + esc(p.id) + '">' +
        '<div class="item__img"><img src="' + esc(p.image) + '" alt=""><label>Changer l\'image<input type="file" accept="image/*" data-img></label></div>' +
        '<div class="fields">' +
          '<label class="w6">Nom du produit<input data-k="nom" value="' + esc(p.nom) + '"></label>' +
          '<label>Catégorie<select data-k="categorie">' + catOptions(p.categorie) + '</select></label>' +
          '<label class="half">Prix (' + esc(data.boutique.devise || 'FCFA') + ')<input data-k="prix" type="number" min="0" step="500" value="' + esc(p.prix) + '"></label>' +
          '<label class="half">Ancien prix (promo)<input data-k="ancienPrix" type="number" min="0" step="500" value="' + esc(p.ancienPrix) + '" placeholder="Optionnel"></label>' +
          '<label class="w3">Prix Pack VIP (chaussure + chaussettes + kit cirage)<input data-k="prixVIP" type="number" min="0" step="500" value="' + esc(p.prixVIP) + '" placeholder="' + esc(vipPlaceholder(p)) + '"></label>' +
          '<label class="w3">Couleurs disponibles (séparées par des virgules)<input data-k="couleurs" value="' + esc((p.couleurs || []).join(', ')) + '"></label>' +
          '<label class="half">Étiquette<input data-k="badge" value="' + esc(p.badge) + '" placeholder="Nouveau, Promo…"></label>' +
          '<label class="check half"><input type="checkbox" data-k="disponible"' + (p.disponible !== false ? ' checked' : '') + '> En stock</label>' +
          '<label class="w6">Description<textarea data-k="description" rows="2">' + esc(p.description) + '</textarea></label>' +
        '</div>' +
        '<div class="item__actions">' +
          '<button class="mini" data-act="up">↑ Monter</button><button class="mini" data-act="down">↓ Descendre</button>' +
          '<button class="mini" data-act="dup">Dupliquer</button><button class="mini mini--danger" data-act="del">Supprimer</button>' +
        '</div></article>';
    }).join('') || '<p class="counter">Aucun produit. Cliquez sur « Ajouter un produit ».</p>';
  }
  function vipPlaceholder(p) {
    var sup = Number((((data.boutique.offres || {}).vip || {}).supplement) || 0);
    return p.prix ? 'Vide = ' + (Number(p.prix) + sup).toLocaleString('fr-FR') + ' (prix + supplément)' : 'Prix + supplément VIP';
  }
  function findProd(el) {
    var id = el.closest('.item').dataset.id;
    return data.produits.find(function (p) { return p.id === id; });
  }
  $('#prod-list').addEventListener('input', function (e) {
    var k = e.target.dataset.k; if (!k) return;
    var p = findProd(e.target), v = e.target.value;
    if (k === 'prix' || k === 'ancienPrix' || k === 'prixVIP') p[k] = v === '' ? null : Number(v);
    else if (k === 'couleurs') p[k] = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (k === 'disponible') p[k] = e.target.checked;
    else p[k] = v;
    save();
  });
  $('#prod-list').addEventListener('change', function (e) {
    if (e.target.dataset.k === 'categorie') { renderProducts(); renderCats(); }
    if (e.target.dataset.k === 'disponible') { findProd(e.target).disponible = e.target.checked; save(); }
    if (e.target.hasAttribute('data-img')) {
      var p = findProd(e.target);
      readImage(e.target.files[0], function (url) { p.image = url; save(); renderProducts(); toast('Image mise à jour.'); });
    }
  });
  $('#prod-list').addEventListener('click', function (e) {
    var act = e.target.dataset.act; if (!act) return;
    var p = findProd(e.target), i = data.produits.indexOf(p);
    if (act === 'del') {
      if (!confirm('Supprimer « ' + p.nom + ' » ?')) return;
      data.produits.splice(i, 1);
    } else if (act === 'dup') {
      var c = clone(p); c.id = uid(p.nom); c.nom = p.nom + ' (copie)';
      data.produits.splice(i + 1, 0, c);
    } else if (act === 'up' && i > 0) {
      data.produits.splice(i - 1, 0, data.produits.splice(i, 1)[0]);
    } else if (act === 'down' && i < data.produits.length - 1) {
      data.produits.splice(i + 1, 0, data.produits.splice(i, 1)[0]);
    }
    save(); renderProducts(); renderCats();
  });
  $('#add-prod').addEventListener('click', function () {
    if (!data.categories.length) { toast('Créez d\'abord une catégorie.'); return; }
    data.produits.unshift({
      id: uid('nouveau-produit'), nom: 'Nouveau produit', categorie: fCat.value || data.categories[0].id,
      prix: null, ancienPrix: null, description: '', couleurs: ['Noir'], image: 'images/site/favicon.png', badge: 'Nouveau', disponible: true
    });
    fQ.value = '';
    save(); renderProducts(); renderCats();
    var first = $('#prod-list .item input[data-k="nom"]');
    if (first) { first.focus(); first.select(); }
  });
  fCat.addEventListener('change', renderProducts);
  fQ.addEventListener('input', renderProducts);

  /* --- Vitrine animée --- */
  function vit() {
    var b = data.boutique;
    if (!b.vitrine) b.vitrine = { eyebrow: 'Nouveautés', titre: 'La collection en mouvement', texte: '', items: [] };
    if (!b.vitrine.items) b.vitrine.items = [];
    return b.vitrine;
  }
  function renderVit() {
    var v = vit();
    $$('[data-v]').forEach(function (el) { if (document.activeElement !== el) el.value = v[el.dataset.v] || ''; });
    $('#vit-count').textContent = v.items.length + ' carte(s)';
    $('#vit-list').innerHTML = v.items.map(function (it) {
      return '<article class="item" data-id="' + esc(it.id) + '">' +
        '<div class="item__img"><img src="' + esc(it.image) + '" alt=""><label>Changer la photo<input type="file" accept="image/*" data-img></label></div>' +
        '<div class="fields">' +
          '<label class="w6">Titre<input data-k="titre" value="' + esc(it.titre) + '"></label>' +
          '<label class="w6">Texte<input data-k="texte" value="' + esc(it.texte) + '"></label>' +
          '<label class="w6">Mini-vidéo (facultatif)' +
            '<span style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">' +
              (it.video ? '<span style="font-size:.85rem;color:#166534">✓ Vidéo ajoutée : ' + esc(it.video.split('/').pop()) + '</span><button type="button" class="mini mini--danger" data-act="novideo">Retirer la vidéo</button>' : '<span style="font-size:.85rem;color:#9ca3af">Aucune vidéo : la photo bouge doucement.</span>') +
              '<input type="file" accept="video/mp4,video/webm,video/quicktime" data-video style="width:auto"></span></label>' +
        '</div>' +
        '<div class="item__actions"><button class="mini" data-act="up">↑ Monter</button><button class="mini" data-act="down">↓ Descendre</button><button class="mini mini--danger" data-act="del">Supprimer</button></div></article>';
    }).join('') || '<p class="counter">Aucune carte : la section est masquée sur le site.</p>';
  }
  function findVit(el) {
    var id = el.closest('.item').dataset.id;
    return vit().items.find(function (x) { return x.id === id; });
  }
  $('#p-vitrine').addEventListener('input', function (e) {
    if (e.target.dataset.v) { vit()[e.target.dataset.v] = e.target.value; save(); return; }
    if (e.target.dataset.k) { findVit(e.target)[e.target.dataset.k] = e.target.value; save(); }
  });
  $('#p-vitrine').addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-img')) {
      var it = findVit(t);
      readImage(t.files[0], function (url) { it.image = url; save(); renderVit(); toast('Photo mise à jour.'); }, true);
    } else if (t.hasAttribute('data-video')) {
      uploadVideo(t.files[0], findVit(t));
    }
  });
  $('#p-vitrine').addEventListener('click', function (e) {
    var act = e.target.dataset.act; if (!act) return;
    var items = vit().items, it = findVit(e.target), i = items.indexOf(it);
    if (act === 'del') { if (!confirm('Supprimer cette carte ?')) return; items.splice(i, 1); }
    else if (act === 'novideo') it.video = '';
    else if (act === 'up' && i > 0) items.splice(i - 1, 0, items.splice(i, 1)[0]);
    else if (act === 'down' && i < items.length - 1) items.splice(i + 1, 0, items.splice(i, 1)[0]);
    save(); renderVit();
  });
  $('#add-vit').addEventListener('click', function () {
    vit().items.unshift({ id: uid('carte'), titre: 'Nouvelle carte', texte: '', image: 'images/site/vitrine.jpg', video: '' });
    save(); renderVit();
    var f = $('#vit-list input[data-k="titre"]'); if (f) { f.focus(); f.select(); }
  });
  // La vidéo est envoyée tout de suite sur GitHub (elle est trop lourde pour le brouillon du navigateur)
  function uploadVideo(file, it) {
    if (!file) return;
    if (!/^video\//.test(file.type)) { toast('Choisissez un fichier vidéo (MP4).'); return; }
    if (file.size > 25 * 1024 * 1024) { toast('Vidéo trop lourde (' + Math.round(file.size / 1048576) + ' Mo). Maximum : 25 Mo.'); return; }
    if (!gh.token) { toast('Collez d\'abord votre clé dans l\'onglet Publication.'); return; }
    toast('Envoi de la vidéo… ne fermez pas la page.');
    var reader = new FileReader();
    reader.onload = function () {
      var ext = /webm/.test(file.type) ? 'webm' : 'mp4';
      var path = 'videos/' + slug(it.titre) + '-' + Date.now().toString(36) + '.' + ext;
      putFile(path, String(reader.result).split(',')[1], 'Vidéo : ' + it.titre).then(function () {
        it.video = path; save(); renderVit(); toast('Vidéo envoyée. Touchez « Publier en ligne » pour l\'afficher sur le site.');
      }).catch(function (err) { toast('Échec de l\'envoi : ' + err.message); });
    };
    reader.readAsDataURL(file);
  }

  /* --- Catégories --- */
  function renderCats() {
    $('#cat-list').innerHTML = data.categories.map(function (c) {
      var n = data.produits.filter(function (p) { return p.categorie === c.id; }).length;
      return '<article class="item" data-id="' + esc(c.id) + '">' +
        '<div class="item__img"><img src="' + esc(c.image) + '" alt=""><label>Changer l\'image<input type="file" accept="image/*" data-img></label></div>' +
        '<div class="fields">' +
          '<label class="w6">Nom de la catégorie<input data-k="nom" value="' + esc(c.nom) + '"></label>' +
          '<label class="w6">Petite description<input data-k="description" value="' + esc(c.description) + '"></label>' +
          '<label class="w6" style="color:var(--muted)">' + n + ' produit(s) dans cette catégorie</label>' +
        '</div>' +
        '<div class="item__actions"><button class="mini" data-act="up">↑ Monter</button><button class="mini" data-act="down">↓ Descendre</button>' +
        '<button class="mini mini--danger" data-act="del">Supprimer</button></div></article>';
    }).join('');
  }
  function findCat(el) {
    var id = el.closest('.item').dataset.id;
    return data.categories.find(function (c) { return c.id === id; });
  }
  $('#cat-list').addEventListener('input', function (e) {
    var k = e.target.dataset.k; if (!k) return;
    findCat(e.target)[k] = e.target.value;
    save();
  });
  $('#cat-list').addEventListener('change', function (e) {
    if (e.target.dataset.k === 'nom') renderProducts();
    if (e.target.hasAttribute('data-img')) {
      var c = findCat(e.target);
      readImage(e.target.files[0], function (url) { c.image = url; save(); renderCats(); toast('Image mise à jour.'); });
    }
  });
  $('#cat-list').addEventListener('click', function (e) {
    var act = e.target.dataset.act; if (!act) return;
    var c = findCat(e.target), i = data.categories.indexOf(c);
    if (act === 'del') {
      var n = data.produits.filter(function (p) { return p.categorie === c.id; }).length;
      if (n) { toast('Déplacez ou supprimez d\'abord les ' + n + ' produit(s) de cette catégorie.'); return; }
      if (!confirm('Supprimer la catégorie « ' + c.nom + ' » ?')) return;
      data.categories.splice(i, 1);
    } else if (act === 'up' && i > 0) {
      data.categories.splice(i - 1, 0, data.categories.splice(i, 1)[0]);
    } else if (act === 'down' && i < data.categories.length - 1) {
      data.categories.splice(i + 1, 0, data.categories.splice(i, 1)[0]);
    }
    save(); renderCats(); renderProducts();
  });
  $('#add-cat').addEventListener('click', function () {
    data.categories.push({ id: uid('categorie'), nom: 'Nouvelle catégorie', description: '', image: 'images/site/favicon.png' });
    save(); renderCats(); renderProducts();
    var inputs = $$('#cat-list input[data-k="nom"]');
    var last = inputs[inputs.length - 1];
    if (last) { last.focus(); last.select(); }
  });

  /* --- Infos boutique --- */
  // [chemin, libellé, largeur, type]
  var infoGroups = [
    ['Boutique', [
      ['nom', 'Nom de la boutique', 'w3'],
      ['whatsapp', 'Numéro WhatsApp qui reçoit les commandes (format international, ex. 2250748110942)', 'w3'],
      ['telephone', 'Téléphone affiché sur le site', 'w3'],
      ['adresse', 'Adresse', 'w3'],
      ['devise', 'Devise', ''],
      ['pointures', 'Pointures proposées (séparées par des virgules)', 'w6', 'list'],
      ['filigrane', 'Ajouter automatiquement mon logo Bloom Shoes sur chaque nouvelle photo', 'w6', 'bool']
    ]],
    ['Offre n°1 — chaussure seule', [
      ['offres.essentiel.nom', 'Nom de l\'offre', 'w3'],
      ['offres.essentiel.description', 'Petite description', 'w3']
    ]],
    ['Offre n°2 — Pack VIP', [
      ['offres.vip.nom', 'Nom du pack', 'w3'],
      ['offres.vip.supplement', 'Supplément ajouté au prix de la chaussure, si le « Prix Pack VIP » du produit est vide', 'w3', 'number'],
      ['offres.vip.contenu', 'Contenu du pack (une ligne par élément)', 'w6', 'lines'],
      ['offres.vip.image', 'Photo du pack (optionnelle)', 'w6', 'image']
    ]],
    ['Livraison & remboursement', [
      ['livraison.abidjan', 'Délai de livraison à Abidjan', 'w3'],
      ['livraison.interieur', 'Délai pour l\'intérieur du pays', 'w3'],
      ['livraison.frais', 'Frais de livraison (texte affiché)', 'w6', 'text'],
      ['retours.jours', 'Délai pour retourner / échanger (en jours)', 'w3', 'number'],
      ['retours.remboursement', 'Délai de remboursement', 'w3']
    ]],
    ['Publicité & statistiques (laisser vide si vous ne les utilisez pas)', [
      ['suivi.google', 'Google Analytics : identifiant de mesure (G-XXXXXXX)', 'w3'],
      ['suivi.googleAdsConversion', 'Google Ads : conversion « commande » (AW-123456789/AbCdEf)', 'w3'],
      ['suivi.meta', 'Pixel Meta / Facebook (numéro, ex. 1234567890123456)', 'w3'],
      ['suivi.tiktok', 'Pixel TikTok (ex. C1AB2CD3EF4GH5IJ6KL7)', 'w3']
    ]],
    ['Fenêtre « avant de partir »', [
      ['popup.titre', 'Titre', 'w6'],
      ['popup.texte', 'Message', 'w6', 'text']
    ]]
  ];
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, v) {
    var keys = path.split('.'), last = keys.pop();
    keys.forEach(function (k) { if (!obj[k] || typeof obj[k] !== 'object') obj[k] = {}; obj = obj[k]; });
    obj[last] = v;
  }
  function renderInfos() {
    var b = data.boutique;
    $('#infos').innerHTML = infoGroups.map(function (g) {
      return '<h3 class="w6" style="grid-column:1/-1;font-size:1.1rem;margin:1.2rem 0 0">' + esc(g[0]) + '</h3>' + g[1].map(function (f) {
        var v = getPath(b, f[0]), t = f[3];
        if (t === 'list') v = (v || []).join(', ');
        if (t === 'bool') return '<label class="check ' + f[2] + '"><input type="checkbox" data-k="' + f[0] + '" data-t="bool"' + (v !== false ? ' checked' : '') + '> ' + esc(f[1]) + '</label>';
        if (t === 'lines') return '<label class="' + f[2] + '">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" data-t="lines" rows="3">' + esc((v || []).join('\n')) + '</textarea></label>';
        if (t === 'text') return '<label class="' + f[2] + '">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" rows="2">' + esc(v) + '</textarea></label>';
        if (t === 'image') return '<label class="' + f[2] + '">' + esc(f[1]) +
          '<span style="display:flex;gap:.8rem;align-items:center">' + (v ? '<img src="' + esc(v) + '" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:10px">' : '<em style="font-style:normal;color:#9ca3af">Aucune photo : des icônes sont affichées.</em>') +
          '<input type="file" accept="image/*" data-k="' + f[0] + '" data-t="image" style="width:auto">' +
          (v ? '<button type="button" class="mini mini--danger" data-clear="' + f[0] + '">Retirer</button>' : '') + '</span></label>';
        return '<label class="' + f[2] + '">' + esc(f[1]) + '<input data-k="' + f[0] + '"' + (t ? ' data-t="' + t + '"' : '') + (t === 'number' ? ' type="number" min="0"' : '') + ' value="' + esc(v) + '"></label>';
      }).join('');
    }).join('');
  }
  $('#infos').addEventListener('input', function (e) {
    var k = e.target.dataset.k, t = e.target.dataset.t, v = e.target.value;
    if (!k || t === 'image') return;
    if (t === 'bool') { setPath(data.boutique, k, e.target.checked); save(); return; }
    if (k === 'pointures') v = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return isNaN(s) ? s : Number(s); });
    else if (k === 'whatsapp') v = v.replace(/\D/g, '');
    else if (t === 'number') v = v === '' ? 0 : Number(v);
    else if (t === 'lines') v = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    setPath(data.boutique, k, v);
    save();
    if (k === 'offres.vip.supplement') renderProducts();
  });
  $('#infos').addEventListener('change', function (e) {
    if (e.target.dataset.t !== 'image') return;
    var k = e.target.dataset.k;
    readImage(e.target.files[0], function (url) { setPath(data.boutique, k, url); save(); renderInfos(); toast('Photo mise à jour.'); });
  });
  $('#infos').addEventListener('click', function (e) {
    var k = e.target.dataset.clear; if (!k) return;
    setPath(data.boutique, k, ''); save(); renderInfos();
  });

  /* --- Fichier catalogue --- */
  function catalogueFile(d) {
    return '/* Catalogue Bloom Shoes — modifiable depuis admin.html (ne pas éditer à la main si possible) */\n' +
      'window.BLOOM_CATALOGUE = ' + JSON.stringify(d, null, 2) + ';\n';
  }
  $('#btn-export').addEventListener('click', function () {
    var blob = new Blob([catalogueFile(data)], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogue.js';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('#btn-import').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    file.text().then(function (txt) {
      var json = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      if (!json.produits || !json.categories) throw new Error('format');
      data = json; save(); renderAll(); toast('Catalogue importé.');
    }).catch(function () { toast('Fichier non reconnu.'); });
    e.target.value = '';
  });
  $('#btn-reset').addEventListener('click', function () {
    if (!confirm('Revenir à la version actuellement en ligne ? Vos modifications non publiées seront perdues.')) return;
    data = clone(live);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    renderAll(); updateStatus(); toast('Modifications annulées.');
  });

  /* --- Publication sur GitHub --- */
  var gh = { owner: 'koffiavenance', repo: 'teste', branch: 'main', token: '' };
  try { Object.assign(gh, JSON.parse(localStorage.getItem(GH_KEY) || '{}')); } catch (e) { /* ignore */ }
  ['owner', 'repo', 'branch', 'token'].forEach(function (k) {
    var el = $('#gh-' + k);
    el.value = gh[k] || '';
    el.addEventListener('input', function () {
      gh[k] = el.value.trim();
      try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch (e) { /* ignore */ }
    });
  });
  $('#gh-forget').addEventListener('click', function () {
    gh.token = ''; $('#gh-token').value = '';
    try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch (e) { /* ignore */ }
    toast('Clé supprimée de ce navigateur.');
  });

  function log(msg) { var l = $('#log'); l.textContent += msg + '\n'; l.scrollTop = l.scrollHeight; }
  function api(path, opts) {
    opts = opts || {};
    return fetch('https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/contents/' + path + (opts.method ? '' : '?ref=' + encodeURIComponent(gh.branch)), {
      method: opts.method || 'GET',
      headers: { 'Authorization': 'Bearer ' + gh.token, 'Accept': 'application/vnd.github+json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }
  function putFile(path, b64, message) {
    return api(path).then(function (r) { return r.ok ? r.json() : null; }).then(function (cur) {
      var body = { message: message, content: b64, branch: gh.branch };
      if (cur && cur.sha) body.sha = cur.sha;
      return api(path, { method: 'PUT', body: body });
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error((j && j.message) || ('Erreur ' + r.status)); });
      return r.json();
    });
  }
  function utf8b64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function imageHolders(d) {
    var list = d.produits.concat(d.categories);
    var vip = d.boutique.offres && d.boutique.offres.vip;
    if (vip) { vip.id = vip.id || 'pack-vip'; list.push(vip); }
    ((d.boutique.vitrine || {}).items || []).forEach(function (it) { it.nom = it.nom || it.titre; list.push(it); });
    return list;
  }

  // Après publication, on interroge le vrai site jusqu'à ce que la nouvelle version soit en ligne
  function waitOnline(version) {
    var tries = 0;
    (function check() {
      fetch('data/catalogue.js?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (txt) {
        var m = txt.match(/"version":\s*(\d+)/);
        if (m && Number(m[1]) >= version) {
          log('✓ EN LIGNE ! Vos clients voient maintenant vos modifications.');
          log('  Si vous ne les voyez pas sur votre téléphone, fermez puis rouvrez la page du site.');
          toast('En ligne ! Vos modifications sont visibles.');
        } else if (++tries < 24) { setTimeout(check, 10000); }
        else log('… La mise en ligne prend plus de temps que d\'habitude. Réessayez de rouvrir le site dans quelques minutes.');
      }).catch(function () { if (++tries < 24) setTimeout(check, 10000); });
      if (tries === 1) log('  (GitHub construit le site, cela prend 30 secondes à 2 minutes…)');
    })();
  }

  var publishing = false;
  function publish() {
    if (publishing) return;
    if (!gh.token || !gh.owner || !gh.repo || !gh.branch) {
      $$('.a-tab').forEach(function (x) { if (x.dataset.tab === 'publier') x.click(); });
      toast('Renseignez d\'abord votre clé d\'accès GitHub.');
      $('#gh-token').focus();
      return;
    }
    publishing = true;
    $$('#btn-publish, #btn-publish-top').forEach(function (b) { b.disabled = true; b.textContent = 'Publication…'; });
    $('#log').textContent = '';
    var out = clone(data);
    out.version = Date.now();
    var uploads = [];
    imageHolders(out).forEach(function (it) {
      if (it.image && it.image.indexOf('data:') === 0) uploads.push(it);
    });
    log('Envoi de ' + uploads.length + ' nouvelle(s) image(s)…');
    var chain = Promise.resolve();
    uploads.forEach(function (it) {
      chain = chain.then(function () {
        var path = 'images/produits/' + slug(it.nom) + '-' + Date.now().toString(36) + '.jpg';
        return putFile(path, it.image.split(',')[1], 'Image : ' + it.nom).then(function () {
          it.image = path;
          log('  ✓ ' + path);
        });
      });
    });
    chain.then(function () {
      log('Envoi du catalogue…');
      return putFile('data/catalogue.js', utf8b64(catalogueFile(out)), 'Mise à jour du catalogue depuis l\'administration');
    }).then(function () {
      log('✓ Publié sur GitHub. Vérification de la mise en ligne…');
      waitOnline(out.version);
      data = out; live = clone(out);
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
      renderAll(); updateStatus();
      toast('Publié avec succès !');
    }).catch(function (err) {
      log('✗ Échec : ' + err.message);
      if (/Bad credentials|401/.test(err.message)) log('  → La clé d\'accès est invalide ou expirée.');
      if (/Not Found|404/.test(err.message)) log('  → Vérifiez le compte, le dépôt, la branche et les droits de la clé.');
      // Les images déjà envoyées restent valables : on garde leur chemin pour ne pas les renvoyer
      var byId = {};
      imageHolders(out).forEach(function (it) { byId[it.id] = it.image; });
      imageHolders(data).forEach(function (it) { if (byId[it.id] && byId[it.id].indexOf('data:') !== 0) it.image = byId[it.id]; });
      save();
      toast('La publication a échoué, voir le détail dans l\'onglet Publication.');
      $$('.a-tab').forEach(function (x) { if (x.dataset.tab === 'publier') x.click(); });
    }).then(function () {
      publishing = false;
      $$('#btn-publish, #btn-publish-top').forEach(function (b) { b.disabled = false; b.textContent = 'Publier en ligne'; });
    });
  }
  $('#btn-publish').addEventListener('click', publish);
  $('#btn-publish-top').addEventListener('click', publish);

  function renderAll() { renderProducts(); renderCats(); renderInfos(); renderVit(); }
  renderAll();
  updateStatus();
})();
