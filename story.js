/* Five scenes: establish the gap, explain the limit, reveal the funding,
   follow the catch-up, and hold the final comparison. Source data is unchanged. */
(function () {
  'use strict';
  const D = window.STORY_DATA;
  const RIVALS = ['mufc', 'lfc', 'afc', 'cfc', 'thfc'];
  const CLUBS = { city: 'Man City', mufc: 'Man United', lfc: 'Liverpool', afc: 'Arsenal', cfc: 'Chelsea', thfc: 'Spurs', other14: 'Other 14 clubs · average' };
  const disputedSeasons = Object.keys(D.disputed);
  const adjusted = Object.fromEntries(disputedSeasons.map(s => [s, D.revenue.city[s] - D.disputed[s]]));
  const ownerTotal = disputedSeasons.reduce((sum, s) => sum + D.disputed[s], 0);
  const periodRevenue = disputedSeasons.reduce((sum, s) => sum + D.revenue.city[s], 0);
  const other14 = Object.fromEntries(D.seasons.filter(s => D.revenue.avg[s] != null).map(s => [s,
    (D.revenue.avg[s] * 20 - ['city', ...RIVALS].reduce((sum, id) => sum + D.revenue[id][s], 0)) / 14
  ]));
  const money = v => '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'm';
  const integerMoney = v => '£' + Math.round(v).toLocaleString('en-GB') + 'm';
  const seasonLabel = s => s.replace('-', '–');

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function setStat(name, value) {
    document.querySelectorAll('[data-stat="' + name + '"]').forEach(el => { el.textContent = value; });
  }
  setStat('share', Math.round(ownerTotal / periodRevenue * 100) + 'p');
  setStat('owner-total', money(ownerTotal));
  setStat('sponsor-share', Math.round(ownerTotal / 949.9 * 100) + '%');
  setStat('start-ratio', (D.revenue.mufc['2008-09'] / D.revenue.city['2008-09']).toFixed(1) + '×');
  setStat('today-ratio', (D.revenue.city['2024-25'] / other14['2024-25']).toFixed(1));

  // Horizontal bars share a zero baseline and one scale within each comparison.
  function makeBars(target, rows, max) {
    const container = document.getElementById(target);
    for (const row of rows) {
      const item = element('div', 'bar-row');
      if (row.id) item.dataset.club = row.id;
      const label = element('div', 'bar-label');
      label.append(element('span', '', row.label), element('b', '', row.valueLabel || money(row.total)));
      const track = element('div', 'bar-track');
      track.setAttribute('aria-hidden', 'true');
      for (const segment of row.segments) {
        const fill = element('span', 'bar-segment ' + segment.cls);
        fill.style.width = (segment.value / max * 100) + '%';
        track.append(fill);
      }
      item.append(label, track);
      if (row.detail) item.append(element('p', 'bar-detail', row.detail));
      container.append(item);
    }
  }
  const clubRow = (id, season, split = false) => ({
    id, label: CLUBS[id], total: D.revenue[id][season],
    segments: split ? [{ cls: 'adjusted', value: adjusted[season] }, { cls: 'owner', value: D.disputed[season] }] : [{ cls: id === 'city' ? 'city' : 'rival', value: D.revenue[id][season] }]
  });
  makeBars('gap-bars', [clubRow('mufc', '2008-09'), clubRow('city', '2008-09')], 300);
  makeBars('rule-bars', [
    { label: 'Established club', total: 1005, valueLabel: '£1,005m', segments: [{ cls: 'rival', value: 900 }, { cls: 'allowance', value: 105 }], detail: '£900m income + £105m permitted loss' },
    { label: 'Challenger', total: 405, valueLabel: '£405m', segments: [{ cls: 'rival', value: 300 }, { cls: 'allowance', value: 105 }], detail: '£300m income + £105m permitted loss' }
  ], 1005);
  const comparisonClubs = ['city', ...RIVALS].sort((a, b) => D.revenue[b]['2017-18'] - D.revenue[a]['2017-18']);
  makeBars('comparison-bars', comparisonClubs.map(id => clubRow(id, '2017-18', id === 'city')), 600);
  makeBars('today-bars', [clubRow('city', '2024-25'), {
    id: 'other14', label: CLUBS.other14, total: other14['2024-25'], segments: [{ cls: 'other14', value: other14['2024-25'] }]
  }], 750);

  // Only the catch-up scene uses a time series. No charting CDN is required.
  const box = document.getElementById('chart');
  const svg = document.getElementById('timeline-svg');
  const tip = document.getElementById('tooltip');
  const timelineSeasons = D.seasons.filter(s => +s.slice(0, 4) <= 2017);
  const takeoverIndex = timelineSeasons.indexOf('2008-09');
  const NS = 'http://www.w3.org/2000/svg';
  let current = 'gap';
  let inlineCharts = window.innerWidth < 900;
  let geometry = null;
  let crosshair = null;
  let focusIndex = null;

  function svgNode(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    if (text != null) node.textContent = text;
    svg.append(node);
    return node;
  }
  function drawTimeline() {
    if (current !== 'timeline' && !inlineCharts) return;
    const r = box.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (w < 1 || h < 1) return;
    const left = w < 440 ? 37 : 46, right = w - 65, top = 15, bottom = h - 27;
    const x = i => left + i / (timelineSeasons.length - 1) * (right - left);
    const y = value => bottom - value / 650 * (bottom - top);
    geometry = { x, y, left, right, top, bottom };
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgNode('title', { id: 'timeline-svg-title' }, 'The revenue gap between United and City widened until 2008–09, then closed, but City stayed below United throughout 2002–03 to 2017–18.');
    svgNode('desc', { id: 'timeline-svg-desc' }, 'United rises from £174.9m to £589.8m. City rises from £49.1m to £503.5m. Red shading shows owner money booked as sponsorship from 2009–10 onwards. The dashed line subtracts those sums; it is not a counterfactual. Exact values are in the data table.');
    for (const value of [0, 200, 400, 600]) {
      svgNode('line', { x1: left, x2: right, y1: y(value), y2: y(value), class: 'chart-grid' });
      svgNode('text', { x: left - 7, y: y(value) + 3, 'text-anchor': 'end', class: 'axis-label' }, '£' + value);
    }
    const lastIndex = timelineSeasons.length - 1;
    const ticks = w < 460 ? [0, takeoverIndex, lastIndex] : [0, 3, takeoverIndex, 11, lastIndex];
    svgNode('line', { x1: x(takeoverIndex), x2: x(takeoverIndex), y1: top + 14, y2: bottom, class: 'chart-marker' });
    svgNode('text', { x: x(takeoverIndex) + 5, y: top + 10, class: 'axis-label' }, 'Abu Dhabi takeover');
    for (const i of ticks) svgNode('text', { x: x(i), y: h - 7, 'text-anchor': 'middle', class: 'axis-label' }, seasonLabel(timelineSeasons[i]));
    const points = values => timelineSeasons.map((s, i) => values[s] == null ? null : [x(i), y(values[s])]).filter(Boolean);
    const path = pts => pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.join(',')).join(' ');
    const topPoints = timelineSeasons.map((s, i) => adjusted[s] == null ? null : [x(i), y(D.revenue.city[s])]).filter(Boolean);
    svgNode('path', { d: path(topPoints) + ' ' + points(adjusted).reverse().map(p => 'L' + p.join(',')).join(' ') + ' Z', class: 'owner-area' });
    for (const [values, cls, label] of [[D.revenue.mufc, 'united', 'United'], [D.revenue.city, 'reported', 'City reported'], [adjusted, 'adjusted', 'City without the owner money']]) {
      svgNode('path', { d: path(points(values)), class: 'chart-line ' + cls });
      const final = values['2017-18'];
      svgNode('text', { x: right + 8, y: y(final) + 4, class: 'end-label', 'aria-label': label + ': ' + money(final) }, integerMoney(final));
    }
    crosshair = svgNode('line', { y1: top, y2: bottom, class: 'crosshair', visibility: 'hidden' });
    if (focusIndex != null && !tip.hidden) showSeason(focusIndex);
  }
  function hideTip() {
    tip.hidden = true;
    if (crosshair) crosshair.setAttribute('visibility', 'hidden');
  }
  function showSeason(index) {
    if (!geometry || (current !== 'timeline' && !inlineCharts)) return;
    const season = timelineSeasons[index];
    crosshair.setAttribute('x1', geometry.x(index));
    crosshair.setAttribute('x2', geometry.x(index));
    crosshair.setAttribute('visibility', 'visible');
    tip.replaceChildren(element('p', '', seasonLabel(season)));
    const rows = [['United', D.revenue.mufc[season]], ['City reported', D.revenue.city[season]]];
    if (adjusted[season] != null) rows.push(['City without the owner money', adjusted[season]], ['Owner money booked as sponsorship', D.disputed[season]]);
    for (const [label, value] of rows) {
      const row = element('div', label === 'Owner money booked as sponsorship' ? 'tt-owner' : '');
      row.append(element('span', '', label), element('b', '', money(value)));
      tip.append(row);
    }
    tip.hidden = false;
  }
  function pointerSeason(event) {
    if (!geometry || (current !== 'timeline' && !inlineCharts)) return;
    const px = event.clientX - box.getBoundingClientRect().left;
    focusIndex = Math.max(0, Math.min(timelineSeasons.length - 1, Math.round((px - geometry.left) / (geometry.right - geometry.left) * (timelineSeasons.length - 1))));
    showSeason(focusIndex);
  }
  box.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') pointerSeason(event); });
  box.addEventListener('click', pointerSeason);
  box.addEventListener('pointerleave', hideTip);
  box.addEventListener('keydown', event => {
    if (event.key === 'Escape') { hideTip(); return; }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    focusIndex = focusIndex == null ? (event.key === 'ArrowLeft' ? timelineSeasons.length - 1 : 0) : Math.max(0, Math.min(timelineSeasons.length - 1, focusIndex + (event.key === 'ArrowRight' ? 1 : -1)));
    showSeason(focusIndex);
  });
  box.addEventListener('blur', hideTip);

  const steps = [...document.querySelectorAll('.step[data-state]')];
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const navLinks = [...document.querySelectorAll('.chapter-nav a')];
  let activeStep = null;
  function pickStep() {
    const line = window.innerHeight * (inlineCharts ? .3 : .52);
    let pick = steps[0];
    for (const step of steps) if (step.getBoundingClientRect().top < line) pick = step;
    if (pick === activeStep) return;
    activeStep = pick;
    current = pick.dataset.state;
    hideTip();
    focusIndex = null;
    steps.forEach(step => step.classList.toggle('is-active', step === pick));
    scenes.forEach(scene => { scene.hidden = !inlineCharts && scene.dataset.scene !== current; });
    navLinks.forEach(link => {
      if (link.hash === '#' + pick.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('scene-progress').textContent = String(steps.indexOf(pick) + 1).padStart(2, '0') + ' / 05';
    if (current === 'timeline') requestAnimationFrame(drawTimeline);
  }
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; pickStep(); });
  }, { passive: true });
  // On phones, keep each visual immediately below its chapter heading. Restore
  // the single pinned stage on desktop. Reuse nodes to preserve controls/data.
  function syncLayout() {
    inlineCharts = window.innerWidth < 900;
    for (const scene of scenes) {
      if (inlineCharts) {
        const step = steps.find(s => s.dataset.state === scene.dataset.scene);
        step.querySelector('h2').after(scene);
      } else {
        document.querySelector('.graphic').append(scene);
      }
    }
    activeStep = null;
    pickStep();
    requestAnimationFrame(drawTimeline);
  }
  let layoutIsInline = null;
  window.addEventListener('resize', () => {
    if ((window.innerWidth < 900) !== layoutIsInline) {
      layoutIsInline = window.innerWidth < 900;
      syncLayout();
    } else pickStep();
  });
  window.addEventListener('pageshow', pickStep);
  new ResizeObserver(drawTimeline).observe(box);

  function buildTable() {
    const table = document.getElementById('data-table');
    const cols = [
      ['city', 'City reported'], ['disputed', 'Owner money booked as sponsorship'], ['adjusted', 'City without the owner money'],
      ['mufc', 'United'], ['lfc', 'Liverpool'], ['afc', 'Arsenal'], ['cfc', 'Chelsea'], ['thfc', 'Spurs'], ['avg', 'PL average'], ['other14', 'Other 14 average']
    ];
    const head = table.createTHead().insertRow();
    for (const label of ['Season', ...cols.map(c => c[1])]) {
      const cell = element('th', '', label); cell.scope = 'col'; head.append(cell);
    }
    const body = table.createTBody();
    for (const season of D.seasons) {
      const row = body.insertRow();
      const heading = element('th', '', seasonLabel(season)); heading.scope = 'row'; row.append(heading);
      for (const [id] of cols) {
        const value = id === 'disputed' ? D.disputed[season] : id === 'adjusted' ? adjusted[season] : id === 'other14' ? other14[season] : D.revenue[id][season];
        const cell = row.insertCell();
        cell.textContent = value == null ? '–' : value.toFixed(1);
        if (id === 'disputed') cell.className = 'red';
      }
    }
  }
  buildTable();
  layoutIsInline = inlineCharts;
  syncLayout();
})();
