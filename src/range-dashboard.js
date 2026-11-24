const rangeDashboard = (() => {
  const domains = [
    ['Риски', [0, 11]], ['Активы', [1, 6]], ['Архитектура', [4, 20]], ['Сети', [2, 3]],
    ['IAM', [14, 15]], ['Аудит', [8, 10]], ['SOC', [5, 18]], ['AppSec', [21]]
  ];

  function competencies(attempts) {
    const bestByLesson = new Map();
    for (const { id, score } of attempts) {
      if (Number.isFinite(score) && score >= 0 && score <= 10) {
        bestByLesson.set(id, Math.max(bestByLesson.get(id) ?? 0, score));
      }
    }
    return domains.map(([label, ids]) => {
      const scores = ids.filter(id => bestByLesson.has(id)).map(id => bestByLesson.get(id));
      const percent = scores.length ? Math.round(10 * scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
      return { label, percent, attempted: scores.length, total: ids.length };
    });
  }

  function radar(metrics) {
    const point = (index, radius) => {
      const angle = index * Math.PI / 4;
      return [210 + Math.sin(angle) * radius, 188 - Math.cos(angle) * radius].map(value => value.toFixed(1));
    };
    const polygon = radius => metrics.map((_, index) => point(index, radius).join(',')).join(' ');
    const data = metrics.map(({ percent }, index) => point(index, 114 * (percent ?? 0) / 100).join(',')).join(' ');
    return `<svg class="range-radar" viewBox="0 0 420 376" aria-hidden="true">
      ${[.2, .4, .6, .8, 1].map(level => `<polygon class="range-radar-grid" points="${polygon(level * 114)}"/>`).join('')}
      ${metrics.map((_, index) => {
        const [x, y] = point(index, 114);
        return `<line class="range-radar-grid" x1="210" y1="188" x2="${x}" y2="${y}"/>`;
      }).join('')}
      ${metrics.some(metric => metric.attempted) ? `<polygon class="range-radar-data" points="${data}"/>` : ''}
      ${metrics.map(({ label, percent }, index) => {
        const [x, y] = point(index, 142);
        const [cx, cy] = point(index, 114 * (percent ?? 0) / 100);
        return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${label}</text>
          ${percent === null ? '' : `<circle cx="${cx}" cy="${cy}" r="4"/>`}`;
      }).join('')}
    </svg>`;
  }

  function overview() {
    const metrics = competencies(state.attempts);
    return header('Инженерный полигон', 'Cyber Range', 'Сюжетные миссии, доказательства и инженерные решения.') +
      `<div class="range-overview"><section class="card survey-campaign">
        <div class="eyebrow">Security Inspector · ${enterpriseScenario.operation}</div>
        <h2>${enterpriseScenario.title}</h2><p>${enterpriseScenario.goal}</p>
        <p class="small muted">${enterprise.objectives().filter(check => check.passed).length}/4 целей · ${xp(state)} XP в профиле</p>
        ${btn(state.games[enterprise.game]?.score === 100 ? 'Открыть завершённую миссию' : state.enterprise ? 'Продолжить миссию' : 'Открыть брифинг', "go('enterprise')", 'primary')}
        ${btn('Открыть туториал', 'enterprise.openTutorial()')}
      </section>
          <section class="card range-competencies" aria-labelledby="range-competencies">
            <h2 id="range-competencies">Карта компетенций</h2>
            <p class="muted small">Среднее лучших оценок по тестам с попытками. Темы без попыток показаны отдельно.</p>
            ${radar(metrics)}
            <dl class="range-metrics">${metrics.map(({ label, percent, attempted, total }) =>
              `<div><dt>${label}</dt><dd>${percent === null ? 'Нет попыток' : percent + '%'} <small class="muted">· ${attempted}/${total}</small></dd></div>`).join('')}</dl>
          </section>
      </div>`;
  }
  return { overview, competencies };
})();
