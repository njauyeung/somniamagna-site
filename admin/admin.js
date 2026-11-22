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
'#am-modal{position:fixed;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
'#am-modal[hidden]{display:none}',
'#am-modal .am-card{width:min(760px,100%);max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px);display:flex;flex-direction:column;border-radius:28px;background:var(--card);color:var(--ink);box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden}',
'#am-modal .am-hd{flex:none;display:flex;align-items:center;gap:10px;padding:18px 20px 0}',
'#am-modal .am-hd h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em;flex:1;min-width:0}',
'#am-modal .am-hd small{display:block;margin-top:2px;font-size:12px;font-weight:500;color:var(--muted);letter-spacing:0}',
'#am-modal .am-x{flex:none;width:40px;height:40px;border:0;border-radius:50%;background:#fff;font-size:22px;line-height:1;color:var(--ink)}',
'#am-modal .am-seg{flex:none;display:flex;gap:6px;padding:14px 20px 0;overflow-x:auto;scrollbar-width:none}',
'#am-modal .am-seg button{flex:none;height:38px;padding:0 16px;border:0;border-radius:19px;background:rgba(255,255,255,.6);font-size:14px;font-weight:600;color:var(--ink)}',
'#am-modal .am-seg button[aria-selected=true]{background:var(--ink);color:var(--cream)}',
'#am-modal .am-main{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 20px 22px;-webkit-overflow-scrolling:touch}',
'#am-modal .am-note{margin:0 0 12px;font-size:14px;font-weight:600}',
'#am-modal .am-note.am-ok{color:#1B6B45}#am-modal .am-note.am-err{color:#B3261E}',
'#am-modal .am-empty{margin:6px 0;font-size:14px;color:var(--muted)}',
'#am-modal .am-post{display:flex;gap:12px;align-items:center;background:#fff;border-radius:16px;padding:10px 12px;margin-bottom:8px}',
'#am-modal .am-post img,#am-modal .am-post .am-ph{width:48px;height:48px;border-radius:10px;object-fit:cover;background:#ddd;flex:none}',
'#am-modal .am-post .am-tx{flex:1;min-width:0}',
'#am-modal .am-post b,#am-modal .am-post span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#am-modal .am-post b{font-size:14px}#am-modal .am-post span{font-size:12px;color:var(--muted)}',
'#am-modal .am-btn{flex:none;height:36px;padding:0 14px;border:0;border-radius:18px;background:rgba(10,11,31,.08);color:var(--ink);font-size:12px;font-weight:700}',
'#am-modal .am-btn.am-pri{height:48px;padding:0 26px;border-radius:24px;background:var(--ink);color:var(--cream);font-size:15px}',
'#am-modal .am-btn.am-sec{height:48px;padding:0 22px;border-radius:24px;font-size:15px}',
'#am-modal .am-btn.am-del{background:#F6DAD8;color:#8C1D18}',
'#am-modal .am-btn.am-del.am-sure{background:#B3261E;color:#fff}',
'#am-modal .am-btn:disabled{opacity:.5}',
'#am-modal label{display:block;margin:16px 0 6px;font-size:13px;font-weight:600}',
'#am-modal label small{font-weight:500;color:var(--muted)}',
'#am-modal .am-f:first-child label:first-child{margin-top:0}',
'#am-modal input[type=text],#am-modal input[type=date],#am-modal input[type=number],#am-modal textarea{width:100%;border:0;border-radius:14px;background:#fff;padding:13px 14px;font:inherit;font-size:16px;color:var(--ink);outline:none}',
'#am-modal input:focus,#am-modal textarea:focus{box-shadow:0 0 0 2px var(--violet)}',
'#am-modal textarea{min-height:120px;resize:vertical;line-height:1.5}',
'#am-modal .am-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
'#am-modal .am-cityw{position:relative}',
'#am-modal .am-opts{position:absolute;z-index:3;left:0;right:0;top:100%;margin:6px 0 0;padding:6px;list-style:none;border-radius:16px;background:var(--ink);color:var(--cream);box-shadow:0 18px 40px rgba(0,0,0,.35);max-height:260px;overflow-y:auto}',
'#am-modal .am-opts li{padding:10px 12px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#am-modal .am-opts li small{margin-left:6px;font-size:12px;color:#B9B39A}',
'#am-modal .am-opts li.am-on,#am-modal .am-opts li:hover{background:rgba(243,239,223,.14)}',
'#am-modal details{margin-top:10px;font-size:13px;color:var(--muted)}',
'#am-modal summary{cursor:pointer;font-weight:600}',
'#am-modal .am-drop{display:flex;align-items:center;justify-content:center;margin:6px 0 0;min-height:80px;border:2px dashed rgba(110,98,64,.45);border-radius:18px;background:rgba(255,255,255,.5);font-size:14px;font-weight:600;color:var(--violet);cursor:pointer;text-align:center;padding:12px}',
'#am-modal .am-drop input{display:none}',
'#am-modal .am-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:12px}',
'#am-modal .am-th{position:relative;background:#fff;border-radius:14px;overflow:hidden}',
'#am-modal .am-th img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}',
'#am-modal .am-th.am-rm img{opacity:.3}',
'#am-modal .am-th input{border-radius:0;padding:8px 10px;font-size:12px}',
'#am-modal .am-th .am-xb{position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(10,11,31,.72);color:#fff;font-size:16px;line-height:1}',
'#am-modal .am-th .am-rmt{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:12px;font-weight:700;color:var(--ink)}',
'#am-modal .am-acts{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px}',
'#am-modal .am-acts .am-sp{flex:1}',
'#am-modal .am-gh{display:flex;align-items:center;gap:10px;margin:18px 0 8px}#am-modal .am-gh:first-child{margin-top:0}#am-modal .am-gh b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}#am-modal .am-gh span{flex:1;min-width:0;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#am-modal .am-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
'#am-modal .am-gal button{position:relative;border:0;padding:0;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#ddd}',
'#am-modal .am-gal img{display:block;width:100%;height:100%;object-fit:cover}',
'#am-modal .am-gal span{position:absolute;left:0;right:0;bottom:0;padding:16px 10px 7px;background:linear-gradient(transparent,rgba(10,11,31,.72));color:#fff;font-size:11px;font-weight:600;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'@media (max-width:820px){#am-modal{padding:10px}#am-modal .am-card{max-height:calc(100vh - 20px);max-height:calc(100dvh - 20px);border-radius:24px}#am-modal .am-two{grid-template-columns:1fr}#am-modal .am-post{flex-wrap:wrap}#am-modal .am-post .am-tx{flex-basis:calc(100% - 72px)}}'
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
root.id = 'am-modal'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Manage posts');
root.innerHTML = '<div class="am-card"><div class="am-hd"><h2>Manage<small id="am-who"></small></h2><button class="am-x" type="button" data-a="close" aria-label="Close">×</button></div><div class="am-seg" id="am-tabs"></div><div class="am-main" id="am-body"></div></div>';
document.body.appendChild(root);

var view = 'posts', flash = null;
var form = null;        // { id|null, existing:[{id,url,caption,removed}], added:[{blob,url,caption}], chosen:{place,lon,lat}|null, saving }
var cityIdx = -1;       // highlighted option in the city list

fetch('/api/admin/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
  .then(function (j) { $('#am-who').textContent = 'Signed in as ' + j.email; }).catch(function () {});

function posts() { return (window.sm && window.sm.posts && window.sm.posts()) || []; }
function open(v) { view = v || 'posts'; root.hidden = false; render(); var x = $('.am-x', root); if (x) x.focus(); }
function close() { root.hidden = true; discardForm(); }
function discardForm() { if (form) form.added.forEach(function (p) { URL.revokeObjectURL(p.url); }); form = null; }
function say(text, kind) { flash = text ? { t: text, k: kind || 'ok' } : null; }

function render() {
  var seg = [['posts', 'Posts'], ['gallery', 'Gallery'], ['form', form && form.id ? 'Edit post' : 'New post']];
  $('#am-tabs').innerHTML = seg.map(function (s) { return '<button type="button" role="tab" data-a="view" data-v="' + s[0] + '" aria-selected="' + (view === s[0]) + '">' + (s[0] === 'form' && !(form && form.id) ? '+ ' : '') + s[1] + '</button>'; }).join('');
  var m = $('#am-body'), note = flash ? '<p class="am-note ' + flash.k + '" role="status">' + esc(flash.t) + '</p>' : '';
  flash = null;
  if (view === 'gallery') m.innerHTML = note + galleryHTML();
  else if (view === 'form') { if (!form) startForm(null); m.innerHTML = note + formHTML(); bindForm(); }
  else m.innerHTML = note + postsHTML();
}

/* ------------------------------------------------------------ posts list + gallery */
function postsHTML() {
  var list = posts();
  if (!list.length) return '<p class="am-empty">No posts yet. Add your first one and it goes live in the Community tab.</p><div class="am-acts"><button class="am-btn am-pri" type="button" data-a="new">Add a post</button></div>';
  return list.map(function (p) {
    var im = p.photos[0] ? '<img src="' + esc(p.photos[0].url) + '" alt="">' : '<div class="am-ph"></div>';
    return '<div class="am-post">' + im + '<div class="am-tx"><b>' + esc(p.title) + '</b><span>' + esc(p.place) + (p.event_date ? ' · ' + esc(p.event_date) : '') + ' · ' + p.photos.length + ' photo' + (p.photos.length === 1 ? '' : 's') + '</span></div>' +
      '<button class="am-btn" type="button" data-a="edit" data-id="' + esc(p.id) + '">Edit</button>' +
      '<button class="am-btn am-del" type="button" data-a="del" data-id="' + esc(p.id) + '">Delete</button></div>';
  }).join('');
}
function albumPhotos(p) { return p.photos.map(function (ph) { return { src: ph.url, cap: ph.caption || '', title: p.title, place: p.place, date: p.event_date || '' }; }); }
function galleryHTML() {                         // photos from the same post stay together; each group opens as its own carousel
  var groups = posts().filter(function (p) { return p.photos.length; });
  if (!groups.length) return '<p class="am-empty">No photos yet. Photos you add to posts show up here.</p>';
  return groups.map(function (p) {
    return '<div class="am-gh"><b>' + esc(p.title) + '</b><span>' + esc(p.place) + (p.event_date ? ' · ' + esc(p.event_date) : '') + '</span><button class="am-btn" type="button" data-a="edit" data-id="' + esc(p.id) + '">Edit</button></div>' +
      '<div class="am-gal">' + p.photos.map(function (ph, i) { return '<button type="button" data-a="photo" data-id="' + esc(p.id) + '" data-i="' + i + '" aria-label="Open photo"><img src="' + esc(ph.url) + '" alt="" loading="lazy">' + (ph.caption ? '<span>' + esc(ph.caption) + '</span>' : '') + '</button>'; }).join('') + '</div>';
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
  return '<form id="am-form" autocomplete="off" novalidate>' +
    '<div class="am-f"><label for="am-title">Title <small>(' + MAX_TITLE + ' characters max, so it fits on one line)</small></label><input id="am-title" type="text" maxlength="' + MAX_TITLE + '" placeholder="Sunset session" value="' + esc(v.title) + '"></div>' +
    '<div class="am-two"><div class="am-cityw"><label for="am-city">City</label><input id="am-city" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" placeholder="Start typing, e.g. Markham" value="' + esc(v.place) + '"><ul id="am-list" class="am-opts" role="listbox" hidden></ul></div>' +
    '<div><label for="am-date">Date</label><input id="am-date" type="date" value="' + (dateOk ? esc(v.date) : '') + '"></div></div>' +
    '<details id="am-coords"><summary>City not listed? Enter coordinates</summary><div class="am-two"><div><label for="am-lon">Longitude</label><input id="am-lon" type="number" step="any" placeholder="-79.38"></div><div><label for="am-lat">Latitude</label><input id="am-lat" type="number" step="any" placeholder="43.65"></div></div></details>' +
    '<label for="am-text">How did it go?</label><textarea id="am-text" maxlength="4000" placeholder="What happened, who came, what you would do again.">' + esc(v.body) + '</textarea>' +
    '<label>Photos <small>(up to ' + MAX_PHOTOS + '; resized on your device, location data removed)</small></label>' +
    '<label class="am-drop" for="am-files" style="margin-top:6px"><span>Tap to add photos</span><input id="am-files" type="file" accept="image/*" multiple></label>' +
    '<div class="am-thumbs" id="am-thumbs">' + thumbsHTML() + '</div>' +
    '<div class="am-acts"><button class="am-btn am-pri" id="am-go" type="submit">' + (form.id ? 'Save changes' : 'Publish') + '</button><button class="am-btn am-sec" type="button" data-a="cancel">Cancel</button><span class="am-sp"></span>' +
    (form.id ? '<button class="am-btn am-del" type="button" data-a="del" data-id="' + esc(form.id) + '">Delete post</button>' : '') + '</div>' +
    '<p class="am-note" id="am-msg" role="status" style="margin:14px 0 0"></p></form>';
}
function thumbsHTML() {
  return form.existing.map(function (p, i) {
    return '<div class="am-th' + (p.removed ? ' am-rm' : '') + '"><img src="' + esc(p.url) + '" alt="">' + (p.removed ? '<span class="am-rmt">Will be removed</span>' : '') +
      '<button class="am-xb" type="button" data-a="rmold" data-i="' + i + '" aria-label="' + (p.removed ? 'Keep photo' : 'Remove photo') + '">' + (p.removed ? '↺' : '×') + '</button>' +
      '<input type="text" maxlength="120" data-ecap="' + i + '" placeholder="Caption (optional)" value="' + esc(p.caption) + '"></div>';
  }).join('') + form.added.map(function (p, i) {
    return '<div class="am-th"><img src="' + p.url + '" alt=""><button class="am-xb" type="button" data-a="rmnew" data-i="' + i + '" aria-label="Remove photo">×</button><input type="text" maxlength="120" data-ncap="' + i + '" placeholder="Caption (optional)" value="' + esc(p.caption) + '"></div>';
  }).join('');
}
function photoCount() { return form.existing.filter(function (p) { return !p.removed; }).length + form.added.length; }
function msg(t, k) { var m = $('#am-msg'); if (m) { m.textContent = t || ''; m.className = 'am-note' + (k ? ' am-' + k : ''); } }

function bindForm() {
  var f = $('#am-form'), c = $('#am-city'), l = $('#am-list');
  f.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'am-title') form.v.title = t.value;
    else if (t.id === 'am-date') form.v.date = t.value;
    else if (t.id === 'am-text') form.v.body = t.value;
    else if (t.dataset.ecap != null) form.existing[+t.dataset.ecap].caption = t.value;
    else if (t.dataset.ncap != null) form.added[+t.dataset.ncap].caption = t.value;
    else if (t.id === 'am-city') { form.v.place = t.value; if (form.chosen && form.chosen.place !== t.value) form.chosen = null; showOpts(); }
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
  $('#am-files').addEventListener('change', function (e) {
    var list = Array.prototype.slice.call(e.target.files); e.target.value = '';
    if (!list.length) return;
    msg('Preparing photos…');
    var skipped = false;
    list.reduce(function (p, file) {
      return p.then(function () {
        if (photoCount() >= MAX_PHOTOS) { skipped = true; return; }
        return shrink(file).then(function (b) { form.added.push({ blob: b, url: URL.createObjectURL(b), caption: '' }); });
      }).catch(function (err) { msg(err.message, 'err'); });
    }, Promise.resolve()).then(function () { $('#am-thumbs').innerHTML = thumbsHTML(); msg(skipped ? 'Up to ' + MAX_PHOTOS + ' photos per post.' : '', skipped ? 'err' : ''); });
  });
}
function showOpts() {
  var l = $('#am-list'), c = $('#am-city'); if (!l) return;
  var hits = form.chosen ? [] : findCities(c.value);
  cityIdx = -1;
  l.innerHTML = hits.map(function (i) { return '<li role="option" data-c="' + i + '">' + esc(CITIES[i][0]) + '<small>' + esc(CITIES[i][1]) + '</small></li>'; }).join('');
  l.hidden = !hits.length; c.setAttribute('aria-expanded', String(!!hits.length));
}
function hideOpts() { var l = $('#am-list'); if (l) { l.hidden = true; $('#am-city').setAttribute('aria-expanded', 'false'); } }
function markOpt() { Array.prototype.forEach.call($('#am-list').children, function (li, i) { li.classList.toggle('am-on', i === cityIdx); if (i === cityIdx) li.scrollIntoView({ block: 'nearest' }); }); }
function pick(i) {
  var c = CITIES[i]; if (!c) return;
  form.chosen = { place: LABEL[i], lon: c[2], lat: c[3] }; form.v.place = LABEL[i];
  $('#am-city').value = LABEL[i]; hideOpts();
}

function save() {
  if (form.saving) return;
  var v = form.v, lo = parseFloat($('#am-lon').value), la = parseFloat($('#am-lat').value), pos = null, place = v.place.trim();
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
  form.saving = true; $('#am-go').disabled = true; msg(editing ? 'Saving…' : 'Publishing…');
  fetch(editing ? '/api/admin/posts/' + encodeURIComponent(form.id) : '/api/admin/posts', { method: editing ? 'PUT' : 'POST', headers: H, body: fd, credentials: 'same-origin' })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not save.'); return j; }); })
    .then(function () { return window.sm.reload(); })
    .then(function () { discardForm(); say(editing ? 'Saved. The change is live.' : 'Published. It is live in the Community tab.'); view = 'posts'; render(); })
    .catch(function (err) { if (form) { form.saving = false; } var g = $('#am-go'); if (g) g.disabled = false; msg(err.message, 'err'); });
}

/* ------------------------------------------------------------ clicks */
root.addEventListener('click', function (e) {
  var b = e.target.closest('[data-a]');
  if (!b) { if (e.target === root) close(); return; }
  var a = b.dataset.a;
  if (!e.target.closest('#am-list') && !e.target.closest('#am-city')) hideOpts();
  if (a === 'close') close();
  else if (a === 'view') {
    if (b.dataset.v === 'form' && !form) startForm(null);
    view = b.dataset.v; render();
  }
  else if (a === 'new') { startForm(null); view = 'form'; render(); }
  else if (a === 'edit') { startForm(b.dataset.id); view = 'form'; render(); }
  else if (a === 'cancel') { discardForm(); view = 'posts'; render(); }
  else if (a === 'photo') { var gp = posts().filter(function (x) { return x.id === b.dataset.id; })[0]; if (gp) window.sm.lightbox(albumPhotos(gp), +b.dataset.i); }
  else if (a === 'rmold') { var p = form.existing[+b.dataset.i]; p.removed = !p.removed; $('#am-thumbs').innerHTML = thumbsHTML(); }
  else if (a === 'rmnew') { var n = form.added.splice(+b.dataset.i, 1)[0]; URL.revokeObjectURL(n.url); $('#am-thumbs').innerHTML = thumbsHTML(); }
  else if (a === 'del') {
    if (!b.classList.contains('am-sure')) {
      var label = b.textContent; b.classList.add('am-sure'); b.textContent = 'Tap again to delete';
      setTimeout(function () { if (b.isConnected) { b.classList.remove('am-sure'); b.textContent = label; } }, 4000);
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
  if (!root.hidden && !e.target.closest('.am-cityw')) hideOpts();
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' || root.hidden) return;
  var lb = document.getElementById('lb'); if (lb && !lb.hidden) return;   // capture phase: runs before the site closes the viewer, so one Esc closes one layer
  close();
}, true);
})();
