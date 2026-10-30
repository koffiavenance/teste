/* ===== Page « Rencontre sérieuse » : vidéos + formulaire en 3 étapes vers WhatsApp ===== */
(function () {
  'use strict';

  var shop = (window.BLOOM_CATALOGUE || {}).boutique || {};
  var cfg = shop.rencontre || {};
  var num = String(cfg.whatsapp || shop.whatsapp || '').replace(/\D/g, '');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --- Vidéos : affichées seulement si elles existent --- */
  function videoHtml(v, tag) {
    return '<video src="' + esc(v.video) + '"' + (v.image ? ' poster="' + esc(v.image) + '"' : '') +
      ' controls playsinline preload="metadata" controlsList="nodownload"></video>' + (tag ? '<span class="rv-tag">' + esc(tag) + '</span>' : '');
  }
  var main = cfg.principale && cfg.principale.video ? cfg.principale : null;
  if (main) {
    $('#presentation').hidden = false;
    $('#rv-main').innerHTML = videoHtml(main, 'Ma présentation');
  }
  var proofs = (cfg.preuves || []).filter(function (p) { return p.video; });
  if (proofs.length) {
    $('#preuves').hidden = false;
    $('#rv-proofs').innerHTML = proofs.map(function (p) {
      return '<figure class="rv-proof"><div class="rv-video rv-video--portrait">' + videoHtml(p, 'C\'est bien moi') + '</div>' +
        (p.titre ? '<figcaption>' + esc(p.titre) + '</figcaption>' : '') + '</figure>';
    }).join('');
  }
  // Une seule vidéo à la fois
  document.addEventListener('play', function (e) {
    $$('video').forEach(function (v) { if (v !== e.target) v.pause(); });
  }, true);

  // Les liens « Voir ma présentation » mènent au formulaire s'il n'y a pas encore de vidéo
  if (!main) $$('a[href="#presentation"]').forEach(function (a) { a.setAttribute('href', '#demarche'); a.textContent = 'Lire ma démarche'; });

  /* --- Pays et indicatif --- */
  var pays = [
    ['Côte d\'Ivoire', '+225'], ['Bénin', '+229'], ['Burkina Faso', '+226'], ['Cameroun', '+237'], ['Congo', '+242'],
    ['RD Congo', '+243'], ['Gabon', '+241'], ['Ghana', '+233'], ['Guinée', '+224'], ['Mali', '+223'], ['Niger', '+227'],
    ['Nigeria', '+234'], ['Sénégal', '+221'], ['Togo', '+228'], ['France', '+33'], ['Belgique', '+32'], ['Suisse', '+41'],
    ['Canada', '+1'], ['États-Unis', '+1'], ['Autre pays', '']
  ];
  var sel = $('#rv-pays'), dial = $('#rv-dial'), form = $('#rv-form');
  sel.innerHTML = '<option value="">Choisir…</option>' + pays.map(function (p) { return '<option>' + esc(p[0]) + '</option>'; }).join('');
  sel.value = '';
  sel.addEventListener('change', function () {
    var p = pays.find(function (x) { return x[0] === sel.value; });
    dial.textContent = p && p[1] ? p[1] : '+';
  });
  dial.textContent = '+';

  /* --- Étapes --- */
  var step = 1, TOTAL = 3, names = ['Toi', 'Tes attentes', 'Engagement'];
  var steps = $$('.rv-step'), bar = $('#rv-bar'), label = $('#rv-stepname');
  var prev = $('#rv-prev'), next = $('#rv-next'), send = $('#rv-send'), err = $('#rv-error');

  function show(n) {
    step = n;
    steps.forEach(function (s) { s.classList.toggle('is-on', Number(s.dataset.step) === n); });
    bar.style.width = (n / TOTAL * 100) + '%';
    label.textContent = 'Étape ' + n + ' sur ' + TOTAL + ' · ' + names[n - 1];
    prev.hidden = n === 1; next.hidden = n === TOTAL; send.hidden = n !== TOTAL;
    err.hidden = true;
    var top = $('#formulaire').getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > top + 200 || window.scrollY < top - 400) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function validate(n) {
    var box = steps[n - 1], bad = null, msg = 'Merci de remplir tous les champs marqués d\'un *.';
    $$('.is-invalid', box).forEach(function (el) { el.classList.remove('is-invalid'); });
    $$('[required]', box).forEach(function (el) {
      var ok = true;
      if (el.type === 'checkbox') ok = el.checked;
      else if (el.type === 'radio') ok = !!$('input[name="' + el.name + '"]:checked', box);
      else ok = el.value.trim() !== '';
      if (ok && el.name === 'age' && Number(el.value) < 18) { ok = false; msg = 'Cette page est réservée aux personnes de 18 ans et plus.'; }
      if (ok && el.name === 'telephone' && el.value.replace(/\D/g, '').length < 6) { ok = false; msg = 'Indique un numéro WhatsApp valide.'; }
      if (ok && el.minLength > 0 && el.value.trim().length < el.minLength) { ok = false; msg = 'Prends un instant pour répondre avec quelques mots de plus : ta sincérité compte.'; }
      if (!ok) {
        (el.type === 'radio' ? el.closest('.rv-radio') : el).classList.add('is-invalid');
        if (!bad) bad = el;
      }
    });
    if (bad) {
      err.textContent = msg; err.hidden = false;
      bad.focus({ preventScroll: false });
      return false;
    }
    err.hidden = true; return true;
  }

  next.addEventListener('click', function () { if (validate(step)) show(step + 1); });
  prev.addEventListener('click', function () { show(step - 1); });
  form.addEventListener('input', function (e) {
    if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
    var r = e.target.closest('.rv-radio'); if (r) r.classList.remove('is-invalid');
    if (!$('.is-invalid', form)) err.hidden = true;
  });
  form.addEventListener('change', function (e) { if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid'); if (!$('.is-invalid', form)) err.hidden = true; });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && step < TOTAL) { e.preventDefault(); next.click(); }
  });

  /* --- Envoi sur WhatsApp --- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.siteweb.value) return;             // piège à robots
    for (var i = 1; i <= TOTAL; i++) { if (!validate(i)) { show(i); validate(i); return; } }
    var f = form.elements, v = function (n) { return (f[n].value || '').trim(); };
    var tel = (dial.textContent.length > 1 ? dial.textContent + ' ' : '') + v('telephone');
    var lines = [
      '*DEMANDE DE RENCONTRE SÉRIEUSE*',
      '',
      '*Identité*',
      'Prénom : ' + v('prenom'),
      'Nom : ' + v('nom'),
      'Âge : ' + v('age') + ' ans',
      'Situation : ' + v('situation'),
      'Pays : ' + v('pays'),
      'Ville : ' + v('ville') + (v('region') ? ' (' + v('region') + ')' : ''),
      'WhatsApp : ' + tel,
      '',
      '*Ce qui l\'a poussée à me contacter*',
      v('motivation'),
      '',
      '*Ce qu\'elle recherche réellement*',
      v('recherche'),
      '',
      '*Une relation saine, selon elle*',
      v('relationsaine'),
      '',
      '*Mes valeurs lui correspondent :* ' + ($('input[name=valeurs]:checked').value),
      '*Vision du foyer :* ' + v('vision'),
      '*Enfants :* ' + (v('enfants') || 'préfère en parler'),
      '*Autre chose derrière sa démarche :* ' + (v('autre') || 'non précisé'),
      '*A connu la page via :* ' + (v('source') || 'non précisé'),
      '',
      'Confirmations : majeure, informations vraies, démarche sincère, accord d\'envoi.'
    ];
    if (window.bloomTrack) window.bloomTrack('formulaire', { nom: 'Formulaire rencontre' });
    var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(lines.join('\n'));
    form.hidden = true;
    var t = $('#rv-thanks'); t.hidden = false; $('#rv-again').href = url;
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.open(url, '_blank', 'noopener');
  });

  // Liens d'ancre fluides avec le bandeau fixe
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 62, behavior: 'smooth' });
    });
  });
})();
