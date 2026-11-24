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
  }
};
