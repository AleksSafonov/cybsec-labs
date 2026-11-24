const daily = (() => {
  const dayMs = 86400000;
  const ordinal = date => Date.parse(date + 'T00:00:00Z') / dayMs;
  const iso = number => new Date(number * dayMs).toISOString().slice(0, 10);
  const editions = dailyFactEditions.map(({ start, size }) => ({ start: ordinal(start), size }));
  const factById = new Map(dailyFacts.map(fact => [fact.id, fact]));
  const practice = { studio: 'Architecture Studio', pro: 'PRO Labs', games: 'Игровые лаборатории', tools: 'Калькуляторы · практикум' };
  const captions = ['Term of the Day', 'Daily Challenge', 'Myth vs Reality', 'Interview Question'];
  const categories = [...new Set(dailyFacts.map(fact => fact.category))].sort((a, b) => a.localeCompare(b, 'ru'));
  const dateLabel = date => date.split('-').reverse().join('.');
  const normalize = value => value.toLowerCase().replaceAll('ё', 'е');
  const formatDate = date => `<time datetime="${esc(date)}">${esc(dateLabel(date))}</time>`;
  let query = '', category = '', onlyFavorites = false, displayedDay, refreshTimer;

  function factOf(date) {
    const number = Math.max(ordinal(date), editions[0].start);
    const edition = editions.findLast(item => item.start <= number);
    return dailyFacts[(number - edition.start) % edition.size];
  }

  function pastFacts(date) {
    const last = ordinal(date) - 1;
    const seen = new Set(), entries = [];
    for (let i = editions.length - 1; i >= 0; i--) {
      const edition = editions[i];
      const end = Math.min(last, (editions[i + 1]?.start ?? Infinity) - 1);
      for (let n = end; n >= Math.max(edition.start, end - edition.size + 1); n--) {
        const fact = dailyFacts[(n - edition.start) % edition.size];
        if (seen.has(fact.id)) continue;
        seen.add(fact.id);
        entries.push({ fact, date: iso(n) });
      }
    }
    return entries;
  }

  function progress() {
    const raw = state.dailyFacts;
    const validId = id => typeof id === 'string' && /^[a-z0-9-]{1,80}$/.test(id);
    return {
      favorites: Array.isArray(raw?.favorites) ? [...new Set(raw.favorites.filter(validId))] : [],
      read: Array.isArray(raw?.read) ? raw.read.filter(entry =>
        validId(entry?.id) && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) : []
    };
  }

  function sourceMarkup(key, checked) {
    const [title, url, review, revision] = dailySource[key];
    const due = review && day() >= review;
    return `<p class="small muted"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>
      ${revision ? ` · <a href="${esc(revision[1])}" target="_blank" rel="noopener noreferrer">${esc(revision[0])} ↗</a>` : ''}
      ${checked ? ` · Проверено ${formatDate(checked)}` : ''}
      ${review ? ` · ${due ? 'Требуется перепроверка' : 'Перепроверить к ' + dateLabel(review)}` : ''}</p>`;
  }

  function actions(fact, user) {
    const read = user.read.some(entry => entry.id === fact.id);
    const favorite = user.favorites.includes(fact.id);
    return `<div class="row daily-actions">
      <button class="btn" data-fact="${esc(fact.id)}" onclick="daily.markRead(this)" ${read ? 'disabled' : ''}>${read ? '✓ Прочитано' : 'Отметить прочитанным'}</button>
      <button class="btn" data-fact="${esc(fact.id)}" onclick="daily.toggleFavorite(this)" aria-pressed="${favorite}">${favorite ? '★ В избранном' : '☆ В избранное'}</button>
    </div>`;
  }

  function card(fact, date, user, featured = false) {
    return `<details class="daily-card card">
      <summary>
        <span class="small muted">${featured ? 'Daily Cyber Fact · ' : ''}${formatDate(date)} · ${esc(fact.category)} · ${esc(fact.level)} · 1–2 мин</span>
        <strong>${esc(fact.title)}</strong>
        ${featured ? `<span>${esc(fact.summary)}</span>` : ''}
      </summary>
      <div class="daily-body">
        ${featured ? '' : `<p>${esc(fact.summary)}</p>`}
        <p><strong>Как это работает.</strong> ${esc(fact.technical)}</p>
        <p><strong>На практике.</strong> ${esc(fact.benefit)}</p>
        <div class="row daily-related">
          <button class="linkbutton" onclick="openLesson(${fact.lesson})">Урок · ${esc(lessons[fact.lesson].title)}</button>
          <button class="linkbutton" data-term="${esc(fact.term)}" onclick="daily.openTerm(this.dataset.term)">Термин · ${esc(fact.term)}</button>
          <button class="linkbutton" data-lab="${esc(fact.lab)}" onclick="go(this.dataset.lab)">${esc(practice[fact.lab])}</button>
        </div>
        ${sourceMarkup(fact.source, fact.checked)}
        ${actions(fact, user)}
      </div>
    </details>`;
  }

  function dashboard(date = day()) {
    const n = Math.max(0, ordinal(date) - editions[0].start);
    const activities = dailyActivities[n % dailyActivities.length];
    return `<section id="daily-dashboard" aria-label="Ежедневные материалы">
      <div class="row between daily-heading"><h2>Каждый день в ИБ</h2>${btn('Архив фактов', "go('daily')")}</div>
      ${card(factOf(date), date, progress(), true)}
      <div class="daily-activities">${activities.map(([title, answer, source], index) => `
        <details class="daily-card card"><summary><span class="small muted">${captions[index]}</span><strong>${esc(title)}</strong></summary>
        <div class="daily-body"><p>${esc(answer)}</p>${sourceMarkup(source)}</div></details>`).join('')}</div>
    </section>`;
  }

  function entries(date, text, direction, favorites, user = progress()) {
    const search = normalize(text.trim());
    const previous = pastFacts(date);
    if (favorites) {
      const today = factOf(date);
      if (!previous.some(entry => entry.fact.id === today.id)) previous.unshift({ fact: today, date });
    }
    return previous.filter(({ fact }) =>
      (!direction || fact.category === direction) &&
      (!favorites || user.favorites.includes(fact.id)) &&
      (!search || normalize([fact.title, fact.category, fact.summary, fact.technical, fact.benefit, fact.term].join(' ')).includes(search)));
  }

  function list(date = day()) {
    const user = progress();
    const results = entries(date, query, category, onlyFavorites, user);
    return results.length ? results.map(({ fact, date: published }) => card(fact, published, user)).join('') :
      `<p class="muted">${onlyFavorites ? 'В избранном нет фактов, подходящих под фильтры.' : pastFacts(date).length ? 'По этим фильтрам ничего не найдено.' : 'Первый факт уже на главной. Завтра он появится в архиве.'}</p>`;
  }

  function archive() {
    return header('Daily Cyber Fact', 'Архив фактов') +
      `<div class="daily-filters">
        <label class="field">Поиск<input type="text" id="daily-query" value="${esc(query)}" oninput="daily.filter()"></label>
        <label class="field">Направление<select id="daily-category" onchange="daily.filter()"><option value="">Все направления</option>${categories.map(value =>
          `<option ${value === category ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
        <label><input type="checkbox" id="daily-favorites" onchange="daily.filter()" ${onlyFavorites ? 'checked' : ''}> Только избранное</label>
      </div><div id="daily-results" class="daily-archive">${list()}</div>`;
  }

  function filter() {
    query = $('daily-query').value;
    category = $('daily-category').value;
    onlyFavorites = $('daily-favorites').checked;
    $('daily-results').innerHTML = list();
  }

  function openTerm(term) {
    go('glossary');
    const input = $('glossary-query');
    input.value = term;
    filterGloss(term);
  }

  function markRead(button) {
    const id = button.dataset.fact, user = progress();
    if (!factById.has(id) || user.read.some(entry => entry.id === id)) return;
    user.read.push({ id, date: day() });
    state.dailyFacts = user;
    save();
    button.textContent = '✓ Прочитано';
    button.disabled = true;
  }

  function toggleFavorite(button) {
    const id = button.dataset.fact, user = progress();
    if (!factById.has(id)) return;
    const adding = !user.favorites.includes(id);
    user.favorites = adding ? [...user.favorites, id] : user.favorites.filter(value => value !== id);
    state.dailyFacts = user;
    save();
    if (page === 'daily' && onlyFavorites && !adding) { filter(); return; }
    button.textContent = adding ? '★ В избранном' : '☆ В избранное';
    button.setAttribute('aria-pressed', String(adding));
  }

  function history() {
    const user = progress();
    const seen = new Set();
    const read = user.read.filter(entry => factById.has(entry.id) && !seen.has(entry.id) && seen.add(entry.id));
    read.sort((a, b) => b.date.localeCompare(a.date));
    return `<h2>Daily Cyber Fact</h2><div class="card"><div class="row between"><strong>Прочитано фактов: ${read.length}</strong>
      ${btn('Открыть архив', "go('daily')")}</div>
      ${read.map(entry => `<div class="logitem">${formatDate(entry.date)} · ${esc(factById.get(entry.id).title)}</div>`).join('') ||
        '<p class="muted">Здесь появятся отмеченные факты.</p>'}</div>`;
  }

  function refresh(now = new Date()) {
    const current = day();
    if (displayedDay !== current) {
      displayedDay = current;
      if (page === 'home') {
        const section = $('daily-dashboard');
        if (section) section.outerHTML = dashboard(current);
      }
      if (page === 'daily') $('daily-results').innerHTML = list(current);
    }
    clearTimeout(refreshTimer);
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    refreshTimer = setTimeout(refresh, tomorrow - now + 30);
  }

  function bind() {
    displayedDay = day();
    refresh();
    window.addEventListener?.('focus', () => refresh());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
  }

  return { dashboard, archive, filter, markRead, toggleFavorite, openTerm, history, bind, factOf, pastFacts, entries };
})();
