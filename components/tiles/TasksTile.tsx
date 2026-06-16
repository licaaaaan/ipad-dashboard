'use client'
import { useCallback, useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { TaskList } from '@/types'

export default function TasksTile() {
  const [state, setState] = useState<{ connected: boolean; taskLists: TaskList[] }>({
    connected: false,
    taskLists: [],
  })
  const [completing, setCompleting] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const res = await fetch('/api/tasks/google')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  async function handleComplete(taskListId: string, taskId: string) {
    setCompleting(prev => new Set(prev).add(taskId))
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(list =>
        list.id === taskListId
          ? { ...list, tasks: list.tasks.filter(t => t.id !== taskId) }
          : list
      ),
    }))
    try {
      await fetch('/api/tasks/google', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskListId, taskId }),
      })
    } finally {
      setCompleting(prev => { const s = new Set(prev); s.delete(taskId); return s })
      load()
    }
  }

  if (!state.connected) {
    return (
      <GlassTile gradient="from-purple-200 to-violet-200" className="h-full flex flex-col">
        <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Tasks</p>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-white/50 text-base">Google Tasks</p>
          <a
            href="/api/auth/google"
            className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold rounded-full transition-colors"
          >
            Connect Google
          </a>
        </div>
      </GlassTile>
    )
  }

  return (
    <GlassTile gradient="from-purple-200 to-violet-200" className="h-full flex flex-col">
      <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Tasks</p>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3">
        {state.taskLists.length === 0 && (
          <p className="text-white/40 text-sm mt-4 text-center">No pending tasks</p>
        )}
        {state.taskLists.map(list => (
          <div key={list.id}>
            <p className="text-purple-300/70 text-xs font-semibold uppercase tracking-wider mb-1.5">
              {list.title}
            </p>
            <div className="flex flex-col gap-1.5">
              {list.tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-2.5 cursor-pointer group"
                  onClick={() => handleComplete(list.id, task.id)}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 border-purple-300/60
                      flex items-center justify-center transition-colors
                      ${completing.has(task.id) ? 'bg-purple-400' : 'group-hover:bg-purple-400/30'}`}
                  />
                  <span
                    className={`text-sm leading-snug flex-1
                      ${completing.has(task.id) ? 'line-through text-white/40' : 'text-white/85'}`}
                  >
                    {task.title}
                  </span>
                  {task.due && (
                    <span className="text-purple-200/50 text-xs shrink-0">
                      {new Date(task.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassTile>
  )
}
