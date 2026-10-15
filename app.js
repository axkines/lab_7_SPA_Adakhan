const STORAGE_KEY = "gather-events-v1";
const content = document.querySelector("#content");
const tabs = [...document.querySelectorAll("[data-page]")];
let activePage = "events";
const seedEvents = [
  {id:"e1",title:"Frontend Meetup",date:"2026-11-05",time:"18:30",place:"Коворкинг Q",capacity:40,description:"Встреча для тех, кто изучает веб-разработку."},
  {id:"e2",title:"Game Dev Weekend",date:"2026-11-14",time:"10:00",place:"Tech Hub",capacity:25,description:"Мини-хакатон и обмен опытом по разработке игр."},
  {id:"e3",title:"Design & Coffee",date:"2026-11-21",time:"15:00",place:"Coffee Lab",capacity:20,description:"Неформальное обсуждение интерфейсов и визуальных идей."}
];
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.events) && Array.isArray(saved.participants)) return saved;
  } catch (error) { /* Используем начальные данные при ошибке чтения. */ }
  return {events:seedEvents,participants:[]};
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { alert("Не удалось сохранить данные. Проверьте настройки хранилища браузера."); }
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric"}).format(date);
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(label, className, handler) {
  const node = el("button",`button ${className || ""}`,label);
  node.type = "button"; node.addEventListener("click",handler); return node;
}
function heading(title, description) {
  const wrapper = el("div","section-heading");
  const left = el("div");
  left.append(el("h2","",title),el("p","muted",description));
  wrapper.append(left); return wrapper;
}
function updateCounters() {
  document.querySelector("#event-count").textContent = state.events.length;
  document.querySelector("#participant-count").textContent = state.participants.length;
}
function renderEvents() {
  content.append(heading("Ближайшие события","Выбери мероприятие и зарегистрируйся."));
  const grid = el("div","event-grid");
  state.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(event => {
    const card = el("article","event-card");
    card.append(el("div","date",formatDate(event.date)));
    card.append(el("h3","",event.title));
    card.append(el("p","",event.description));
    card.append(el("div","meta",`${event.time} · ${event.place}`));
    const registered = state.participants.filter(p=>p.eventId===event.id).length;
    card.append(el("div","meta",`Участники: ${registered} / ${event.capacity}`));
    card.append(button("Зарегистрироваться","",()=>{activePage="registration";render(event.id);}));
    grid.append(card);
  });
  if (!state.events.length) grid.append(el("div","empty","Событий пока нет. Добавь первое на вкладке «Регистрация»."));
  content.append(grid);
}
function renderRegistration(prefillId="") {
  content.append(heading("Управление регистрациями","Добавляй события и записывай участников с проверкой данных."));
  const layout = el("div","form-layout");
  const eventPanel = el("section","panel");
  eventPanel.append(el("h3","","Создать событие"));
  const eventForm = el("form");
  const eventFields = [
    ["Название события","title","text","Например, JavaScript Meetup"],
    ["Дата","date","date",""],
    ["Время","time","time",""],
    ["Место проведения","place","text","Название площадки"],
    ["Максимум участников","capacity","number","30"],
    ["Описание","description","text","Коротко о мероприятии"]
  ];
  eventFields.forEach(([label,name,type,placeholder])=>{
    const id=`event-${name}`;
    eventForm.append(el("label","",label));
    const input=el("input");input.id=id;input.name=name;input.type=type;input.placeholder=placeholder;
    if(name==="capacity"){input.min="1";input.max="10000";input.value="30";input.required=true;}
    if(name==="date"){input.min=new Date().toISOString().slice(0,10);input.required=true;}
    if(name==="title"||name==="time"||name==="place")input.required=true;
    if(name==="title"||name==="place"||name==="description")input.maxLength=100;
    eventForm.append(input);
  });
  const eventMessage=el("p","message");eventMessage.setAttribute("aria-live","polite");
  eventForm.append(button("Создать событие","",()=>{}));
  eventForm.querySelector("button").type="submit";
  eventForm.addEventListener("submit",e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(eventForm).entries());
    const capacity=Number(data.capacity);
    if(!data.title.trim()||!data.date||!data.time||!data.place.trim()||!Number.isInteger(capacity)||capacity<1){
      eventMessage.textContent="Проверь поля: название, дата, время, место и вместимость обязательны.";
      eventMessage.className="message error";return;
    }
    state.events.push({id:makeId(),title:data.title.trim(),date:data.date,time:data.time,place:data.place.trim(),capacity,description:data.description.trim()||"Описание не добавлено."});
    saveState();render(" ");
  });
  eventPanel.append(eventForm,eventMessage);
  const participantPanel=el("section","panel");
  participantPanel.append(el("h3","","Регистрация участника"));
  const participantForm=el("form");
  const nameLabel=el("label","","Имя участника");nameLabel.htmlFor="participant-name";
  const nameInput=el("input");nameInput.id="participant-name";nameInput.name="name";nameInput.required=true;nameInput.maxLength=80;nameInput.placeholder="Имя и фамилия";
  const emailLabel=el("label","","Электронная почта");emailLabel.htmlFor="participant-email";
  const emailInput=el("input");emailInput.id="participant-email";emailInput.name="email";emailInput.type="email";emailInput.required=true;emailInput.maxLength=120;emailInput.placeholder="name@example.com";
  const selectLabel=el("label","","Мероприятие");selectLabel.htmlFor="participant-event";
  const select=el("select");select.id="participant-event";select.name="eventId";select.required=true;
  state.events.forEach(event=>{const option=el("option","",`${event.title} — ${formatDate(event.date)}`);option.value=event.id;select.append(option);});
  if(prefillId && state.events.some(e=>e.id===prefillId))select.value=prefillId;
  const participantMessage=el("p","message");participantMessage.setAttribute("aria-live","polite");
  participantForm.append(nameLabel,nameInput,emailLabel,emailInput,selectLabel,select);
  const submit=button("Зарегистрировать","",()=>{});submit.type="submit";participantForm.append(submit);
  participantForm.addEventListener("submit",e=>{
    e.preventDefault();
    const name=nameInput.value.trim(),email=emailInput.value.trim(),eventId=select.value;
    const event=state.events.find(item=>item.id===eventId);
    if(!name||!email||!event){participantMessage.textContent="Заполни все поля корректно.";participantMessage.className="message error";return;}
    if(state.participants.some(p=>p.eventId===eventId&&p.email.toLowerCase()===email.toLowerCase())){
      participantMessage.textContent="Этот адрес уже зарегистрирован на выбранное событие.";participantMessage.className="message error";return;
    }
    const count=state.participants.filter(p=>p.eventId===eventId).length;
    if(count>=event.capacity){participantMessage.textContent="Свободных мест больше нет.";participantMessage.className="message error";return;}
    state.participants.push({id:makeId(),name,email,eventId,registeredAt:new Date().toISOString()});
    saveState();activePage="participants";render();
  });
  participantPanel.append(participantForm,participantMessage);
  layout.append(eventPanel,participantPanel);content.append(layout);
  if(!state.events.length){select.disabled=true;participantForm.querySelector("button").disabled=true;}
}
function renderParticipants() {
  content.append(heading("Список участников","Зарегистрированные участники и выбранные ими события."));
  const search=el("input","search");search.type="search";search.placeholder="Поиск по имени, email или событию";search.setAttribute("aria-label","Поиск участников");
  content.append(search);
  const list=el("div","participant-list");
  content.append(list);
  function paint(query="") {
    list.replaceChildren();
    const normalized=query.trim().toLowerCase();
    const filtered=state.participants.filter(p=>{
      const event=state.events.find(e=>e.id===p.eventId);
      return `${p.name} ${p.email} ${event?.title||""}`.toLowerCase().includes(normalized);
    });
    if(!filtered.length){list.append(el("div","empty",normalized?"Ничего не найдено.":"Пока нет зарегистрированных участников."));return;}
    filtered.forEach(p=>{
      const event=state.events.find(e=>e.id===p.eventId);
      const row=el("article","participant");
      const info=el("div");info.append(el("strong","",p.name),el("small","",`${p.email} · ${event?event.title:"Событие удалено"}`));
      row.append(info,button("Удалить","light",()=>{state.participants=state.participants.filter(x=>x.id!==p.id);saveState();render();}));
      list.append(row);
    });
  }
  search.addEventListener("input",()=>paint(search.value));paint();
}
function makeId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function render(prefillId="") {
  updateCounters();
  tabs.forEach(tab=>{const active=tab.dataset.page===activePage;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
  content.replaceChildren();
  if(activePage==="events")renderEvents();
  else if(activePage==="registration")renderRegistration(prefillId);
  else renderParticipants();
}
tabs.forEach(tab=>tab.addEventListener("click",()=>{activePage=tab.dataset.page;render();}));
render();
