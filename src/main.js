if (isBrother) {
  document.title = document.title.replace('Solo', 'Brother');
  document.querySelector('.sidebottom').innerHTML = document.querySelector('.sidebottom').innerHTML.replace('Solo', 'Brother');
}
bindProgressImport();
pages.splice(2, 0, ['range', '⬡  Cyber Range']);
pages.splice(3, 0, ['sandbox', '◇  Engineering Sandbox']);
for (const id of ['games', 'pro']) pages.splice(pages.findIndex(([pageId]) => pageId === id), 1);
pages.find(([id]) => id === 'practice')[1] = '⌘  Тренировки';
for (const [id, mission] of Object.entries(studioMissions)) gameNames['range-studio-' + id] = 'Architecture Studio · ' + mission.title;
gameNames[enterprise.game] = enterpriseScenario.title;
gameNames['enterprise-first-day'] = enterpriseScenario.title + ' · исходный сценарий';
studio.bind();
if (!glossary.some(([term]) => term === 'IAM')) {
  glossary.push(['IAM', 'Identity and Access Management — управление идентификацией и доступом.']);
}
daily.bind();
save();render();
