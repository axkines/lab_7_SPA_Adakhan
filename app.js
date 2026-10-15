const STORAGE_KEY = "daymark-planner-v1";
const content = document.querySelector("#content");
const tabs = [...document.querySelectorAll("[data-page]")];
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dateInput = document.querySelector("#task-date");
const categoryInput = document.querySelector("#task-category");
const message = document.querySelector("#form-message");
const today = localDateString(new Date());
let activePage = "today";
let tasks = loadTasks();

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(t => t && typeof t.title === "string" && t.date) : [];
  } catch (error) {
    return [];
  }
}
function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  catch (error) { message.textContent = "Не удалось сохранить данные в браузере."; }
}
function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}
function isThisWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const start = startOfWeek(new Date());
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}
function filteredTasks() {
  if (activePage === "today") return tasks.filter(t => t.date === today && !t.done);
  if (activePage === "week") return tasks.filter(t => isThisWeek(t.date) && !t.done).sort((a,b) => a.date.localeCompare(b.date));
  return tasks.filter(t => t.done).sort((a,b) => b.date.localeCompare(a.date));
}
function makeButton(label, className, action, id) {
  const button = document.createElement("button");
  button.type = "button"; button.className = `action ${className}`; button.textContent = label;
  button.addEventListener("click", () => action(id));
  return button;
}
function render() {
  const counts = {
    today: tasks.filter(t => t.date === today && !t.done).length,
    week: tasks.filter(t => isThisWeek(t.date) && !t.done).length,
    archive: tasks.filter(t => t.done).length
  };
  Object.entries(counts).forEach(([key,value]) => document.querySelector(`#count-${key}`).textContent = value);
  tabs.forEach(tab => {
    const active = tab.dataset.page === activePage;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  content.replaceChildren();
  const heading = document.createElement("div"); heading.className = "section-title";
  const title = document.createElement("h2"); title.textContent = {today:"На сегодня",week:"План на неделю",archive:"Архив выполненного"}[activePage];
  const note = document.createElement("span"); note.className = "tag"; note.textContent = `${filteredTasks().length} записей`;
  heading.append(title,note); content.append(heading);
  const list = document.createElement("div"); list.className = "task-list";
  const visible = filteredTasks();
  if (!visible.length) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.textContent = activePage === "archive" ? "Пока нет завершённых записей." : "Здесь пока пусто. Добавь запись через форму слева.";
    list.append(empty);
  }
  visible.forEach(task => {
    const card = document.createElement("article"); card.className = "task";
    const main = document.createElement("div"); main.className = "task-main";
    const name = document.createElement("h3"); name.textContent = task.title;
    const details = document.createElement("p"); details.textContent = `${formatDate(task.date)} · ${task.category}`;
    main.append(name,details);
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = task.done ? "Выполнено" : "В планах";
    const actions = document.createElement("div"); actions.className = "task-actions";
    if (!task.done) actions.append(makeButton("В архив", "secondary", markDone, task.id));
    else actions.append(makeButton("Вернуть", "secondary", restoreTask, task.id));
    actions.append(makeButton("Удалить", "danger", deleteTask, task.id));
    card.append(main,tag,actions); list.append(card);
  });
  content.append(list);
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"short",year:"numeric"}).format(date);
}
function markDone(id) { tasks = tasks.map(t => t.id === id ? {...t,done:true} : t); saveTasks(); render(); }
function restoreTask(id) { tasks = tasks.map(t => t.id === id ? {...t,done:false} : t); saveTasks(); render(); }
function deleteTask(id) { tasks = tasks.filter(t => t.id !== id); saveTasks(); render(); }
tabs.forEach(tab => tab.addEventListener("click", () => { activePage = tab.dataset.page; render(); }));
form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const date = dateInput.value;
  if (!title || !date) { message.textContent = "Заполни название и дату."; return; }
  tasks.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), title, date, category: categoryInput.value, done:false});
  saveTasks(); form.reset(); dateInput.value = today; message.textContent = "Запись добавлена."; activePage = date === today ? "today" : "week"; render();
});
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ru-RU",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
dateInput.value = today; dateInput.min = "2020-01-01";
render();
