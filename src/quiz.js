const best=id=>Math.max(0,...state.attempts.filter(a=>a.id===id).map(a=>a.score));const passed=id=>best(id)>=8;const next=()=>order.find(i=>!passed(i))??-1;
let quiz=null;
function quizSources(result) {
  if (!result.done || result.id !== compliance149Id) return '';
  const links = source149.map(([label, url]) =>
    `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a></p>`).join('');
  return `<div class="notice"><strong>Источники для разбора</strong>${links}</div>`;
}

function testList() {
  const regulations = new Map([
    [compliance149Id, '149-ФЗ · статьи 9 и 16'],
    [6, '152-ФЗ · ИСПДн · ПП РФ № 1119'],
    [9, '187-ФЗ · КИИ и категорирование'],
    [10, 'ГИС · приказ ФСТЭК № 117'],
    [8, 'Карта законодательства и регуляторов'],
    [11, 'Модель угроз и матрица требований']
  ]);
  const cards = ids => `<div class="grid">${[...ids].map(id => {
    const lesson = lessons[id];
    const score = state.attempts.some(a => a.id === id) ? best(id) + '/10' : '—';
    return `<div class="card"><span class="pill">${lesson.tag}</span><h3 style="margin-top:10px">${regulations.get(id) ?? lesson.title}</h3>
      <p class="muted">10 вопросов · лучший результат: ${score}</p>${btn('Начать тест', `startQuiz(${id})`, 'primary')}</div>`;
  }).join('')}</div>`;
  return header('Проверка знаний', 'Тестирование', 'По 10 вопросов, зачёт от 8/10. После сдачи увидишь правильные ответы и объяснения.') +
    '<h2>Федеральные законы и нормативные требования</h2>' + cards(regulations.keys()) +
    '<h2>Другие темы</h2>' + cards(order.filter(id => !regulations.has(id)));
}
function shuffle(a){return a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])}function startQuiz(i){current=i;quiz={id:i,questions:shuffle(lessons[i].questions).map(q=>({...q,order:shuffle(q.o.map((_,j)=>j))})),answers:{},done:false};go('quiz')}
function quizView(){if(!quiz)return testList();let q=quiz;return header('Тест · '+lessons[q.id].tag,lessons[q.id].title,q.done?'Результат и объяснения':'Выбери ответы. Для нескольких верных вариантов отмечай весь набор.')+`<div class="card"><div class="row between"><strong id="qcount"></strong><span class="pill">10 вопросов · 8/10 для зачёта</span></div><div id="qbar"></div>${quizSources(q)}${q.done?`<div class="output"><span class="metric">${q.score}/10</span><strong class="${q.score>=8?'ok':'bad'}">${q.score>=8?'Зачтено':'Нужно повторить'}</strong></div>`:''}${q.questions.map((a,i)=>`<section class="question"><h3>${i+1}. ${a.q}</h3><div class="muted small">${a.a.length>1?'Несколько вариантов':'Один вариант'}</div>${a.order.map(j=>`<label class="opt"><input ${q.done?'disabled':''} type="${a.a.length>1?'checkbox':'radio'}" name="q${i}" ${q.answers[i]?.includes(j)?'checked':''} onchange="answer(${i},${j},this.checked)"><span>${a.o[j]} ${q.done&&a.a.includes(j)?'<strong class="ok">✓</strong>':''}</span></label>`).join('')}${q.done?`<div class="result"><strong class="${isCorrect(a,q.answers[i])?'ok':'bad'}">${isCorrect(a,q.answers[i])?'Верно':'Ошибка'}</strong> · ${a.e}</div>`:''}</section>`).join('')}<div class="toolbar">${q.done?btn('Повторить тест',`startQuiz(${q.id})`,'primary')+btn('Журнал ошибок',"go('progress')"):btn('Завершить и проверить','finishQuiz()','primary')}</div></div>`}
function answer(i,j,on){if(quiz.done)return;let a=quiz.answers[i]||[];quiz.answers[i]=quiz.questions[i].a.length===1?[j]:on?[...a,j]:a.filter(x=>x!==j);updateQuizCount()}function updateQuizCount(){if(!quiz||!$('qcount'))return;let n=Object.values(quiz.answers).filter(a=>a.length).length;$('qcount').textContent='Ответов: '+n+'/10';$('qbar').innerHTML=bar(n*10)}function isCorrect(q,a=[]){return q.a.length===a.length&&q.a.every(x=>a.includes(x))}function finishQuiz(){if(quiz.done)return;let n=Object.values(quiz.answers).filter(a=>a.length).length;if(n<10&&!confirm('Есть вопросы без ответа. Завершить тест?'))return;const errors=quiz.questions.flatMap((q,i)=>isCorrect(q,quiz.answers[i])?[]:[{q:q.q,answer:(quiz.answers[i]||[]).map(j=>q.o[j]).join('; ')||'Без ответа',correct:q.a.map(j=>q.o[j]).join('; '),e:q.e}]);quiz.done=true;quiz.score=10-errors.length;state.attempts.push({id:quiz.id,score:quiz.score,date:day(),type:'Тест на портале',errors});save();render();window.scrollTo(0,0)}
// Active recall / flashcards, due dates tracked separately for each profile.
let flashIndex=0,showFlash=false;function reviewCards(){let errors=state.attempts.flatMap(a=>a.errors||[]).filter(e=>e.q&&e.correct).map(e=>[e.q,e.correct+' — '+(e.e||'')]);let map=new Map([...errors,...glossary].map(x=>[x[0],x]));return [...map.values()]}
function reviewView(){let all=reviewCards(),due=all.filter(c=>!state.flash?.[c[0]]||state.flash[c[0]]<=day());let c=due[flashIndex%due.length];return header('Active recall','Карточки повторения','Ошибки из тестов и термины. Отметь, когда вспомнил ответ без подсказки.')+`<div class="card"><div class="row between"><span>${due.length} карточек к повторению</span><span class="muted small">Всего ${all.length}</span></div>${c?`<div class="flash"><h2>${esc(c[0])}</h2>${showFlash?`<p>${esc(c[1])}</p>`:'<p class="muted">Вспомни определение или решение самостоятельно.</p>'}</div><div class="toolbar">${showFlash?btn('Повторить завтра','gradeFlash(1)','primary')+btn('Знаю · через 3 дня','gradeFlash(3)')+btn('Легко · через 7 дней','gradeFlash(7)'):btn('Показать ответ','showFlash=true;render()','primary')}${btn('Следующая','flashIndex++;showFlash=false;render()')}</div>`:'<p class="ok">На сегодня всё повторено.</p>'}</div>`}
function gradeFlash(n){let due=reviewCards().filter(c=>!state.flash?.[c[0]]||state.flash[c[0]]<=day());if(!due.length)return;let c=due[flashIndex%due.length];let d=new Date(day()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);state.flash??={};state.flash[c[0]]=d.toISOString().slice(0,10);showFlash=false;save();render()}
