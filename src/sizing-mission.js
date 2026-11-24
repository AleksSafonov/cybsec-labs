const sizingMission = (() => {
  const game = 'range-siem-sizing';
  const title = 'Сайзинг SIEM для торговой сети';
  const scenario = {
    sources: [['Межсетевые экраны', 600, 1400, 500], ['Серверы и AD', 1200, 2400, 750], ['Кассовая инфраструктура', 200, 800, 350]],
    days: 30, copies: 2, storageReserve: 1.25, peakReserve: 1.25, budget: 58,
    collectors: { compact: [1800, 8], standard: [3000, 11], performance: [6000, 18] },
    storage: { small: [6, 13], medium: [9, 19], large: [14, 30] }
  };
  const fields = ['average', 'peak', 'terabytes', 'model', 'count', 'disk'];
  let submitted = false;

  function workload() {
    const average = scenario.sources.reduce((sum, [, value]) => sum + value, 0);
    const peak = scenario.sources.reduce((sum, [, , value]) => sum + value, 0);
    const bytesPerSecond = scenario.sources.reduce((sum, [, eps, , size]) => sum + eps * size, 0);
    return { average, peak, required: peak * scenario.peakReserve,
      terabytes: bytesPerSecond * 86400 * scenario.days * scenario.copies * scenario.storageReserve / 1e12 };
  }

  function evaluate(draft) {
    const target = workload();
    const [capacity, price] = Object.hasOwn(scenario.collectors, draft.model) ? scenario.collectors[draft.model] : [0, 0];
    const [disk, diskPrice] = Object.hasOwn(scenario.storage, draft.disk) ? scenario.storage[draft.disk] : [0, 0];
    const count = Number(draft.count);
    const validCount = Number.isInteger(count) && count >= 1 && count <= 6;
    const remaining = validCount ? (count - 1) * capacity : 0;
    const cost = validCount && capacity && disk ? count * price + diskPrice : null;
    const checks = [
      { label: 'Средний и пиковый EPS', passed: Number(draft.average) === target.average && Number(draft.peak) === target.peak,
        hint: `Сумма источников: ${target.average} EPS в среднем и ${target.peak} EPS при совместном пике.` },
      { label: 'Расчёт хранения', passed: Math.abs(Number(draft.terabytes) - target.terabytes) <= .01,
        hint: `Суммируй поток байтов по каждому источнику и учти дни, копии и запас. Результат — ${num(target.terabytes, 3)} ТБ.` },
      { label: 'Отказ одного коллектора', passed: remaining >= target.required,
        hint: `После отказа остаётся ${remaining} EPS. Необходимо ${target.required} EPS с запасом.` },
      { label: 'Подбор хранилища', passed: disk >= target.terabytes,
        hint: `Выбрано ${disk} ТБ. Требуется не менее ${num(target.terabytes, 3)} ТБ.` },
      { label: 'Бюджет', passed: cost !== null && cost <= scenario.budget,
        hint: cost === null ? 'Укажи количество, модель коллекторов и хранилище.' : `Конфигурация стоит ${cost} ед. при лимите ${scenario.budget} ед.` }
    ];
    return { checks, passed: checks.every(check => check.passed), cost, remaining };
  }

  function draft() {
    return Object.fromEntries(fields.map(field => {
      const value = state.siemSizing?.[field];
      return [field, typeof value === 'string' && value.length < 40 ? value : ''];
    }));
  }

  function view() {
    const values = draft();
    const result = submitted ? evaluate(values) : null;
    const input = (name, label, step = '1', max = '') => `<label class="field">${label}<input type="number" name="${name}" min="0" step="${step}" ${max ? 'max="' + max + '"' : ''} value="${esc(values[name])}" required></label>`;
    const select = (name, label, options, unit) => `<label class="field">${label}<select name="${name}" required><option value="">Выбери конфигурацию</option>${Object.entries(options).map(([id, [value, price]]) =>
      `<option value="${id}" ${id === values[name] ? 'selected' : ''}>${value} ${unit} · ${price} ед.</option>`).join('')}</select></label>`;
    return header('Cyber Range · SIEM Engineer', title, 'Подбери конфигурацию, которая выдержит совместный пик даже при отказе одного коллектора.') +
      `<div class="toolbar">${btn('← К миссиям', "go('range')")}</div>
      <section class="card"><h2>Брифинг</h2><p>Заказчик объединяет журналы филиалов в одной SIEM. Хранение — ${scenario.days} дней, ${scenario.copies} полные копии, запас на хранение и обработку — 25%. Лимит — ${scenario.budget} условных единиц.</p>
      <div class="tablewrap"><table><thead><tr><th>Источник</th><th>Средний EPS</th><th>Пиковый EPS</th><th>Байт на событие</th></tr></thead><tbody>${scenario.sources.map(row =>
        '<tr>' + row.map(value => '<td>' + value + '</td>').join('') + '</tr>').join('')}</tbody></table></div>
      <details><summary>Как считать</summary><p>EPS — события в секунду. Сложи средние и совместные пиковые значения отдельно. Для хранения умножь средний EPS каждого источника на его размер события, сложи потоки, учти секунды хранения, копии и запас. Используй 1 ТБ = 10¹² байт. Хранилище в каталоге указано суммарно на все копии.</p><p>Коллекторы одной модели равномерно разделяют работу. После отказа остаётся на один коллектор меньше. Корреляция, сжатие и производительность конкретного вендора в эту учебную модель не входят.</p></details></section>
      <form class="card sizing-form" oninput="sizingMission.saveDraft(this)" onsubmit="event.preventDefault();sizingMission.submit(this)">
        <h2>Расчёт и подбор</h2><div class="grid">${input('average', 'Средний EPS')}${input('peak', 'Совместный пик EPS')}${input('terabytes', 'Объём с запасом, ТБ', '.001')}</div>
        <div class="grid">${select('model', 'Модель коллектора', scenario.collectors, 'EPS')}${input('count', 'Число коллекторов', '1', '6')}${select('disk', 'Хранилище', scenario.storage, 'ТБ')}</div>
        <button class="btn primary">Проверить конфигурацию</button>
      </form>
      ${result ? `<section class="card sizing-form" id="sizing-result" tabindex="-1"><h2>${result.passed ? 'Конфигурация принята' : 'Конфигурация требует доработки'} · ${result.checks.filter(check => check.passed).length}/5</h2>
        <ul>${result.checks.map(check => `<li><strong class="${check.passed ? 'ok' : 'warn'}">${check.passed ? '✓' : '○'} ${check.label}.</strong> ${check.hint}</li>`).join('')}</ul>
        ${btn('К миссиям', "go('range')")}</section>` : ''}`;
  }

  function saveDraft(form) {
    state.siemSizing = Object.fromEntries(fields.map(field => [field, form.elements[field].value]));
    submitted = false;
    $('sizing-result')?.remove?.();
    save();
  }

  function submit(form) {
    saveDraft(form);
    if (evaluate(draft()).passed) recordGame(game, 100);
    submitted = true;
    render();
    $('sizing-result')?.focus?.();
  }

  return { game, title, view, evaluate, saveDraft, submit };
})();
