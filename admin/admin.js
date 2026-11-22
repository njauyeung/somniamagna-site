/* Owner-only: the "Manage" overlay on top of the normal site (posts, gallery, add / edit / delete).
   The Worker only sends this file to a signed-in owner (see /admin in worker/index.js), so visitors never receive it. */
(function () {
'use strict';
if (!window.SM_ADMIN) return;

var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var H = { 'X-Requested-With': 'sm' };
var MAX_PHOTOS = 12, MAX_TITLE = 28;

/* ------------------------------------------------------------ styles */
var css = document.createElement('style');
css.textContent = [
'#adm{position:fixed;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
'#adm[hidden]{display:none}',
'#adm .card{width:min(760px,100%);max-height:100%;display:flex;flex-direction:column;border-radius:28px;background:var(--card);color:var(--ink);box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden}',
'#adm .hd{flex:none;display:flex;align-items:center;gap:10px;padding:18px 20px 0}',
'#adm .hd h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em;flex:1;min-width:0}',
'#adm .hd small{display:block;margin-top:2px;font-size:12px;font-weight:500;color:var(--muted);letter-spacing:0}',
'#adm .x{flex:none;width:40px;height:40px;border:0;border-radius:50%;background:#fff;font-size:22px;line-height:1;color:var(--ink)}',
'#adm .seg{flex:none;display:flex;gap:6px;padding:14px 20px 0;overflow-x:auto;scrollbar-width:none}',
'#adm .seg button{flex:none;height:38px;padding:0 16px;border:0;border-radius:19px;background:rgba(255,255,255,.6);font-size:14px;font-weight:600;color:var(--ink)}',
'#adm .seg button[aria-selected=true]{background:var(--ink);color:var(--cream)}',
'#adm .main{flex:1;min-height:0;overflow-y:auto;padding:16px 20px 22px;-webkit-overflow-scrolling:touch}',
'#adm .note{margin:0 0 12px;font-size:14px;font-weight:600}',
'#adm .note.ok{color:#1B6B45}#adm .note.err{color:#B3261E}',
'#adm .empty{margin:6px 0;font-size:14px;color:var(--muted)}',
'#adm .post{display:flex;gap:12px;align-items:center;background:#fff;border-radius:16px;padding:10px 12px;margin-bottom:8px}',
'#adm .post img,#adm .post .ph{width:48px;height:48px;border-radius:10px;object-fit:cover;background:#ddd;flex:none}',
'#adm .post .tx{flex:1;min-width:0}',
'#adm .post b,#adm .post span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#adm .post b{font-size:14px}#adm .post span{font-size:12px;color:var(--muted)}',
'#adm .btn{flex:none;height:36px;padding:0 14px;border:0;border-radius:18px;background:rgba(10,11,31,.08);color:var(--ink);font-size:12px;font-weight:700}',
'#adm .btn.pri{height:48px;padding:0 26px;border-radius:24px;background:var(--ink);color:var(--cream);font-size:15px}',
'#adm .btn.sec{height:48px;padding:0 22px;border-radius:24px;font-size:15px}',
'#adm .btn.del{background:#F6DAD8;color:#8C1D18}',
'#adm .btn.del.sure{background:#B3261E;color:#fff}',
'#adm .btn:disabled{opacity:.5}',
'#adm label{display:block;margin:16px 0 6px;font-size:13px;font-weight:600}',
'#adm label small{font-weight:500;color:var(--muted)}',
'#adm .f:first-child label:first-child{margin-top:0}',
'#adm input[type=text],#adm input[type=date],#adm input[type=number],#adm textarea{width:100%;border:0;border-radius:14px;background:#fff;padding:13px 14px;font:inherit;font-size:15px;color:var(--ink);outline:none}',
'#adm input:focus,#adm textarea:focus{box-shadow:0 0 0 2px var(--violet)}',
'#adm textarea{min-height:120px;resize:vertical;line-height:1.5}',
'#adm .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
'#adm .cityw{position:relative}',
'#adm .opts{position:absolute;z-index:3;left:0;right:0;top:100%;margin:6px 0 0;padding:6px;list-style:none;border-radius:16px;background:var(--ink);color:var(--cream);box-shadow:0 18px 40px rgba(0,0,0,.35);max-height:260px;overflow-y:auto}',
'#adm .opts li{padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#adm .opts li small{margin-left:6px;font-size:12px;color:#B9B39A}',
'#adm .opts li.on,#adm .opts li:hover{background:rgba(243,239,223,.14)}',
'#adm details{margin-top:10px;font-size:13px;color:var(--muted)}',
'#adm summary{cursor:pointer;font-weight:600}',
'#adm .drop{display:flex;align-items:center;justify-content:center;margin:6px 0 0;min-height:80px;border:2px dashed rgba(110,98,64,.45);border-radius:18px;background:rgba(255,255,255,.5);font-size:14px;font-weight:600;color:var(--violet);cursor:pointer;text-align:center;padding:12px}',
'#adm .drop input{display:none}',
'#adm .thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:12px}',
'#adm .th{position:relative;background:#fff;border-radius:14px;overflow:hidden}',
'#adm .th img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}',
'#adm .th.rm img{opacity:.3}',
'#adm .th input{border-radius:0;padding:8px 10px;font-size:12px}',
'#adm .th .xb{position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(10,11,31,.72);color:#fff;font-size:16px;line-height:1}',
'#adm .th .rmt{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:12px;font-weight:700;color:var(--ink)}',
'#adm .acts{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px}',
'#adm .acts .sp{flex:1}',
'#adm .gh{display:flex;align-items:center;gap:10px;margin:18px 0 8px}#adm .gh:first-child{margin-top:0}#adm .gh b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}#adm .gh span{flex:1;min-width:0;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#adm .gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
'#adm .gal button{position:relative;border:0;padding:0;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#ddd}',
'#adm .gal img{display:block;width:100%;height:100%;object-fit:cover}',
'#adm .gal span{position:absolute;left:0;right:0;bottom:0;padding:16px 10px 7px;background:linear-gradient(transparent,rgba(10,11,31,.72));color:#fff;font-size:11px;font-weight:600;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'@media (max-width:820px){#adm{padding:10px}#adm .card{max-height:100%;border-radius:24px}#adm .two{grid-template-columns:1fr}#adm .post{flex-wrap:wrap}#adm .post .tx{flex-basis:calc(100% - 72px)}}'
].join('\n');
document.head.appendChild(css);

/* ------------------------------------------------------------ cities */
var CITIES = window.SM_CITIES_ALL || [];
var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
var LABEL = CITIES.map(function (c) { return c[0] + ', ' + c[1]; });
var NL = LABEL.map(norm), NN = CITIES.map(function (c) { return norm(c[0]); });
function findCities(q) {                         // biggest cities first; prefix matches ahead of "contains"
  q = norm(q); if (!q) return [];
  var a = [], b = [], c = [], i;
  for (i = 0; i < CITIES.length && a.length < 8; i++) if (NL[i].indexOf(q) === 0) a.push(i);
  if (a.length < 8) for (i = 0; i < CITIES.length && b.length < 8; i++) if (NL[i].indexOf(q) > 0 && (' ' + NL[i]).indexOf(' ' + q) > -1) b.push(i);
  if (a.length + b.length < 8) for (i = 0; i < CITIES.length && c.length < 8; i++) if (NL[i].indexOf(q) > 0 && b.indexOf(i) < 0) c.push(i);
  return a.concat(b, c).slice(0, 8);
}
function exactCity(text) {
  var q = norm(text), i;
  for (i = 0; i < CITIES.length; i++) if (NL[i] === q) return i;
  for (i = 0; i < CITIES.length; i++) if (NN[i] === q) return i;
  return -1;
}

/* ------------------------------------------------------------ photos */
function shrink(file) {                         // max 2000px, re-saved as JPEG (this also drops EXIF/GPS)
  return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bm) {
    var s = Math.min(1, 2000 / Math.max(bm.width, bm.height)), w = Math.round(bm.width * s), h = Math.round(bm.height * s);
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bm, 0, 0, w, h);
    return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not read that photo.')); }, 'image/jpeg', 0.86); });
  });
}

/* ------------------------------------------------------------ state + shell */
var root = document.createElement('div');
root.id = 'adm'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Manage posts');
root.innerHTML = '<div class="card"><div class="hd"><h2>Manage<small id="adme"></small></h2><button class="x" type="button" data-a="close" aria-label="Close">×</button></div><div class="seg" id="adseg"></div><div class="main" id="admain"></div></div>';
document.body.appendChild(root);

var view = 'posts', flash = null;
var form = null;        // { id|null, existing:[{id,url,caption,removed}], added:[{blob,url,caption}], chosen:{place,lon,lat}|null, saving }
var cityIdx = -1;       // highlighted option in the city list

fetch('/api/admin/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
  .then(function (j) { $('#adme').textContent = 'Signed in as ' + j.email; }).catch(function () {});

function posts() { return (window.sm && window.sm.posts && window.sm.posts()) || []; }
function open(v) { view = v || 'posts'; root.hidden = false; render(); var x = $('.x', root); if (x) x.focus(); }
function close() { root.hidden = true; discardForm(); }
function discardForm() { if (form) form.added.forEach(function (p) { URL.revokeObjectURL(p.url); }); form = null; }
function say(text, kind) { flash = text ? { t: text, k: kind || 'ok' } : null; }

function render() {
  var seg = [['posts', 'Posts'], ['gallery', 'Gallery'], ['form', form && form.id ? 'Edit post' : 'New post']];
  $('#adseg').innerHTML = seg.map(function (s) { return '<button type="button" role="tab" data-a="view" data-v="' + s[0] + '" aria-selected="' + (view === s[0]) + '">' + (s[0] === 'form' && !(form && form.id) ? '+ ' : '') + s[1] + '</button>'; }).join('');
  var m = $('#admain'), note = flash ? '<p class="note ' + flash.k + '" role="status">' + esc(flash.t) + '</p>' : '';
  flash = null;
  if (view === 'gallery') m.innerHTML = note + galleryHTML();
  else if (view === 'form') { if (!form) startForm(null); m.innerHTML = note + formHTML(); bindForm(); }
  else m.innerHTML = note + postsHTML();
}

/* ------------------------------------------------------------ posts list + gallery */
function postsHTML() {
  var list = posts();
  if (!list.length) return '<p class="empty">No posts yet. Add your first one and it goes live in the Community tab.</p><div class="acts"><button class="btn pri" type="button" data-a="new">Add a post</button></div>';
  return list.map(function (p) {
    var im = p.photos[0] ? '<img src="' + esc(p.photos[0].url) + '" alt="">' : '<div class="ph"></div>';
    return '<div class="post">' + im + '<div class="tx"><b>' + esc(p.title) + '</b><span>' + esc(p.place) + (p.event_date ? ' · ' + esc(p.event_date) : '') + ' · ' + p.photos.length + ' photo' + (p.photos.length === 1 ? '' : 's') + '</span></div>' +
      '<button class="btn" type="button" data-a="edit" data-id="' + esc(p.id) + '">Edit</button>' +
      '<button class="btn del" type="button" data-a="del" data-id="' + esc(p.id) + '">Delete</button></div>';
  }).join('');
}
function albumPhotos(p) { return p.photos.map(function (ph) { return { src: ph.url, cap: ph.caption || '', title: p.title, place: p.place, date: p.event_date || '' }; }); }
function galleryHTML() {                         // photos from the same post stay together; each group opens as its own carousel
  var groups = posts().filter(function (p) { return p.photos.length; });
  if (!groups.length) return '<p class="empty">No photos yet. Photos you add to posts show up here.</p>';
  return groups.map(function (p) {
    return '<div class="gh"><b>' + esc(p.title) + '</b><span>' + esc(p.place) + (p.event_date ? ' · ' + esc(p.event_date) : '') + '</span><button class="btn" type="button" data-a="edit" data-id="' + esc(p.id) + '">Edit</button></div>' +
      '<div class="gal">' + p.photos.map(function (ph, i) { return '<button type="button" data-a="photo" data-id="' + esc(p.id) + '" data-i="' + i + '" aria-label="Open photo"><img src="' + esc(ph.url) + '" alt="" loading="lazy">' + (ph.caption ? '<span>' + esc(ph.caption) + '</span>' : '') + '</button>'; }).join('') + '</div>';
  }).join('');
}

/* ------------------------------------------------------------ add / edit form */
function startForm(id) {
  discardForm(); cityIdx = -1;
  var p = id ? posts().filter(function (x) { return x.id === id; })[0] : null;
  form = { id: p ? p.id : null, existing: p ? p.photos.map(function (x) { return { id: x.id, url: x.url, caption: x.caption || '', removed: false }; }) : [], added: [], chosen: p ? { place: p.place, lon: p.lon, lat: p.lat } : null, saving: false,
    v: p ? { title: p.title, place: p.place, date: p.event_date || '', body: p.body || '' } : { title: '', place: '', date: '', body: '' } };
}
function formHTML() {
  var v = form.v, dateOk = /^\d{4}-\d{2}-\d{2}$/.test(v.date);
  return '<form id="adf" autocomplete="off" novalidate>' +
    '<div class="f"><label for="adt">Title <small>(' + MAX_TITLE + ' characters max, so it fits on one line)</small></label><input id="adt" type="text" maxlength="' + MAX_TITLE + '" placeholder="Sunset session" value="' + esc(v.title) + '"></div>' +
    '<div class="two"><div class="cityw"><label for="adc">City</label><input id="adc" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" placeholder="Start typing, e.g. Markham" value="' + esc(v.place) + '"><ul id="adl" class="opts" role="listbox" hidden></ul></div>' +
    '<div><label for="add">Date</label><input id="add" type="date" value="' + (dateOk ? esc(v.date) : '') + '"></div></div>' +
    '<details id="adco"><summary>City not listed? Enter coordinates</summary><div class="two"><div><label for="adlo">Longitude</label><input id="adlo" type="number" step="any" placeholder="-79.38"></div><div><label for="adla">Latitude</label><input id="adla" type="number" step="any" placeholder="43.65"></div></div></details>' +
    '<label for="adb">How did it go?</label><textarea id="adb" maxlength="4000" placeholder="What happened, who came, what you would do again.">' + esc(v.body) + '</textarea>' +
    '<label>Photos <small>(up to ' + MAX_PHOTOS + '; resized on your device, location data removed)</small></label>' +
    '<label class="drop" for="adfiles" style="margin-top:6px"><span>Tap to add photos</span><input id="adfiles" type="file" accept="image/*" multiple></label>' +
    '<div class="thumbs" id="adth">' + thumbsHTML() + '</div>' +
    '<div class="acts"><button class="btn pri" id="adgo" type="submit">' + (form.id ? 'Save changes' : 'Publish') + '</button><button class="btn sec" type="button" data-a="cancel">Cancel</button><span class="sp"></span>' +
    (form.id ? '<button class="btn del" type="button" data-a="del" data-id="' + esc(form.id) + '">Delete post</button>' : '') + '</div>' +
    '<p class="note" id="admsg" role="status" style="margin:14px 0 0"></p></form>';
}
function thumbsHTML() {
  return form.existing.map(function (p, i) {
    return '<div class="th' + (p.removed ? ' rm' : '') + '"><img src="' + esc(p.url) + '" alt="">' + (p.removed ? '<span class="rmt">Will be removed</span>' : '') +
      '<button class="xb" type="button" data-a="rmold" data-i="' + i + '" aria-label="' + (p.removed ? 'Keep photo' : 'Remove photo') + '">' + (p.removed ? '↺' : '×') + '</button>' +
      '<input type="text" maxlength="120" data-ecap="' + i + '" placeholder="Caption (optional)" value="' + esc(p.caption) + '"></div>';
  }).join('') + form.added.map(function (p, i) {
    return '<div class="th"><img src="' + p.url + '" alt=""><button class="xb" type="button" data-a="rmnew" data-i="' + i + '" aria-label="Remove photo">×</button><input type="text" maxlength="120" data-ncap="' + i + '" placeholder="Caption (optional)" value="' + esc(p.caption) + '"></div>';
  }).join('');
}
function photoCount() { return form.existing.filter(function (p) { return !p.removed; }).length + form.added.length; }
function msg(t, k) { var m = $('#admsg'); if (m) { m.textContent = t || ''; m.className = 'note' + (k ? ' ' + k : ''); } }

function bindForm() {
  var f = $('#adf'), c = $('#adc'), l = $('#adl');
  f.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'adt') form.v.title = t.value;
    else if (t.id === 'add') form.v.date = t.value;
    else if (t.id === 'adb') form.v.body = t.value;
    else if (t.dataset.ecap != null) form.existing[+t.dataset.ecap].caption = t.value;
    else if (t.dataset.ncap != null) form.added[+t.dataset.ncap].caption = t.value;
    else if (t.id === 'adc') { form.v.place = t.value; if (form.chosen && form.chosen.place !== t.value) form.chosen = null; showOpts(); }
  });
  c.addEventListener('focus', showOpts);
  c.addEventListener('keydown', function (e) {
    var n = l.children.length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); cityIdx = (cityIdx + 1) % n; markOpt(); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); cityIdx = (cityIdx - 1 + n) % n; markOpt(); }
    else if (e.key === 'Enter' && !l.hidden && n) { e.preventDefault(); pick(+l.children[Math.max(cityIdx, 0)].dataset.c); }
    else if (e.key === 'Escape' && !l.hidden) { e.stopPropagation(); hideOpts(); }
  });
  l.addEventListener('mousedown', function (e) { e.preventDefault(); });          // keep focus in the input
  l.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) pick(+li.dataset.c); });
  f.addEventListener('submit', function (e) { e.preventDefault(); save(); });
  $('#adfiles').addEventListener('change', function (e) {
    var list = Array.prototype.slice.call(e.target.files); e.target.value = '';
    if (!list.length) return;
    msg('Preparing photos…');
    var skipped = false;
    list.reduce(function (p, file) {
      return p.then(function () {
        if (photoCount() >= MAX_PHOTOS) { skipped = true; return; }
        return shrink(file).then(function (b) { form.added.push({ blob: b, url: URL.createObjectURL(b), caption: '' }); });
      }).catch(function (err) { msg(err.message, 'err'); });
    }, Promise.resolve()).then(function () { $('#adth').innerHTML = thumbsHTML(); msg(skipped ? 'Up to ' + MAX_PHOTOS + ' photos per post.' : '', skipped ? 'err' : ''); });
  });
}
function showOpts() {
  var l = $('#adl'), c = $('#adc'); if (!l) return;
  var hits = form.chosen ? [] : findCities(c.value);
  cityIdx = -1;
  l.innerHTML = hits.map(function (i) { return '<li role="option" data-c="' + i + '">' + esc(CITIES[i][0]) + '<small>' + esc(CITIES[i][1]) + '</small></li>'; }).join('');
  l.hidden = !hits.length; c.setAttribute('aria-expanded', String(!!hits.length));
}
function hideOpts() { var l = $('#adl'); if (l) { l.hidden = true; $('#adc').setAttribute('aria-expanded', 'false'); } }
function markOpt() { Array.prototype.forEach.call($('#adl').children, function (li, i) { li.classList.toggle('on', i === cityIdx); if (i === cityIdx) li.scrollIntoView({ block: 'nearest' }); }); }
function pick(i) {
  var c = CITIES[i]; if (!c) return;
  form.chosen = { place: LABEL[i], lon: c[2], lat: c[3] }; form.v.place = LABEL[i];
  $('#adc').value = LABEL[i]; hideOpts();
}

function save() {
  if (form.saving) return;
  var v = form.v, lo = parseFloat($('#adlo').value), la = parseFloat($('#adla').value), pos = null, place = v.place.trim();
  if (!v.title.trim()) { msg('Add a title.', 'err'); return; }
  if (!place) { msg('Pick a city.', 'err'); return; }
  if (isFinite(lo) && isFinite(la)) pos = { lon: lo, lat: la };
  else if (form.chosen) pos = form.chosen;
  else { var i = exactCity(place); if (i > -1) { pos = { lon: CITIES[i][2], lat: CITIES[i][3] }; place = LABEL[i]; } }
  if (!pos) { msg('Pick that city from the list, or open "City not listed?" and enter its coordinates.', 'err'); return; }
  var fd = new FormData();
  fd.append('title', v.title); fd.append('place', place); fd.append('date', v.date); fd.append('lon', pos.lon); fd.append('lat', pos.lat); fd.append('body', v.body);
  form.added.forEach(function (p, n) { fd.append('photos', p.blob, 'photo' + n + '.jpg'); fd.append('caption_' + n, p.caption); });
  var editing = !!form.id;
  if (editing) {
    fd.append('remove', JSON.stringify(form.existing.filter(function (p) { return p.removed; }).map(function (p) { return p.id; })));
    form.existing.forEach(function (p) { if (!p.removed) fd.append('caption_' + p.id, p.caption); });
  }
  form.saving = true; $('#adgo').disabled = true; msg(editing ? 'Saving…' : 'Publishing…');
  fetch(editing ? '/api/admin/posts/' + encodeURIComponent(form.id) : '/api/admin/posts', { method: editing ? 'PUT' : 'POST', headers: H, body: fd, credentials: 'same-origin' })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not save.'); return j; }); })
    .then(function () { return window.sm.reload(); })
    .then(function () { discardForm(); say(editing ? 'Saved. The change is live.' : 'Published. It is live in the Community tab.'); view = 'posts'; render(); })
    .catch(function (err) { if (form) { form.saving = false; } var g = $('#adgo'); if (g) g.disabled = false; msg(err.message, 'err'); });
}

/* ------------------------------------------------------------ clicks */
root.addEventListener('click', function (e) {
  var b = e.target.closest('[data-a]');
  if (!b) { if (e.target === root) close(); return; }
  var a = b.dataset.a;
  if (!e.target.closest('#adl') && !e.target.closest('#adc')) hideOpts();
  if (a === 'close') close();
  else if (a === 'view') {
    if (b.dataset.v === 'form' && !form) startForm(null);
    view = b.dataset.v; render();
  }
  else if (a === 'new') { startForm(null); view = 'form'; render(); }
  else if (a === 'edit') { startForm(b.dataset.id); view = 'form'; render(); }
  else if (a === 'cancel') { discardForm(); view = 'posts'; render(); }
  else if (a === 'photo') { var gp = posts().filter(function (x) { return x.id === b.dataset.id; })[0]; if (gp) window.sm.lightbox(albumPhotos(gp), +b.dataset.i); }
  else if (a === 'rmold') { var p = form.existing[+b.dataset.i]; p.removed = !p.removed; $('#adth').innerHTML = thumbsHTML(); }
  else if (a === 'rmnew') { var n = form.added.splice(+b.dataset.i, 1)[0]; URL.revokeObjectURL(n.url); $('#adth').innerHTML = thumbsHTML(); }
  else if (a === 'del') {
    if (!b.classList.contains('sure')) {
      var label = b.textContent; b.classList.add('sure'); b.textContent = 'Tap again to delete';
      setTimeout(function () { if (b.isConnected) { b.classList.remove('sure'); b.textContent = label; } }, 4000);
      return;
    }
    b.disabled = true; b.textContent = 'Deleting…';
    fetch('/api/admin/posts/' + encodeURIComponent(b.dataset.id), { method: 'DELETE', headers: H, credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return window.sm.reload(); })
      .then(function () { discardForm(); say('Post deleted.'); view = 'posts'; render(); })
      .catch(function () { b.disabled = false; b.textContent = 'Could not delete. Try again.'; });
  }
});
document.addEventListener('click', function (e) {
  if (e.target.closest('#admbtn')) { open('posts'); return; }
  if (!root.hidden && !e.target.closest('.cityw')) hideOpts();
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' || root.hidden) return;
  var lb = document.getElementById('lb'); if (lb && !lb.hidden) return;   // capture phase: runs before the site closes the viewer, so one Esc closes one layer
  close();
}, true);
})();
