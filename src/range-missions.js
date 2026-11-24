const studioMissions = {
  shop: {
    title: 'Интернет-магазин',
    threshold: 80,
    brief: 'Опубликуй веб-витрину. Размести витрину и БД в разных зонах, проведи публичный путь через защиту веб-приложения и настрой события и резервное копирование.',
    rules: [
      { title: 'Витрина доступна', hint: 'Проведи рабочий поток от Интернета к веб-серверу.', critical: true,
        test: (p, c) => c.path('Internet', 'Web', 'traffic') },
      { title: 'Публичный путь защищён', hint: 'Все пути к витрине должны проходить через WAF или WAAP.', critical: true,
        test: (p, c) => c.path('Internet', 'Web', 'traffic') && !c.path('Internet', 'Web', 'traffic', ['WAF', 'WAAP']) },
      { title: 'БД изолирована', hint: 'Витрина должна обращаться к БД. БД и витрина должны находиться в разных зонах, а пути из Интернета в обход витрины запрещены.', critical: true,
        test: (p, c) => c.separated('Web', 'DB') && c.path('Web', 'DB', 'traffic') && !c.path('Internet', 'DB', 'traffic', ['Web']) },
      { title: 'События поступают в SIEM', hint: 'Добавь поток событий от витрины и БД к SIEM.',
        test: (p, c) => c.path('Web', 'SIEM', 'log') && c.path('DB', 'SIEM', 'log') },
      { title: 'БД резервируется', hint: 'Соедини БД и систему Backup потоком резервного копирования.',
        test: (p, c) => c.path('DB', 'Backup', 'backup') }
    ]
  },
  logistics: {
    title: 'Нарисуй архитектуру склада',
    threshold: 100,
    brief: 'У логистической компании есть публичная витрина заказов, рабочие места операторов и база. Собери схему с нуля: создай зоны, добавь устройства, задай рабочие потоки, доставку событий и резервирование.',
    rules: [
      { title: 'Публичная витрина защищена', critical: true, hint: 'Интернет должен достигать витрины через WAF или WAAP. Проверь, что прямого обхода нет.',
        test: (p, c) => c.path('Internet', 'Web', 'traffic') && !c.path('Internet', 'Web', 'traffic', ['WAF', 'WAAP']) },
      { title: 'Операторы работают через витрину', critical: true, hint: 'Проведи рабочий поток от рабочих станций к витрине. У операторов и Интернета не должно быть пути к БД в обход витрины.',
        test: (p, c) => c.path('Users', 'Web', 'traffic') && !c.path('Users', 'DB', 'traffic', ['Web']) && !c.path('Internet', 'DB', 'traffic', ['Web']) },
      { title: 'Витрина и БД в разных зонах', critical: true, hint: 'Добавь две зоны, разнеси витрину и БД и проведи рабочую связь от витрины к БД.',
        test: (p, c) => c.separated('Web', 'DB') && c.path('Web', 'DB', 'traffic') },
      { title: 'События витрины и БД доходят до SIEM', hint: 'Для двух этих потоков выбери тип «События».',
        test: (p, c) => c.path('Web', 'SIEM', 'log') && c.path('DB', 'SIEM', 'log') },
      { title: 'База резервируется', hint: 'Добавь Backup и поток «Резервное копирование» от БД.',
        test: (p, c) => c.path('DB', 'Backup', 'backup') }
    ]
  }
};
