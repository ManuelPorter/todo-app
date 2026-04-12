const api = '/api/todos';

let todos = [];
let filter = 'all';

function qs(sel){ return document.querySelector(sel); }
function formatDueAt(s){
  if(!s) return '';
  const d = new Date(s);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}
function toDateTimeLocalValue(s){
  if(!s) return '';
  const d = new Date(s);
  if(Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setSummary(){
  const total = todos.length;
  const completed = todos.filter(t=>t.completed).length;
  qs('.summary').textContent = `${completed} completed • ${total} total`;
}

function render(){
  const container = qs('#list');
  container.innerHTML = '';
  const list = todos.filter(t=> {
    if(filter==='all') return true;
    if(filter==='active') return !t.completed;
    return t.completed;
  });

  list.forEach(t=>{
    const el = document.createElement('div');
    el.className = 'todo' + (t.completed? ' completed':'');
    el.dataset.id = t.id;

    el.innerHTML = `
      <div class="meta">
        <div style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" class="toggle" data-id="${t.id}" ${t.completed? 'checked':''} />
          <div style="flex:1">
            <div class="title" data-id="${t.id}">${escapeHtml(t.title)}</div>
            <div class="desc">${escapeHtml(t.description||'')}</div>
            ${t.dueAt ? `<div class="desc">Due: ${escapeHtml(formatDueAt(t.dueAt))}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="edit" data-id="${t.id}">Edit</button>
        <button class="delete" data-id="${t.id}">Delete</button>
      </div>
    `;

    container.appendChild(el);
  });
  setSummary();
}

function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function load(){
  const res = await fetch(api);
  const data = await res.json();
  todos = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
  render();
}

async function create(title, description, dueAt){
  const res = await fetch(api, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({title, description, dueAt: dueAt || null})
  });
  const created = await res.json();
  todos.push(created);
  render();
}

async function remove(id){
  // optimistic
  const idx = todos.findIndex(t=>t.id==id);
  if(idx===-1) return;
  const [old] = todos.splice(idx,1);
  render();
  const res = await fetch(api + '/' + id, {method:'DELETE'});
  if(!res.ok) { todos.splice(idx,0,old); render(); alert('Delete failed'); }
}

async function toggle(id, checked){
  const todo = todos.find(t=>t.id==id);
  if(!todo) return;
  const old = {...todo};
  todo.completed = checked;
  render();
  const res = await fetch(api + '/' + id, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(todo)});
  if(!res.ok){ Object.assign(todo,old); render(); alert('Update failed'); }
}

async function saveEdit(id, title, description, dueAt){
  const todo = todos.find(t=>t.id==id);
  if(!todo) return;
  const old = {...todo};
  todo.title = title;
  todo.description = description;
  todo.dueAt = dueAt || null;
  render();
  const res = await fetch(api + '/' + id, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(todo)});
  if(!res.ok){ Object.assign(todo,old); render(); alert('Save failed'); }
}

document.addEventListener('click', async e=>{
  const id = e.target.dataset.id;
  if(e.target.classList.contains('delete')){ await remove(id); }
  if(e.target.classList.contains('edit')){
    const parent = e.target.closest('.todo');
    const meta = parent.querySelector('.meta');
    const tid = id;
    const todo = todos.find(t=>t.id==tid);
    if(!todo) return;
    meta.innerHTML = `
      <input class="edit-input" id="edit-title-${tid}" value="${escapeHtml(todo.title)}" />
      <input class="edit-input" id="edit-desc-${tid}" value="${escapeHtml(todo.description||'')}" />
      <input class="edit-input" id="edit-due-at-${tid}" type="datetime-local" value="${toDateTimeLocalValue(todo.dueAt)}" />
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="save" data-id="${tid}">Save</button>
        <button class="cancel" data-id="${tid}">Cancel</button>
      </div>
    `;
  }

  if(e.target.classList.contains('save')){
    const tid = e.target.dataset.id;
    const title = qs(`#edit-title-${tid}`).value.trim();
    const desc = qs(`#edit-desc-${tid}`).value.trim();
    const dueAt = qs(`#edit-due-at-${tid}`).value;
    if(!title) { alert('Title required'); return; }
    await saveEdit(tid, title, desc, dueAt);
  }

  if(e.target.classList.contains('cancel')){ load(); }
});

document.addEventListener('change', async e=>{
  if(e.target.classList.contains('toggle')){
    const id = e.target.dataset.id;
    await toggle(id, e.target.checked);
  }
});

document.getElementById('form').addEventListener('submit', async e=>{
  e.preventDefault();
  const title = qs('#title').value.trim();
  const desc = qs('#desc').value.trim();
  const dueAt = qs('#due-at').value;
  if(!title) return;
  await create(title, desc, dueAt);
  qs('#title').value = '';
  qs('#desc').value = '';
  qs('#due-at').value = '';
});

document.querySelector('.filters').addEventListener('click', e=>{
  if(e.target.dataset.filter){
    document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    filter = e.target.dataset.filter;
    render();
  }
});

// initial load
load();
