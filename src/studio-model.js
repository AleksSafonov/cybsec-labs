const studioTypes = {
  traffic: ['Рабочий трафик', '#8ec5ff'], admin: ['Административный доступ', '#ceaeff'],
  log: ['События', '#81e5b8'], mirror: ['Зеркалирование', '#74dfec'],
  backup: ['Резервное копирование', '#ffd788'], api: ['API', '#f6a6d4'],
  replication: ['Репликация', '#ffad89'], trust: ['Доверие', '#d4e3a0']
};

const studioComponents = [
  ['Инфраструктура', '▤', {
    ...pAssets, Server: 'Сервер', Laptop: 'Ноутбук', Mobile: 'Мобильное устройство', DNS: 'DNS',
    DHCP: 'DHCP', Mail: 'Почтовый сервер', Virtual: 'Виртуализация', Cloud: 'Облако', DC: 'ЦОД', OT: 'АСУ ТП'
  }],
  ['Сеть', '◇', {
    Router: 'Маршрутизатор', Switch: 'Коммутатор L2', L3: 'Коммутатор L3', VLAN: 'VLAN',
    VPN: 'VPN-шлюз', LB: 'Балансировщик', Proxy: 'Прокси', DMZ: 'DMZ', WiFi: 'Wi-Fi', WAN: 'WAN'
  }],
  ['Защита', '⬡', {
    ...Object.fromEntries(proCatalog.map(([id, name]) => [id, name])),
    IDS: 'IDS', IPS: 'IPS', WAAP: 'WAAP', EPP: 'EPP', DCAP: 'DCAP', IdM: 'IdM', MFA: 'MFA',
    SSE: 'SSE', CAASM: 'CAASM', TIP: 'TIP', CIEM: 'CIEM', PKI: 'PKI', KMS: 'KMS', SCA: 'SCA',
    Backup: 'Backup'
  }]
];

const studioKinds = Object.fromEntries(studioComponents.flatMap(([, icon, items]) =>
  Object.entries(items).map(([id, name]) => [id, { name, icon }])
));

function studioEmpty() {
  return { version: 1, mission: '', nodes: [], zones: [], links: [] };
}

function studioParse(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  const text = (v, max = 100) => typeof v === 'string' && v.length <= max;
  const coordinate = v => Number.isFinite(v) && Math.abs(v) <= 12000;
  const id = v => text(v) && /^[a-zA-Z0-9_-]+$/.test(v);
  if (!data || data.version !== 1 ||
      !(data.mission === '' || Object.hasOwn(studioMissions, data.mission)) ||
      !Array.isArray(data.nodes) || data.nodes.length > 500 ||
      !Array.isArray(data.zones) || data.zones.length > 100 ||
      !Array.isArray(data.links) || data.links.length > 2000) throw Error('Неподдерживаемый формат проекта');
  const nodes = data.nodes.map(n => {
    if (!n || !id(n.id) || !Object.hasOwn(studioKinds, n.kind) || !text(n.name) ||
        !coordinate(n.x) || !coordinate(n.y) || !text(n.ip) || !text(n.port) || !text(n.protocol) ||
        !(n.group === '' || id(n.group))) throw Error('Некорректное устройство');
    const { id: nodeId, kind, name, x, y, ip, port, protocol, group } = n;
    return { id: nodeId, kind, name, x, y, ip, port, protocol, group };
  });
  const zones = data.zones.map(z => {
    if (!z || !id(z.id) || !text(z.name) || !coordinate(z.x) || !coordinate(z.y) ||
        !coordinate(z.w) || !coordinate(z.h) || z.w < 120 || z.h < 90) throw Error('Некорректная зона');
    const { id: zoneId, name, x, y, w, h } = z;
    return { id: zoneId, name, x, y, w, h };
  });
  const ids = new Set(nodes.map(n => n.id));
  if (new Set([...nodes, ...zones].map(item => item.id)).size !== nodes.length + zones.length) {
    throw Error('Повторяющиеся идентификаторы');
  }
  const links = data.links.map(l => {
    if (!l || !ids.has(l.from) || !ids.has(l.to) || l.from === l.to ||
        !Object.hasOwn(studioTypes, l.type) || !text(l.label)) throw Error('Некорректное соединение');
    const { from, to, type, label } = l;
    return { from, to, type, label };
  });
  return { version: 1, mission: data.mission, nodes, zones, links };
}

function studioEvaluate(project) {
  const nodes = kind => project.nodes.filter(n => n.kind === kind);
  const zone = node => project.zones.find(z =>
    node.x >= z.x && node.x <= z.x + z.w && node.y >= z.y && node.y <= z.y + z.h);
  const path = (from, to, type, excluded = []) => {
    const blocked = new Set(project.nodes.filter(n => excluded.includes(n.kind)).map(n => n.id));
    return nodes(from).some(a => nodes(to).some(b => rangeEngine.reachable(project, a.id, b.id, type, blocked)));
  };
  const endpoints = kind => nodes(kind).filter(n => project.links.some(l => l.from === n.id || l.to === n.id));
  const separated = (a, b) => {
    const left = endpoints(a), right = endpoints(b);
    return left.length && right.length && left.every(x => right.every(y => zone(x) && zone(y) && zone(x) !== zone(y)));
  };
  return rangeEngine.evaluate(studioMissions[project.mission], project, { path, separated });
}
