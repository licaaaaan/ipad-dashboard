import { google } from 'googleapis'
import type { Task, TaskList } from '@/types'

export async function fetchTaskLists(accessToken: string): Promise<TaskList[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const tasks = google.tasks({ version: 'v1', auth })

  const listsRes = await tasks.tasklists.list()
  const lists = listsRes.data.items ?? []

  const results = await Promise.all(
    lists.map(async (list): Promise<TaskList> => {
      try {
        const tasksRes = await tasks.tasks.list({
          tasklist: list.id!,
          showCompleted: false,
          showHidden: false,
        })
        const taskItems: Task[] = (tasksRes.data.items ?? []).map(t => ({
          id: t.id!,
          title: t.title ?? '(no title)',
          due: t.due ?? undefined,
          notes: t.notes ?? undefined,
        }))
        return { id: list.id!, title: list.title ?? '', tasks: taskItems }
      } catch {
        return { id: list.id!, title: list.title ?? '', tasks: [] }
      }
    })
  )

  return results.filter(l => l.tasks.length > 0)
}

export async function completeTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
): Promise<void> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const tasks = google.tasks({ version: 'v1', auth })
  await tasks.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: { status: 'completed' },
  })
}
