import React, {useEffect, useState} from 'react'

type Todo = {
  id: number
  title: string
  description?: string
  completed: boolean
}

export default function App(){
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(()=>{ load() }, [])

  async function load(){
    const res = await fetch('/api/todos')
    setTodos(await res.json())
  }

  async function create(e: React.FormEvent){
    e.preventDefault();
    if(!title) return;
    await fetch('/api/todos', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, description:desc})})
    setTitle(''); setDesc('');
    load();
  }

  async function toggle(id:number, checked:boolean){
    const res = await fetch('/api/todos/' + id)
    const t = await res.json()
    t.completed = checked
    await fetch('/api/todos/' + id, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(t)})
    load()
  }

  async function remove(id:number){
    await fetch('/api/todos/' + id, {method:'DELETE'})
    load()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todo App (React + TS)</h1>

      <form onSubmit={create} className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
        <input className="w-60 p-2 border rounded" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" />
        <button className="bg-blue-600 text-white px-3 py-2 rounded">Add</button>
      </form>

      <div className="space-y-3">
        {todos.map(t=> (
          <div key={t.id} className={`p-3 bg-white rounded shadow flex items-start gap-3 ${t.completed? 'opacity-75': ''}`}>
            <input type="checkbox" checked={t.completed} onChange={e=>toggle(t.id, e.target.checked)} />
            <div className="flex-1">
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm text-gray-600">{t.description}</div>
            </div>
            <div>
              <button onClick={()=>remove(t.id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
