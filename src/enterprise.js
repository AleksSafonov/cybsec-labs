const enterprise = (() => {
  const config = enterpriseScenario;
  const game = 'security-inspector';
  const items = config.scenes.flatMap(scene => scene.items);
  let selected = '', showReport = false, tutorialOpen = false;

  function openTutorial() {
    tutorialOpen = true;
    if (page !== 'enterprise') go('enterprise');
    const guide = $('survey-tutorial');
    guide.open = true;
    guide.scrollIntoView?.({ block: 'start' });
    guide.querySelector?.('summary')?.focus();
  }

  function tutorial() {
    return `<details class="card survey-guide" id="survey-tutorial" ${tutorialOpen ? 'open' : ''} ontoggle="enterprise.rememberTutorial(this.open)">
      <summary><strong>Туториал · как пройти миссию</strong><span class="muted small">5 шагов от первого интервью до защиты</span></summary>
      <ol>
        <li><strong>Начни с переговорной.</strong> Под брифингом нажми <b>«Переговорная»</b>, затем точку на фотографии или кнопку <b>«Марина · владелец продаж»</b> под ней. В карточке нажми <b>«Какой процесс нельзя остановить?»</b>. Так же открой протокол встречи. Значок ✓ означает, что сведения добавлены в журнал.</li>
        <li><strong>Собери материалы во всех семи локациях.</strong> У каждого помещения по два объекта. Сначала исследуй <b>Отдел ИТ → Серверная → Отдел ИБ → Офис</b>, затем <b>Юридический отдел → Центр мониторинга</b>. Юрист отвечает после изучения реестра данных, аналитик — после осмотра витрины. Для витрины, базы, резервного хранилища и рабочего места после осмотра нажми <b>«Внести в опись»</b>.</li>
        <li><strong>Заполни рабочую книгу.</strong> Нажми <b>«Опись и риски»</b>. Проверь, что в описи <b>4/4</b>, нажми <b>«Сопоставить схему, интервью и осмотр»</b>. Выбери предварительную границу обследования. В каждом из трёх рисков выбери актив и следующий шаг, затем отдельно нажми <b>«Сохранить риск»</b>.</li>
        <li><strong>Покажи поток на схеме.</strong> Нажми <b>«Схема · этап миссии» → «Связь»</b>. Оставь тип <b>«Рабочий трафик»</b>. Нажми сначала <b>веб-витрину</b>, затем <b>базу заказов</b>. Должна появиться стрелка к базе. Ошибочную связь можно отменить кнопкой <b>«Отменить»</b>. Нажми <b>«← К обследованию»</b>.</li>
        <li><strong>Сдай отчёт.</strong> Нажми <b>«Защита» → «Защитить результаты»</b>. При <b>4/4</b> целей миссия зачтена. Если что-то пропущено, итоговый разбор подскажет, что исправить. Черновик сохраняется автоматически.</li>
      </ol>
      <details><summary>Подсказка по описи и рискам</summary>
        <p>Базу заказов добавь из карточки администратора в Отделе ИТ. Витрину и резервное хранилище добавь из Серверной, рабочее место — из Офиса.</p>
        <p>Для копий свяжи резервное хранилище с испытанием восстановления. Для мониторинга свяжи базу заказов с проверкой контрольного события. Для сегментации свяжи базу заказов со сверкой фактических зон и правил доступа.</p>
      </details>
      <div class="toolbar"><a class="btn primary" href="#survey-locations">К локациям ↓</a><a class="btn" href="#survey-workbook">К рабочей книге ↓</a></div>
    </details>`;
  }

  function progress() {
    const saved = state.enterprise;
    const scene = Number.isInteger(saved?.scene) && config.scenes[saved.scene] ? saved.scene : 0;
    const evidence = Array.isArray(saved?.evidence) ? saved.evidence.filter(id => items.some(item => item.id === id)) : [];
    const answers = Object.fromEntries(config.decisions.filter(d => Number.isInteger(saved?.answers?.[d.id]) &&
      d.choices[saved.answers[d.id]]).map(d => [d.id, saved.answers[d.id]]));
    const registry = Array.isArray(saved?.registry) ? saved.registry.filter(id => Object.hasOwn(config.assets, id)) : [];
    const risks = Object.fromEntries(Object.keys(config.findings)
      .filter(id => Object.hasOwn(config.assets, saved?.risks?.[id]?.asset) &&
        Object.hasOwn(config.measures, saved?.risks?.[id]?.measure))
      .map(id => [id, saved.risks[id]]));
    const scope = ['unknown', 'personal', 'none'].includes(saved?.scope) ? saved.scope : 'unknown';
    const notes = typeof saved?.notes === 'string' ? saved.notes.slice(0, 2500) : '';
    return { scene, evidence, answers, registry, risks, scope, notes, reconciled: saved?.reconciled === true };
  }

  function objectives(draft = state.enterpriseDraft, data = progress()) {
    const has = id => data.evidence.includes(id);
    const checks = [
      { label: 'Инвентаризация', passed: ['web', 'admin', 'backup', 'terminal'].every(id => has(id) && data.registry.includes(id)),
        hint: 'Обследуй и внеси в опись витрину, БД, резервное хранилище и рабочее место.' },
      { label: 'Границы комплаенса', passed: data.scope === 'personal' && ['data', 'lawyer', 'data-policy', 'branch', 'owner'].every(has)
          && ['web', 'admin'].every(id => data.registry.includes(id)),
        hint: 'Сверь реестр и регламент, поговори с юристом и проследи поток заказа. Витрина принимает ПДн, БД обрабатывает и хранит их.' },
      { label: 'Реестр рисков и план проверок',
        passed: ['scope', 'analyst'].every(has) && Object.entries(config.findings).every(([id, risk]) =>
          has(id) && data.registry.includes(risk.asset) && data.risks[id]?.asset === risk.asset && data.risks[id]?.measure === risk.measure),
        hint: 'По каждому из трёх наблюдений укажи затронутый актив и следующий проверяемый шаг. Проверь ограничения работ и запроси комментарий аналитика.' }
    ];
    let mapped = false;
    try {
      const project = studioParse(draft);
      const web = project.nodes.find(n => n.id === 'survey-web' && n.kind === 'Web');
      const db = project.nodes.find(n => n.id === 'survey-admin' && n.kind === 'DB');
      mapped = Boolean(web && db && rangeEngine.reachable(project, web.id, db.id, 'traffic') &&
        !rangeEngine.reachable(project, db.id, web.id, 'traffic'));
    } catch { /* Черновик ещё не создан или не прошёл проверку формата. */ }
    checks.splice(2, 0, { label: 'Исходная архитектура', passed: mapped && data.reconciled && has('web') && has('admin') && has('old-map'),
      hint: 'Сопоставь старую схему, интервью и осмотр. На черновике покажи рабочий поток от обследованной витрины к БД.' });
    return checks;
  }

  function seed(draft) {
    let project;
    try { project = studioParse(draft); } catch { project = studioEmpty(); }
    const { evidence } = progress();
    items.filter(item => item.component && evidence.includes(item.id)).forEach(item => {
      const id = 'survey-' + item.id;
      if (project.nodes.some(node => node.id === id)) return;
      const spot = { admin: [700, 280], web: [260, 180], backup: [700, 440] };
      const [x, y] = spot[item.id];
      project.nodes.push({ id, kind: item.component, name: studioKinds[item.component].name, x, y, ip: '', port: '', protocol: '', group: '' });
    });
    return project;
  }

  function view() {
    const data = progress();
    const scene = config.scenes[data.scene];
    const active = scene.items.find(item => item.id === selected);
    const checks = objectives(undefined, data);
    const count = checks.filter(check => check.passed).length;
    const status = state.games[game]?.score === 100;
    return header('Security Inspector · ' + config.operation, config.title, config.goal) + `
      ${tutorial()}
      <div class="toolbar">${btn('← Кампания', "go('range')")}<a href="#survey-workbook" class="btn">Опись и риски</a>${btn('Схема · этап миссии', 'studio.openEnterprise()', 'primary')}<a href="#survey-defense" class="btn">Защита</a></div>
      <details class="card survey-brief" ${data.evidence.length ? '' : 'open'}><summary><strong>Брифинг · миссия 01</strong></summary>
        <p>Ты инженер ИБ на обследовании торговой сети. Заказчик ждёт схему текущей инфраструктуры, перечень неизвестных и предложения по проверкам.</p>
        <p>${config.constraint} Учебное время — 20–30 минут. Награда за первый зачёт — 30 XP.</p>
        ${btn('Подготовка · модель угроз', 'openLesson(11)')}
      </details>
      <div class="survey-layout">
        <section id="survey-locations" aria-label="Интерактивная карта организации">
          <div class="toolbar survey-map">${config.scenes.map((place, index) =>
            `<button class="btn ${index === data.scene ? 'primary' : ''}" aria-pressed="${index === data.scene}" onclick="enterprise.visit(${index})">${place.name} · ${place.items.filter(item => data.evidence.includes(item.id)).length}/${place.items.length}</button>`).join('')}</div>
          <h2>${scene.name}</h2><p class="muted">${scene.intro}</p>
          <div class="survey-scene"><img src="content/inspector-scenes/${scene.image}.jpg" alt="" width="1619" height="971" decoding="async">${scene.items.map(item =>
            `<button class="survey-hotspot" style="--x:${item.x}%;--y:${item.y}%" aria-label="${esc(item.name)}" onclick="enterprise.inspect('${item.id}')">${data.evidence.includes(item.id) ? '✓' : item.icon}</button>`).join('')}</div>
          <div class="toolbar">${scene.items.map(item => btn(item.name, `enterprise.inspect('${item.id}')`)).join('')}</div>
          ${active ? `<div class="card" id="survey-object"><h3>${active.name}</h3>
            ${data.evidence.includes(active.id) ? `<p>${active.evidence}</p>` :
              active.requires && !data.evidence.includes(active.requires) ?
                `<p>Сначала запроси материал «${items.find(item => item.id === active.requires).name}».</p>` :
                btn(active.prompt, `enterprise.collect('${active.id}')`, 'primary')}
            ${Object.hasOwn(config.assets, active.id) && data.evidence.includes(active.id) && !data.registry.includes(active.id) ?
              btn('Внести в опись', `enterprise.register('${active.id}')`) : ''}</div>` : ''}
        </section>
        <section class="card" aria-label="Цели миссии">
          <h2>Цели · ${count}/${checks.length}</h2>${bar(100 * count / checks.length)}
          <ul>${checks.map(check => `<li>${check.passed ? '✓ ' : '○ '}${check.label}</li>`).join('')}</ul>
          <details><summary>Журнал доказательств · ${data.evidence.length}</summary>
            ${items.filter(item => data.evidence.includes(item.id)).map(item => `<p><strong>${item.name}.</strong> ${item.evidence}</p>`).join('') || '<p>Здесь появятся ответы и материалы обследования.</p>'}</details>
        </section>
      </div>
      <section id="survey-workbook" class="survey-decisions" aria-label="Рабочая книга аудитора"><h2>Рабочая книга аудитора</h2>
        <div class="card"><h3>Опись активов · ${data.registry.length}/4</h3>
          <p>${data.registry.map(id => config.assets[id]).join(' · ') || 'Осмотри объект и внеси его в опись из карточки.'}</p>
          ${['old-map', 'admin', 'web'].every(id => data.evidence.includes(id)) ?
            data.reconciled ? '<p>Сверка: в ИТ-17 одна ВМ. Интервью и осмотр показывают два узла после миграции.</p>' :
              btn('Сопоставить схему, интервью и осмотр', 'enterprise.reconcile()') : '<p class="muted">Для сверки нужны схема ИТ-17, интервью администратора и осмотр витрины.</p>'}
          <label class="field">Предварительная граница обследования<select onchange="enterprise.scope(this.value)">
            ${options({unknown:'Не определена',personal:'Обработка ПДн · витрина и база заказов',none:'Обработка ПДн в процессах не выявлена'}, data.scope)}</select></label>
          <p class="small"><a href="${config.source}" target="_blank" rel="noopener">152-ФЗ, ст. 3 п. 10 ↗</a> · проверено 24.11.2026</p>
          <label class="field">Заметки аудитора<textarea maxlength="2500" oninput="enterprise.note(this.value)">${esc(data.notes)}</textarea></label>
        </div>
        <h3>Реестр рисков</h3><p class="muted">Наблюдения поступают из обследования. Для каждого свяжи актив и меру.</p>
        ${Object.entries(config.findings).filter(([id]) => data.evidence.includes(id)).map(([id, finding]) =>
          `<form class="card survey-decision" onsubmit="event.preventDefault();enterprise.logRisk('${id}',this)">
            <h3>${finding.name}</h3><p class="small muted">Основание: ${items.find(item => item.id === id).name}</p>
            <label class="field">Актив<select name="asset" required><option value="">Выбери из описи</option>${options(Object.fromEntries(data.registry.map(key => [key, config.assets[key]])), data.risks[id]?.asset)}</select></label>
            <label class="field">Следующий шаг<select name="measure" required><option value="">Выбери меру</option>${options(config.measures, data.risks[id]?.measure)}</select></label>
            <button class="btn">Сохранить риск</button></form>`).join('')}
      </section>
      <section id="survey-defense">${btn(status ? 'Проверить обновлённый отчёт' : 'Защитить результаты', 'enterprise.submit()', 'primary')}</section>
      ${showReport ? `<section class="card survey-report" id="survey-report" tabindex="-1"><h2>${count === checks.length ? 'Миссия зачтена' : 'Отчёт требует доработки'} · ${Math.round(100 * count / checks.length)}%</h2>
        ${checks.map(check => `<p><strong>${check.passed ? '✓' : '○'} ${check.label}.</strong> ${check.passed ? 'Подтверждено.' : check.hint}</p>`).join('')}
        ${count === checks.length ? '<p>Заказчик согласовал исходную схему и план проверки сегментации и восстановления. Черновик и доказательства доступны для повторного просмотра.</p>' : ''}
        ${btn('Скачать отчёт JSON', 'enterprise.exportReport()')} ${btn('Вернуться к схеме', 'studio.openEnterprise()')} ${btn('К текущей кампании', "go('range')")}</section>` : ''}`;
  }

  function options(values, selectedValue) {
    return Object.entries(values).map(([id, label]) => `<option value="${id}" ${id === selectedValue ? 'selected' : ''}>${label}</option>`).join('');
  }

  function update(edit) {
    const data = progress();
    edit(data);
    state.enterprise = data;
    showReport = false;
    save();
    render();
  }

  function visit(index) {
    if (!config.scenes[index]) return;
    selected = '';
    update(data => { data.scene = index; });
  }

  function inspect(id) {
    if (!config.scenes[progress().scene].items.some(item => item.id === id)) return;
    selected = id;
    render();
    $('survey-object')?.scrollIntoView?.({ block: 'nearest' });
    $('survey-object')?.querySelector?.('button')?.focus();
  }

  function collect(id) {
    const data = progress();
    const item = config.scenes[data.scene].items.find(item => item.id === id);
    if (id !== selected || !item || item.requires && !data.evidence.includes(item.requires)) return;
    update(data => {
      if (!data.evidence.includes(id)) data.evidence.push(id);
    });
  }

  function register(id) {
    if (!Object.hasOwn(config.assets, id) || !progress().evidence.includes(id)) return;
    update(data => { if (!data.registry.includes(id)) data.registry.push(id); });
  }

  function scope(value) { update(data => { data.scope = value; }); }

  function reconcile() {
    if (['old-map', 'admin', 'web'].every(id => progress().evidence.includes(id))) {
      update(data => { data.reconciled = true; });
    }
  }

  function note(value) {
    state.enterprise = { ...progress(), notes: value.slice(0, 2500) };
    save();
  }

  function logRisk(id, form) {
    const { asset, measure } = form.elements;
    if (!Object.hasOwn(config.findings, id) || !progress().evidence.includes(id) ||
        !progress().registry.includes(asset.value) || !Object.hasOwn(config.measures, measure.value)) return;
    update(data => { data.risks[id] = { asset: asset.value, measure: measure.value }; });
  }

  function submit() {
    if (objectives().every(check => check.passed)) recordGame(game, 100);
    showReport = true;
    render();
    $('survey-report')?.focus?.();
  }

  function exportReport() {
    const data = progress();
    const evidence = items.filter(item => data.evidence.includes(item.id)).map(({id, name, evidence}) => ({id, name, evidence}));
    const checks = objectives();
    downloadJSON({ version: 1, campaign: config.operation, mission: config.title,
      date: day(), passed: checks.every(check => check.passed), checks, evidence,
      registry: data.registry, risks: data.risks, scope: data.scope, notes: data.notes,
      architecture: state.enterpriseDraft ?? null }, 'security-inspector-report.json');
  }

  return { view, seed, visit, inspect, collect, register, scope, reconcile, note, logRisk, submit, exportReport, objectives, game,
    openTutorial, rememberTutorial: open => { tutorialOpen = open; } };
})();
