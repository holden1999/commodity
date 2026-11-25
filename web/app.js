'use strict';

const $ = (selector, root) => (root || document).querySelector(selector);

const CHECKLIST_GROUPS = [
  { key: 'download', title: 'Unduh data dasar' },
  { key: 'sop', title: 'SOP operasional' }
];

const state = {
  config: null,
  values: {},
  mdplZoneTag: null,
  evalTimer: 0,
  evalSeq: 0,
  evalPending: 0,
  priceTimer: 0,
  priceSeq: 0,
  pricePending: 0,
  checklist: { download: [], sop: [] },
  checklistQueue: Promise.resolve()
};

async function api(path, options) {
  const opts = Object.assign({}, options);
  if (opts.body !== undefined) {
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
  }
  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    throw new Error('Tidak dapat menghubungi server.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  if (!res.ok) {
    const message = data && typeof data.error === 'string' && data.error
      ? data.error
      : 'Server menolak permintaan (' + res.status + ').';
    throw new Error(message);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Respons server tidak valid.');
  }
  return data;
}

function setError(node, message) {
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
}

function decimalsOf(step) {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

function fmt(value, decimals) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(decimals) : '';
}

function scoreText(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '0.0';
}

function alphaText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return String(Math.round(number * 1000) / 1000);
}

function zoneFor(mdpl, zones) {
  if (!Array.isArray(zones) || !zones.length) return null;
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    if (mdpl >= zone.min && mdpl <= zone.max) return zone;
  }
  const sorted = zones.slice().sort((a, b) => a.min - b.min);
  if (mdpl < sorted[0].min) return sorted[0];
  return sorted[sorted.length - 1];
}

function updateZoneTag(mdpl) {
  if (!state.mdplZoneTag || !state.config) return;
  const zone = zoneFor(mdpl, state.config.zones);
  state.mdplZoneTag.textContent = zone ? 'Zona ' + zone.id + ' · ' + zone.name : 'Zona —';
}

function buildSliders(variables) {
  const wrap = $('#sliders');
  if (!wrap) return;
  wrap.textContent = '';
  state.values = {};
  const fragment = document.createDocumentFragment();

  variables.forEach(function (variable) {
    const key = String(variable.key);
    const decimals = decimalsOf(variable.step);
    const unit = typeof variable.unit === 'string' ? variable.unit : '';
    const id = 'var-' + key.replace(/[^a-zA-Z0-9_-]/g, '-');
    const field = document.createElement('div');
    field.className = 'field';

    const head = document.createElement('div');
    head.className = 'field-head';

    const label = document.createElement('label');
    label.className = 'field-label';
    label.htmlFor = id;
    label.textContent = variable.label || key;

    const valueWrap = document.createElement('span');
    valueWrap.className = 'field-value';
    const output = document.createElement('output');
    output.setAttribute('for', id);
    output.textContent = fmt(variable.default, decimals);
    valueWrap.appendChild(output);
    if (unit) {
      const unitNode = document.createElement('span');
      unitNode.className = 'unit';
      unitNode.textContent = unit;
      valueWrap.appendChild(unitNode);
    }

    head.append(label, valueWrap);

    if (key === 'mdpl') {
      const zoneTag = document.createElement('span');
      zoneTag.className = 'zone-tag';
      zoneTag.id = 'zone-tag';
      zoneTag.textContent = 'Zona —';
      head.appendChild(zoneTag);
      state.mdplZoneTag = zoneTag;
    }

    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = variable.min;
    input.max = variable.max;
    input.step = variable.step;
    input.value = variable.default;
    input.setAttribute('aria-valuetext', fmt(variable.default, decimals) + (unit ? ' ' + unit : ''));

    input.addEventListener('input', function () {
      const raw = Number(input.value);
      output.textContent = fmt(raw, decimals);
      input.setAttribute('aria-valuetext', fmt(raw, decimals) + (unit ? ' ' + unit : ''));
      state.values[key] = raw;
      if (key === 'mdpl') updateZoneTag(raw);
      scheduleEval();
    });

    const scale = document.createElement('div');
    scale.className = 'field-scale';
    const low = document.createElement('span');
    low.textContent = fmt(variable.min, decimals);
    const high = document.createElement('span');
    high.textContent = fmt(variable.max, decimals);
    scale.append(low, high);

    field.append(head, input, scale);
    fragment.appendChild(field);
    state.values[key] = Number(variable.default);
  });

  wrap.appendChild(fragment);
  updateZoneTag(state.values.mdpl);
}

function scheduleEval() {
  clearTimeout(state.evalTimer);
  state.evalTimer = setTimeout(function () {
    evaluate();
  }, 150);
}

async function evaluate() {
  if (!state.config) return;
  const seq = ++state.evalSeq;
  const body = $('#result-body');
  state.evalPending += 1;
  if (body) body.classList.add('is-stale');
  try {
    const data = await api('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ input: state.values })
    });
    if (seq !== state.evalSeq) return;
    renderResult(data);
    setError($('#result-error'), '');
  } catch (err) {
    if (seq === state.evalSeq) {
      setError($('#result-error'), 'Perhitungan gagal: ' + err.message);
    }
  } finally {
    state.evalPending = Math.max(0, state.evalPending - 1);
    if (state.evalPending === 0 && body) body.classList.remove('is-stale');
  }
}

function commodityLabel(key) {
  if (state.config && Array.isArray(state.config.commodities)) {
    for (let i = 0; i < state.config.commodities.length; i += 1) {
      if (state.config.commodities[i].key === key) return state.config.commodities[i].label || key;
    }
  }
  return String(key);
}

function renderRankItem(item, index, tied) {
  const li = document.createElement('li');
  li.className = index === 0 ? 'rank is-top' : 'rank';

  const line = document.createElement('div');
  line.className = 'rank-line';

  const name = document.createElement('span');
  name.className = 'rank-name';
  name.textContent = item.label || item.key || '';
  line.appendChild(name);

  if (item.cycle) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = item.cycle;
    line.appendChild(chip);
  }

  if (tied) {
    const chip = document.createElement('span');
    chip.className = 'chip chip-tie';
    chip.textContent = 'seri';
    chip.title = 'Skor sama dengan peringkat 1; urutan diputus oleh jumlah rule yang aktif.';
    line.appendChild(chip);
  }

  const score = document.createElement('span');
  score.className = 'rank-score';
  score.textContent = scoreText(item.score);
  line.appendChild(score);

  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  const width = Math.max(0, Math.min(100, Number(item.score) || 0));
  fill.style.width = width + '%';
  bar.appendChild(fill);

  li.append(line, bar);

  const fired = Array.isArray(item.fired) ? item.fired : [];
  if (fired.length) {
    const firedLine = document.createElement('p');
    firedLine.className = 'fired';
    fired.forEach(function (entry, firedIndex) {
      if (firedIndex) firedLine.appendChild(document.createTextNode(' · '));
      firedLine.appendChild(document.createTextNode('rule ' + entry.rule + ' · '));
      const alpha = document.createElement('span');
      alpha.className = 'alpha';
      alpha.textContent = 'α' + alphaText(entry.alpha);
      firedLine.appendChild(alpha);
    });
    li.appendChild(firedLine);
  }

  return li;
}

function renderResult(data) {
  const body = $('#result-body');
  if (!body) return;
  body.textContent = '';

  const zone = data.zone && typeof data.zone === 'object' ? data.zone : null;
  if (zone) {
    const block = document.createElement('div');
    block.className = 'zone-block';
    const line = document.createElement('p');
    line.className = 'zone-line';
    line.textContent = 'Zona ' + zone.id + ' · ' + zone.name;
    const advice = document.createElement('p');
    advice.className = 'zone-advice';
    advice.textContent = zone.advice || '';
    block.append(line, advice);
    body.appendChild(block);
    if (state.mdplZoneTag) {
      state.mdplZoneTag.textContent = 'Zona ' + zone.id + ' · ' + zone.name;
    }
  }

  const ranking = Array.isArray(data.ranking)
    ? data.ranking.filter(function (item) { return item && typeof item === 'object'; })
    : [];

  if (ranking.length) {
    const pick = document.createElement('div');
    pick.className = 'top-pick';
    const cap = document.createElement('p');
    cap.className = 'top-cap';
    cap.textContent = 'Rekomendasi utama';
    const row = document.createElement('div');
    row.className = 'top-row';
    const name = document.createElement('span');
    name.className = 'top-name';
    name.textContent = ranking[0].label || ranking[0].key || '';
    const score = document.createElement('span');
    score.className = 'top-score';
    score.textContent = scoreText(ranking[0].score);
    row.append(name, score);
    pick.append(cap, row);
    body.appendChild(pick);
  } else {
    const empty = document.createElement('p');
    empty.className = 'placeholder';
    empty.textContent = 'Belum ada komoditas yang lolos skor.';
    body.appendChild(empty);
  }

  if (ranking.length) {
    const list = document.createElement('ol');
    list.className = 'ranking';
    ranking.forEach(function (item, index) {
      const tied = index > 0 && Number(item.score) === Number(ranking[0].score);
      list.appendChild(renderRankItem(item, index, tied));
    });
    body.appendChild(list);
  }

  const pkg = data.package && typeof data.package === 'object' ? data.package : null;
  if (pkg) {
    const block = document.createElement('div');
    block.className = 'package';
    const title = document.createElement('h3');
    title.className = 'sub-title';
    title.textContent = 'Paket tumpang sari';
    block.appendChild(title);

    const keys = Array.isArray(pkg.commodities) ? pkg.commodities : [];
    if (keys.length) {
      const chips = document.createElement('div');
      chips.className = 'pkg-chips';
      keys.forEach(function (key) {
        const chip = document.createElement('span');
        chip.className = 'pkg-chip';
        chip.textContent = commodityLabel(key);
        chips.appendChild(chip);
      });
      block.appendChild(chips);
    }

    if (typeof pkg.reason === 'string' && pkg.reason) {
      const reason = document.createElement('p');
      reason.className = 'pkg-reason';
      reason.textContent = pkg.reason;
      block.appendChild(reason);
    }
    body.appendChild(block);
  }

  const notes = Array.isArray(data.notes)
    ? data.notes.filter(function (note) { return typeof note === 'string' && note; })
    : [];
  if (notes.length) {
    const block = document.createElement('div');
    block.className = 'notes-block';
    const title = document.createElement('h3');
    title.className = 'sub-title';
    title.textContent = 'Catatan';
    const list = document.createElement('ul');
    list.className = 'notes';
    notes.forEach(function (note) {
      const li = document.createElement('li');
      li.textContent = note;
      list.appendChild(li);
    });
    block.append(title, list);
    body.appendChild(block);
  }

  const status = $('#result-status');
  if (status) {
    status.textContent = ranking.length
      ? 'Hasil diperbarui. Rekomendasi utama ' + (ranking[0].label || '') + ', skor ' + scoreText(ranking[0].score) + '.'
      : 'Hasil diperbarui tanpa komoditas yang lolos skor.';
  }
}

function initPriceCard() {
  const hpp = $('#hpp');
  const market = $('#market');
  if (!hpp || !market) return;

  const onChange = function () {
    clearTimeout(state.priceTimer);
    state.priceTimer = setTimeout(function () {
      computePrice();
    }, 200);
  };
  hpp.addEventListener('input', onChange);
  market.addEventListener('input', onChange);
}

function applyPriceDefaults(price) {
  const hpp = $('#hpp');
  const market = $('#market');
  if (!hpp || !market) return;

  if (typeof price.hpp === 'number') hpp.value = price.hpp;
  if (typeof price.market === 'number') market.value = price.market;

  const neighbor = typeof price.neighborShare === 'number' ? price.neighborShare : 30;
  const network = typeof price.networkShare === 'number' ? price.networkShare : 70;
  const split = $('#price-split');
  if (split) split.textContent = neighbor + '% tetangga desa · ' + network + '% jaringan antar-desa';

  const source = $('#price-source');
  if (source) source.textContent = typeof price.source === 'string' ? price.source : '';
}

function setPriceValue(value) {
  const node = $('#village-price');
  if (!node) return;
  if (value === null || value === undefined) {
    node.textContent = '—';
    return;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    node.textContent = '—';
    return;
  }
  node.textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(number));
}

async function computePrice() {
  const errorNode = $('#price-error');
  const figure = $('#price-figure');
  const hpp = Number($('#hpp').value);
  const market = Number($('#market').value);

  if (!Number.isFinite(hpp) || !Number.isFinite(market) || hpp <= 0 || market <= 0) {
    setError(errorNode, 'HPP dan harga pasar harus angka lebih dari 0.');
    setPriceValue(null);
    return;
  }
  if (market < hpp) {
    setError(errorNode, 'Harga pasar tidak boleh di bawah HPP.');
    setPriceValue(null);
    return;
  }

  const seq = ++state.priceSeq;
  state.pricePending += 1;
  if (figure) figure.classList.add('is-stale');
  try {
    const data = await api('/api/price', {
      method: 'POST',
      body: JSON.stringify({ hpp: hpp, market: market })
    });
    if (seq !== state.priceSeq) return;
    setPriceValue(data.village);
    const neighbor = Number(data.neighborShare);
    const network = Number(data.networkShare);
    const split = $('#price-split');
    if (split && Number.isFinite(neighbor) && Number.isFinite(network)) {
      split.textContent = neighbor + '% tetangga desa · ' + network + '% jaringan antar-desa';
    }
    setError(errorNode, '');
  } catch (err) {
    if (seq === state.priceSeq) {
      setError(errorNode, 'Harga desa gagal dihitung: ' + err.message);
    }
  } finally {
    state.pricePending = Math.max(0, state.pricePending - 1);
    if (state.pricePending === 0 && figure) figure.classList.remove('is-stale');
  }
}

function normalizeChecklist(data) {
  const next = { download: [], sop: [] };
  CHECKLIST_GROUPS.forEach(function (group) {
    if (Array.isArray(data[group.key])) {
      next[group.key] = data[group.key].map(String);
    }
  });
  return next;
}

function renderChecklist() {
  const wrap = $('#checklist-groups');
  if (!wrap || !state.config) return;
  wrap.textContent = '';

  const meta = state.config.checklist && typeof state.config.checklist === 'object'
    ? state.config.checklist
    : null;
  if (!meta) {
    setError($('#checklist-error'), 'Data checklist tidak tersedia dari server.');
    return;
  }

  let any = false;
  CHECKLIST_GROUPS.forEach(function (group) {
    const items = Array.isArray(meta[group.key]) ? meta[group.key] : [];
    if (!items.length) return;
    any = true;

    const done = state.checklist[group.key] || [];
    const section = document.createElement('div');
    section.className = 'check-group';

    const head = document.createElement('div');
    head.className = 'check-head';
    const title = document.createElement('h3');
    title.className = 'check-title';
    title.textContent = group.title;
    const count = document.createElement('span');
    count.className = 'check-count';
    count.setAttribute('data-count-for', group.key);
    count.textContent = done.length + ' / ' + items.length;
    head.append(title, count);
    section.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'check-list';
    items.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'check-item';

      const label = document.createElement('label');
      label.className = 'check-label';

      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.group = group.key;
      box.dataset.id = String(item.id);
      box.checked = done.indexOf(String(item.id)) !== -1;
      box.addEventListener('change', function () {
        toggleChecklist(box);
      });

      const textWrap = document.createElement('span');
      textWrap.className = 'check-text';
      const name = document.createElement('span');
      name.className = 'check-name';
      name.textContent = item.label || String(item.id);
      const detail = document.createElement('span');
      detail.className = 'check-detail';
      detail.textContent = item.detail || '';
      textWrap.append(name, detail);

      label.append(box, textWrap);
      li.appendChild(label);
      list.appendChild(li);
    });

    section.appendChild(list);
    wrap.appendChild(section);
  });

  if (!any) {
    const empty = document.createElement('p');
    empty.className = 'placeholder';
    empty.textContent = 'Checklist belum tersedia.';
    wrap.appendChild(empty);
  }

  updateChecklistCounts();
}

function updateChecklistCounts() {
  if (!state.config || !state.config.checklist) return;
  CHECKLIST_GROUPS.forEach(function (group) {
    const node = document.querySelector('.check-count[data-count-for="' + group.key + '"]');
    if (!node) return;
    const items = Array.isArray(state.config.checklist[group.key]) ? state.config.checklist[group.key] : [];
    const done = state.checklist[group.key] || [];
    let count = 0;
    items.forEach(function (item) {
      if (done.indexOf(String(item.id)) !== -1) count += 1;
    });
    node.textContent = count + ' / ' + items.length;
  });
}

function syncChecklistBoxes() {
  const boxes = document.querySelectorAll('#checklist-groups input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (box) {
    const done = state.checklist[box.dataset.group] || [];
    box.checked = done.indexOf(String(box.dataset.id)) !== -1;
  });
  updateChecklistCounts();
}

function toggleChecklist(box) {
  const group = box.dataset.group;
  const id = box.dataset.id;
  const done = box.checked;

  state.checklistQueue = state.checklistQueue.then(function () {
    return api('/api/checklist', {
      method: 'POST',
      body: JSON.stringify({ group: group, id: id, done: done })
    }).then(function (data) {
      state.checklist = normalizeChecklist(data);
      setError($('#checklist-error'), '');
      syncChecklistBoxes();
    }).catch(function (err) {
      const known = state.checklist[group] || [];
      box.checked = known.indexOf(id) !== -1;
      setError($('#checklist-error'), 'Checklist gagal disimpan: ' + err.message);
    });
  });
}

async function init() {
  initPriceCard();
  const configPromise = api('/api/config');
  const checklistPromise = api('/api/checklist').then(
    function (data) { return { ok: true, data: data }; },
    function (err) { return { ok: false, err: err }; }
  );

  let config = null;
  try {
    config = await configPromise;
    if (!Array.isArray(config.variables) || !config.variables.length) {
      throw new Error('Daftar variabel kosong.');
    }
    state.config = config;
    buildSliders(config.variables);
    applyPriceDefaults(config.price && typeof config.price === 'object' ? config.price : {});
  } catch (err) {
    setError($('#config-error'), 'Konfigurasi gagal dimuat: ' + err.message);
    const placeholder = $('#result-placeholder');
    if (placeholder) placeholder.textContent = 'Konfigurasi tidak tersedia.';
    setError($('#result-error'), 'Konfigurasi tidak dapat dimuat; hasil belum bisa dihitung.');
  }

  const checklistResult = await checklistPromise;
  if (checklistResult.ok) {
    state.checklist = normalizeChecklist(checklistResult.data);
  } else {
    setError($('#checklist-error'), 'Checklist gagal dimuat: ' + checklistResult.err.message);
  }
  if (state.config) renderChecklist();

  if (state.config) {
    evaluate();
    computePrice();
  }
}

init().catch(function (err) {
  setError($('#config-error'), 'Aplikasi gagal dimulai: ' + (err && err.message ? err.message : 'kesalahan tak terduga'));
});
