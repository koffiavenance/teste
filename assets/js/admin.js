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
  function readImage(file, cb) {
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
        cb(c.toDataURL('image/jpeg', 0.82));
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
  function findProd(el) {
    var id = el.closest('.item').dataset.id;
    return data.produits.find(function (p) { return p.id === id; });
  }
  $('#prod-list').addEventListener('input', function (e) {
    var k = e.target.dataset.k; if (!k) return;
    var p = findProd(e.target), v = e.target.value;
    if (k === 'prix' || k === 'ancienPrix') p[k] = v === '' ? null : Number(v);
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
  var infoFields = [
    ['nom', 'Nom de la boutique', 'w3'],
    ['whatsapp', 'Numéro WhatsApp qui reçoit les commandes (format international, ex. 2250748110942)', 'w3'],
    ['telephone', 'Téléphone affiché sur le site', 'w3'],
    ['adresse', 'Adresse', 'w3'],
    ['devise', 'Devise', ''],
    ['pointures', 'Pointures proposées (séparées par des virgules)', 'w6']
  ];
  function renderInfos() {
    var b = data.boutique;
    $('#infos').innerHTML = infoFields.map(function (f) {
      var v = f[0] === 'pointures' ? (b.pointures || []).join(', ') : b[f[0]];
      return '<label class="' + f[2] + '">' + esc(f[1]) + '<input data-k="' + f[0] + '" value="' + esc(v) + '"></label>';
    }).join('');
  }
  $('#infos').addEventListener('input', function (e) {
    var k = e.target.dataset.k, v = e.target.value;
    if (k === 'pointures') data.boutique.pointures = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return isNaN(s) ? s : Number(s); });
    else if (k === 'whatsapp') data.boutique.whatsapp = v.replace(/\D/g, '');
    else data.boutique[k] = v;
    save();
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
    var uploads = [];
    out.produits.concat(out.categories).forEach(function (it) {
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
      log('✓ Publié ! Le site sera à jour dans 1 à 2 minutes.');
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
      out.produits.concat(out.categories).forEach(function (it) { byId[it.id] = it.image; });
      data.produits.concat(data.categories).forEach(function (it) { if (byId[it.id] && byId[it.id].indexOf('data:') !== 0) it.image = byId[it.id]; });
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

  function renderAll() { renderProducts(); renderCats(); renderInfos(); }
  renderAll();
  updateStatus();
})();
