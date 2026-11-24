const studio = (() => {
  const key = KEY + ':architecture-studio-v1';
  let enterpriseMode = false;
  let sandboxDraft;
  const undo = [], redo = [], selected = new Set();
  const home = { x: 0, y: 0, w: 1040, h: 640 };
  let project = studioEmpty(), view = { ...home }, source = '', selectionZone = '', report, drag, clipboard;
  let grid = true, pan = false, linkMode = false, linkType = 'traffic', choice = 'Web';
  let storageMessage = 'Сохраняется в браузере';
  try {
    const raw = localStorage.getItem(key);
    if (raw) project = studioParse(raw);
  } catch {
    storageMessage = 'Черновик не удалось прочитать. Можно восстановить проект из JSON.';
  }

  const byId = id => project.nodes.find(n => n.id === id);
  const zone = () => project.zones.find(z => z.id === selectionZone);
  const id = () => 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const snap = v => Math.max(-12000, Math.min(12000, grid ? Math.round(v / 20) * 20 : Math.round(v)));
  const visible = () => page === 'studio';
  const attr = box => [box.x, box.y, box.w, box.h].join(' ');

  function persist() {
    if (enterpriseMode) {
      state.enterpriseDraft = structuredClone(project);
      save();
      storageMessage = storageOK ? 'Черновик миссии сохранён' : 'Черновик не записан. Скачай JSON.';
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(project));
      storageMessage = 'Черновик сохранён';
    } catch {
      storageMessage = 'Черновик не записан. Скачай JSON.';
    }
  }

  function change(edit) {
    const previous = structuredClone(project);
    try {
      edit();
      if (enterpriseMode) project.mission = '';
      project = studioParse(project);
    } catch (error) {
      project = previous;
      toast(error.message);
      draw();
      return;
    }
    undo.push(previous);
    if (undo.length > 60) undo.shift();
    redo.length = 0;
    report = undefined;
    persist();
    draw();
  }

  function history(from, to) {
    if (!from.length) return;
    to.push(project);
    project = from.pop();
    selected.clear();
    selectionZone = source = '';
    report = undefined;
    persist();
    draw();
  }

  function artwork(box = view, prefix = 'studio', interactive = true) {
    const marker = type => prefix + '-' + type;
    return `<svg xmlns="http://www.w3.org/2000/svg" id="${prefix}" viewBox="${attr(box)}" role="img" aria-label="Архитектура проекта"><defs>
      <pattern id="${prefix}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#425252"/></pattern>
      ${Object.entries(studioTypes).map(([type, [, color]]) => `<marker id="${marker(type)}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker>`).join('')}</defs>
      <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#101717"/>
      ${grid ? `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="url(#${prefix}-grid)"/>` : ''}
      <g font-family="system-ui, sans-serif">
      ${project.zones.map(z => `<g ${interactive ? `data-zone="${z.id}"` : ''}><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14" fill="#203635" fill-opacity=".48" stroke="${interactive && selectionZone === z.id ? '#a4f0c9' : '#557673'}" stroke-dasharray="7 4"/><text x="${z.x + 14}" y="${z.y + 24}" fill="#c0d9d3" font-size="15">${esc(z.name)}</text></g>`).join('')}
      ${project.links.map(l => {
        const a = byId(l.from), b = byId(l.to), [, color] = studioTypes[l.type];
        const dx = b.x - a.x, dy = b.y - a.y;
        const end = Math.min(.45, Math.min(67 / Math.abs(dx), 26 / Math.abs(dy)));
        const x = b.x - dx * end, y = b.y - dy * end;
        return `<line x1="${a.x}" y1="${a.y}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="2.5" ${l.type === 'traffic' ? '' : 'stroke-dasharray="6 4"'} marker-end="url(#${marker(l.type)})"/><text x="${(a.x + x) / 2}" y="${(a.y + y) / 2 - 6}" fill="${color}" font-size="12" text-anchor="middle">${esc(l.label || studioTypes[l.type][0])}</text>`;
      }).join('')}
      ${project.nodes.map(n => `<g ${interactive ? `data-node="${n.id}"` : ''} transform="translate(${n.x} ${n.y})"><rect x="-64" y="-24" width="128" height="48" rx="8" fill="#263836" stroke="${interactive && (selected.has(n.id) || source === n.id) ? '#a4f0c9' : '#698882'}"/><text y="-2" fill="#eef5f0" font-size="13" text-anchor="middle">${studioKinds[n.kind].icon} ${esc(n.name.slice(0, 16))}</text><text y="15" fill="#aec8c1" font-size="11" text-anchor="middle">${esc((n.ip || n.kind).slice(0, 20))}</text><title>${esc([n.name, n.ip, n.port, n.protocol].filter(Boolean).join(' · '))}</title></g>`).join('')}
      </g></svg>`;
  }

  function bounds() {
    const xs = [0, home.w], ys = [0, home.h];
    for (const n of project.nodes) { xs.push(n.x - 80, n.x + 80); ys.push(n.y - 45, n.y + 45); }
    for (const z of project.zones) { xs.push(z.x - 10, z.x + z.w + 10); ys.push(z.y - 10, z.y + z.h + 10); }
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  const button = (name, action, disabled = false) =>
    `<button type="button" class="btn" data-action="${action}" ${disabled ? 'disabled' : ''}>${name}</button>`;
  const input = (label, name, value, number = false) =>
    `<label class="field">${label}<input name="${name}" value="${esc(value)}" ${number ? 'type="number" required' : 'type="text" maxlength="100"'}></label>`;

  function inspector() {
    const n = selected.size === 1 ? byId([...selected][0]) : null;
    const z = zone();
    if (n) return `<form data-form="node">${input('Название', 'name', n.name)}${input('IP / префикс', 'ip', n.ip)}
      ${input('Порт', 'port', n.port)}${input('Протокол', 'protocol', n.protocol)}<button class="btn" type="submit">Применить</button></form>`;
    if (z) return `<form data-form="zone">${input('Название зоны', 'name', z.name)}
      ${input('Ширина', 'w', z.w, true)}${input('Высота', 'h', z.h, true)}<button class="btn" type="submit">Применить</button></form>`;
    return `<p class="muted small">${selected.size ? 'Выбрано устройств: ' + selected.size : 'Выбери устройство или зону на схеме.'}</p>`;
  }

  function viewHTML() {
    return header(enterpriseMode ? 'Security Inspector · исходная схема' : 'Engineering Sandbox', 'Architecture Studio', 'Редактор схем и проверка инженерных решений') +
      (enterpriseMode ? '<div class="toolbar">' + btn('← К обследованию', "go('enterprise')") + '</div>' : '') +
      '<section id="studio-workspace" aria-label="Рабочее пространство редактора"></section>';
  }

  function draw() {
    const root = $('studio-workspace');
    if (!root || !visible()) return;
    const mission = studioMissions[project.mission];
    root.innerHTML = `
      ${enterpriseMode ? `<details class="studio-brief" open><summary>Цель миссии</summary><p>${enterpriseScenario.goal}</p>
        <ul>${enterprise.objectives(project).map(check => `<li>${check.passed ? '✓' : '○'} ${check.label}</li>`).join('')}</ul></details>` : ''}
      <div class="studio-toolbar">
        ${enterpriseMode ? '<strong>Исходная схема заказчика</strong>' : `<select data-select="mission" aria-label="Режим проекта"><option value="">Свободное проектирование</option>${Object.entries(studioMissions).map(([key, m]) => `<option value="${key}" ${key === project.mission ? 'selected' : ''}>${m.title}</option>`).join('')}</select>`}
        ${button('Отменить', 'undo', !undo.length)}${button('Повторить', 'redo', !redo.length)}
        ${button('Удалить', 'delete', !selected.size && !zone())}${button('На весь экран', 'fullscreen')}
        ${button('Новый проект', 'new')}${button('JSON', 'json')}${button('SVG', 'svg')}${button('PNG', 'png')}${button('Импорт', 'import')}
        <input type="file" accept=".json,application/json" id="studio-file" hidden>
      </div>
      ${mission ? `<div class="studio-brief"><strong>Задание</strong><p>${mission.brief}</p>${button('Проверить проект', 'check')}
        ${report ? `<p role="status"><strong>${report.score}% · ${report.passed ? 'Зачтено' : 'Нужна доработка'}</strong></p><ul>${report.checks.map(c => `<li>${c.passed ? '✓' : c.critical ? 'Критично' : 'Доработать'} · ${c.title}${c.passed ? '' : ' — ' + c.hint}</li>`).join('')}</ul>` : ''}</div>` : ''}
      <div class="studio-layout">
        <div class="studio-board">
          <div class="studio-toolbar">
            <select data-select="kind" aria-label="Компонент">${studioComponents.map(([label, icon, items]) => `<optgroup label="${label}">${Object.entries(items).map(([kind, name]) => `<option value="${esc(kind)}" ${kind === choice ? 'selected' : ''}>${icon} ${esc(kind === name ? name : kind + ' · ' + name)}</option>`).join('')}</optgroup>`).join('')}</select>
            <button type="button" class="btn" data-action="add" draggable="true">+ Устройство</button>${button('+ Зона', 'zone')}
            ${button(linkMode ? 'Связь ✓' : 'Связь', 'link')}${button(pan ? 'Панорама ✓' : 'Панорама', 'pan')}
            ${button(grid ? 'Сетка ✓' : 'Сетка', 'grid')}${button('−', 'out')}${button('+', 'in')}${button('Вписать', 'fit')}
          </div>
          <div class="studio-canvas" tabindex="0" aria-label="Холст. Shift или Ctrl добавляет объект к выделению">
            ${artwork()}
          </div>
          <div class="studio-footer"><span>${esc(storageMessage)}</span><span>${project.nodes.length} устройств · ${project.links.length} связей</span></div>
          <p class="small muted">Перетаскивай объекты. Shift или Ctrl добавляет устройство к выделению. В режиме «Связь» выбери источник, затем назначение.</p>
        </div>
        <div class="studio-inspector">
          <h2>Свойства</h2>${inspector()}
          <div class="studio-toolbar">${button('Группа', 'group', selected.size < 2)}${button('Разгруппировать', 'ungroup', !selected.size)}
            ${button('Копировать', 'copy', !selected.size)}${button('Вставить', 'paste', !clipboard)}</div>
          <h3>Связи</h3><label class="field">Тип новой связи<select data-select="type">${Object.entries(studioTypes).map(([type, [name]]) => `<option value="${type}" ${type === linkType ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
          ${source ? '<p class="small muted">Выбери устройство назначения.</p>' : ''}
          <div class="studio-links">${project.links.map((l, i) => `<form data-form="link" data-index="${i}"><small style="color:${studioTypes[l.type][1]}">${esc(byId(l.from).name)} → ${esc(byId(l.to).name)}</small>
            <input type="text" name="label" maxlength="100" value="${esc(l.label)}" placeholder="${studioTypes[l.type][0]}" aria-label="Подпись связи"><button class="btn" type="submit">Применить</button>${button('Удалить связь', 'unlink-' + i)}</form>`).join('')}</div>
          <div class="studio-minimap" title="Мини-карта">${artwork(bounds(), 'studio-map', false)}</div>
        </div>
      </div>`;
    root.onclick = event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action) run(action);
    };
    root.onchange = async event => {
      const { target } = event;
      if (target.dataset.select === 'mission') change(() => { project.mission = target.value; });
      if (target.dataset.select === 'kind') choice = target.value;
      if (target.dataset.select === 'type') linkType = target.value;
      if (target.id === 'studio-file' && target.files[0]) {
        try {
          const imported = studioParse(await target.files[0].text());
          if (confirm('Открыть проект вместо текущего черновика?')) {
            selected.clear(); selectionZone = source = '';
            change(() => { project = imported; view = bounds(); });
          }
        } catch (error) { toast(error.message); }
        finally { target.value = ''; }
      }
    };
    root.onsubmit = event => {
      event.preventDefault();
      const form = event.target, values = Object.fromEntries(new FormData(form));
      change(() => {
        if (form.dataset.form === 'node') Object.assign(byId([...selected][0]), values);
        if (form.dataset.form === 'zone') Object.assign(zone(), { name: values.name, w: Number(values.w), h: Number(values.h) });
        if (form.dataset.form === 'link') project.links[Number(form.dataset.index)].label = values.label;
      });
    };
    root.ondragstart = event => {
      if (event.target.dataset.action === 'add') event.dataTransfer.setData('text/plain', 'studio:' + choice);
    };
    const svg = $('studio');
    svg.onpointerdown = pointerDown;
    svg.onpointermove = pointerMove;
    svg.onpointerup = pointerUp;
    svg.onpointercancel = () => { drag = undefined; draw(); };
    svg.oncontextmenu = contextMenu;
    svg.ondragover = event => event.preventDefault();
    svg.ondrop = event => {
      event.preventDefault();
      const item = event.dataTransfer.getData('text/plain');
      if (item.startsWith('studio:') && Object.hasOwn(studioKinds, item.slice(7))) add(item.slice(7), point(event));
    };
  }

  function point(event) {
    const svg = $('studio');
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }

  function chooseNode(node, extend) {
    selectionZone = '';
    const group = node.group ? project.nodes.filter(n => n.group === node.group) : [node];
    const remove = extend && selected.has(node.id);
    if (!extend) selected.clear();
    for (const item of group) remove ? selected.delete(item.id) : selected.add(item.id);
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    const n = byId(event.target.closest('[data-node]')?.dataset.node);
    const z = event.target.closest('[data-zone]')?.dataset.zone;
    if (linkMode && n && !pan) {
      if (!source || source === n.id) { source = source === n.id ? '' : n.id; draw(); return; }
      const from = source;
      source = '';
      if (!project.links.some(l => l.from === from && l.to === n.id && l.type === linkType)) {
        change(() => project.links.push({ from, to: n.id, type: linkType, label: '' }));
      } else draw();
      return;
    }
    event.preventDefault();
    const extend = event.shiftKey || event.ctrlKey || event.metaKey;
    if (n && !pan && (extend || !selected.has(n.id))) chooseNode(n, extend);
    if (!n && !pan) { selectionZone = z || ''; selected.clear(); }
    drag = { start: point(event), screenX: event.clientX, screenY: event.clientY, box: { ...view },
      nodes: n && !pan ? project.nodes.filter(item => selected.has(item.id)) : [],
      zone: !n && !pan ? zone() : null, moved: false, panning: pan || (!n && !z) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    if (!drag) return;
    const { start, screenX, screenY, box } = drag;
    if (!drag.moved && Math.hypot(event.clientX - screenX, event.clientY - screenY) < 4) return;
    drag.moved = true;
    const next = point(event);
    if (drag.panning) {
      const scale = 1 / $('studio').getScreenCTM().a;
      view = { ...box, x: box.x - (event.clientX - screenX) * scale, y: box.y - (event.clientY - screenY) * scale };
      const svg = $('studio');
      svg.setAttribute('viewBox', attr(view));
      for (const rect of svg.querySelectorAll(':scope > rect')) {
        rect.setAttribute('x', view.x); rect.setAttribute('y', view.y);
      }
      return;
    }
    drag.dx = next.x - start.x;
    drag.dy = next.y - start.y;
    for (const n of drag.nodes) $('studio').querySelector(`[data-node="${n.id}"]`)
      .setAttribute('transform', `translate(${snap(n.x + drag.dx)} ${snap(n.y + drag.dy)})`);
    if (drag.zone) $('studio').querySelector(`[data-zone="${drag.zone.id}"]`)
      .setAttribute('transform', `translate(${drag.dx} ${drag.dy})`);
  }

  function pointerUp() {
    if (!drag) return;
    const { moved, panning, nodes, zone: movingZone, dx, dy } = drag;
    drag = undefined;
    if (!moved || panning) { draw(); return; }
    change(() => {
      for (const item of movingZone ? [movingZone] : nodes) {
        item.x = snap(item.x + dx);
        item.y = snap(item.y + dy);
      }
    });
  }

  function contextMenu(event) {
    const n = byId(event.target.closest('[data-node]')?.dataset.node);
    if (!n) return;
    event.preventDefault();
    chooseNode(n, false);
    draw();
    const menu = document.createElement('div');
    menu.className = 'studio-context';
    menu.style.left = Math.max(0, Math.min(event.clientX, innerWidth - 160)) + 'px';
    menu.style.top = Math.max(0, Math.min(event.clientY, innerHeight - 100)) + 'px';
    menu.innerHTML = button('Копировать', 'copy') + button('Удалить', 'delete');
    $('studio-workspace').append(menu);
    document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) menu.remove(); }, { once: true });
  }

  function add(kind, position) {
    if (!position) {
      const x = view.x + view.w / 2, y = view.y + view.h / 2;
      const spots = [[0, 0], [160, 0], [-160, 0], [0, 80], [0, -80], [160, 80], [-160, 80]];
      const offset = spots.find(([dx, dy]) => project.nodes.every(n =>
        Math.abs(n.x - (x + dx)) >= 140 || Math.abs(n.y - (y + dy)) >= 54));
      position = { x: x + (offset?.[0] ?? 0), y: y + (offset?.[1] ?? 0) };
    }
    const node = { id: id(), kind, name: studioKinds[kind].name, x: snap(position.x), y: snap(position.y), ip: '', port: '', protocol: '', group: '' };
    selected.clear(); selected.add(node.id); selectionZone = '';
    change(() => project.nodes.push(node));
  }

  function exportImage(format) {
    const blob = new Blob([artwork(bounds(), 'studio-export', false)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const download = href => {
      const anchor = document.createElement('a');
      anchor.download = 'architecture.' + format;
      anchor.href = href;
      anchor.click();
    };
    if (format === 'svg') { download(url); setTimeout(() => URL.revokeObjectURL(url), 1000); return; }
    const image = new Image(), box = bounds();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(2, 2400 / Math.max(box.w, box.h));
        canvas.width = Math.ceil(box.w * scale);
        canvas.height = Math.ceil(box.h * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        download(canvas.toDataURL('image/png'));
      } catch { toast('Не удалось создать PNG. Доступен экспорт SVG.'); }
      finally { URL.revokeObjectURL(url); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); toast('Не удалось создать PNG.'); };
    image.src = url;
  }

  function run(action) {
    if (action === 'undo') return history(undo, redo);
    if (action === 'redo') return history(redo, undo);
    if (action === 'add') return add(choice);
    if (action === 'new') {
      if ((project.nodes.length || project.zones.length) && !confirm('Очистить холст? Перед этим можно скачать проект в JSON.')) return;
      selected.clear(); selectionZone = source = '';
      return change(() => { project = studioEmpty(); view = { ...home }; });
    }
    if (action === 'zone') return change(() => {
      selectionZone = id(); selected.clear();
      project.zones.push({ id: selectionZone, name: 'Сетевой сегмент', x: snap(view.x + 100), y: snap(view.y + 100), w: 280, h: 200 });
    });
    if (action === 'delete') return change(() => {
      project.nodes = project.nodes.filter(n => !selected.has(n.id));
      project.links = project.links.filter(l => !selected.has(l.from) && !selected.has(l.to));
      project.zones = project.zones.filter(z => z.id !== selectionZone);
      selected.clear(); selectionZone = source = '';
    });
    if (action === 'group' || action === 'ungroup') return change(() => {
      const group = action === 'group' ? id() : '';
      for (const n of project.nodes) if (selected.has(n.id)) n.group = group;
    });
    if (action === 'copy') clipboard = structuredClone({
      nodes: project.nodes.filter(n => selected.has(n.id)),
      links: project.links.filter(l => selected.has(l.from) && selected.has(l.to))
    });
    if (action === 'paste' && clipboard?.nodes.length) return change(() => {
      const ids = new Map(), groups = new Map();
      selected.clear(); selectionZone = '';
      for (const n of clipboard.nodes) {
        const fresh = id();
        ids.set(n.id, fresh);
        if (n.group && !groups.has(n.group)) groups.set(n.group, id());
        project.nodes.push({ ...n, id: fresh, group: groups.get(n.group) || '', x: snap(n.x + 40), y: snap(n.y + 40) });
        selected.add(fresh);
      }
      for (const l of clipboard.links) project.links.push({ ...l, from: ids.get(l.from), to: ids.get(l.to) });
    });
    if (action.startsWith('unlink-')) return change(() => project.links.splice(Number(action.slice(7)), 1));
    if (action === 'json') return downloadJSON(project, 'architecture.json');
    if (action === 'svg' || action === 'png') return exportImage(action);
    if (action === 'import') return $('studio-file').click();
    if (action === 'fullscreen') {
      const request = document.fullscreenElement ? document.exitFullscreen() : $('studio-workspace').requestFullscreen?.();
      request?.catch(() => toast('Полноэкранный режим недоступен'));
      return;
    }
    if (action === 'check') {
      report = studioEvaluate(project);
      if (report.passed) recordGame('range-studio-' + project.mission, report.score);
    }
    if (action === 'link') { linkMode = !linkMode; pan = false; source = ''; }
    if (action === 'pan') { pan = !pan; linkMode = false; source = ''; }
    if (action === 'grid') grid = !grid;
    if (action === 'fit') view = bounds();
    if (action === 'in' || action === 'out') {
      const w = Math.min(48000, Math.max(200, view.w * (action === 'in' ? .8 : 1.25)));
      const h = view.h * w / view.w;
      view = { x: view.x + (view.w - w) / 2, y: view.y + (view.h - h) / 2, w, h };
    }
    draw();
  }

  function bind() {
    document.addEventListener('keydown', event => {
      if (!visible() || event.target.closest('input,select,textarea,[contenteditable]')) return;
      const ctrl = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
      const action = ctrl ? { z: event.shiftKey ? 'redo' : 'undo', y: 'redo', c: 'copy', v: 'paste' }[key]
        : { delete: 'delete', '+': 'in', '-': 'out' }[key];
      if (!action) return;
      event.preventDefault();
      run(action);
    });
  }

  function openMission() {
    openSandbox();
    if (project.mission !== 'shop') change(() => { project.mission = 'shop'; });
  }

  function switchProject(next, mode) {
    project = next;
    enterpriseMode = mode;
    selected.clear();
    selectionZone = source = '';
    undo.length = redo.length = 0;
    report = drag = undefined;
    view = bounds();
  }

  function openSandbox() {
    if (enterpriseMode) {
      switchProject(sandboxDraft, false);
      storageMessage = 'Сохраняется в браузере';
    }
    go('studio');
  }

  function openEnterprise() {
    const next = enterprise.seed(state.enterpriseDraft);
    next.mission = '';
    if (!enterpriseMode) {
      sandboxDraft = project;
      switchProject(next, true);
    }
    else project = next;
    persist();
    go('studio');
  }

  return { viewHTML, draw, bind, openMission, openSandbox, openEnterprise, isEnterprise: () => enterpriseMode };
})();
