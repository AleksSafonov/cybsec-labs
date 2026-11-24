const isBrother = new URLSearchParams(window.location.search).get('profile') === 'brother';
const KEY = isBrother ? 'cybsec-labs-brother-v4' : 'cybsec-labs-solo-v4';
const baseline={attempts:[],read:[],practice:[],notes:{},external:[],legacy:[],games:{},flash:{}};
let storageOK=true;let db={active:0,profiles:[{name:'Мой профиль',state:structuredClone(baseline)}],race:{start:'2026-11-24',end:'2026-11-30',target:500}};try{let stored=JSON.parse(localStorage.getItem(KEY));if(stored?.profiles?.length===1)db=stored;else if(!isBrother){let prior=JSON.parse(localStorage.getItem('cybsec-labs-v3'));if(prior?.profiles?.[0]?.state){db.profiles[0].state=prior.profiles[0].state;}else{let p=localStorage.getItem('cybsec-labs-v2');if(p)db.profiles[0].state=JSON.parse(p);else if(localStorage.getItem('ib-lab-portal-v1'))db.profiles[0].state=migrate(JSON.parse(localStorage.getItem('ib-lab-portal-v1')));}}}catch(e){storageOK=false}db.active=0;db.profiles[0].state.games??={};let state=db.profiles[0].state;
function migrate(s){s.practice=s.practice.map(i=>i===8?100:i===9?101:i);return s;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));storageOK=true}catch(e){storageOK=false;toast('Браузер не разрешил сохранение. Экспортируй прогресс вручную.')}}
const profile=()=>db.profiles[db.active];

function exportData() {
  const edition = isBrother ? { profile: 'brother' } : {};
  const prefix = isBrother ? 'cybsec-labs-brother' : 'cybsec-labs';
  downloadJSON({ version: 3, ...edition, state }, prefix + '-progress-' + day() + '.json');
}

function readProgress(text) {
  const data = JSON.parse(text);
  const progress = data.state;
  const supported = isBrother
    ? data.profile === 'brother' && data.version === 3
    : [1, 2, 3].includes(data.version);
  if (!supported || !progress ||
      !Array.isArray(progress.attempts) || !progress.attempts.every(a =>
        a && Number.isInteger(a.id) && a.id >= 0 && a.id < lessons.length &&
        Number.isFinite(a.score) && a.score >= 0 && a.score <= 10 &&
        Array.isArray(a.errors) && a.errors.every(e => e && typeof e === 'object')) ||
      !Array.isArray(progress.read) || !Array.isArray(progress.practice) ||
      !progress.notes || typeof progress.notes !== 'object' ||
      !Array.isArray(progress.external) || !progress.external.every(Boolean) ||
      !Array.isArray(progress.legacy)) {
    throw new Error('Неверный формат прогресса');
  }
  if (data.version === 1) migrate(progress);
  progress.games ??= {};
  return progress;
}

function bindProgressImport() {
  $('importFile').addEventListener('change', async e => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const progress = readProgress(await file.text());
      if (!confirm('Заменить текущий прогресс данными из файла?')) return;
      state = profile().state = progress;
      save();
      render();
      if (storageOK) toast('Прогресс восстановлен');
    } catch (error) {
      toast(isBrother
        ? 'Не удалось импортировать: выбери резервную копию Brother Edition.'
        : 'Не удалось импортировать: неверный формат.');
    } finally {
      e.target.value = '';
    }
  });
}
function downloadJSON(x,name){let u=URL.createObjectURL(new Blob([JSON.stringify(x,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
