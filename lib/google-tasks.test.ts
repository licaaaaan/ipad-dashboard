import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('fetchTaskLists', () => {
  beforeEach(() => vi.resetModules())

  it('returns task lists with their incomplete tasks', async () => {
    const mockTasksApi = {
      tasklists: {
        list: vi.fn().mockResolvedValue({
          data: { items: [{ id: 'list1', title: 'My Tasks' }] },
        }),
      },
      tasks: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              { id: 't1', title: 'Buy milk', due: '2026-06-20T00:00:00.000Z' },
              { id: 't2', title: 'Call dentist' },
            ],
          },
        }),
        patch: vi.fn(),
      },
    }
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue(mockTasksApi),
      },
    }))

    const { fetchTaskLists } = await import('./google-tasks')
    const result = await fetchTaskLists('token123')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('list1')
    expect(result[0].title).toBe('My Tasks')
    expect(result[0].tasks).toHaveLength(2)
    expect(result[0].tasks[0].title).toBe('Buy milk')
    expect(result[0].tasks[0].due).toBe('2026-06-20T00:00:00.000Z')
    expect(result[0].tasks[1].title).toBe('Call dentist')
    expect(result[0].tasks[1].due).toBeUndefined()
  })

  it('excludes task lists that have no incomplete tasks', async () => {
    const mockTasksApi = {
      tasklists: {
        list: vi.fn().mockResolvedValue({
          data: { items: [{ id: 'list1', title: 'Empty' }] },
        }),
      },
      tasks: {
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        patch: vi.fn(),
      },
    }
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue(mockTasksApi),
      },
    }))

    const { fetchTaskLists } = await import('./google-tasks')
    const result = await fetchTaskLists('token123')
    expect(result).toHaveLength(0)
  })
})

describe('completeTask', () => {
  beforeEach(() => vi.resetModules())

  it('calls tasks.patch with status "completed"', async () => {
    const mockPatch = vi.fn().mockResolvedValue({})
    vi.doMock('googleapis', () => ({
      google: {
        auth: { OAuth2: class { setCredentials() {} } },
        tasks: vi.fn().mockReturnValue({
          tasklists: { list: vi.fn() },
          tasks: { list: vi.fn(), patch: mockPatch },
        }),
      },
    }))

    const { completeTask } = await import('./google-tasks')
    await completeTask('token123', 'list1', 'task1')

    expect(mockPatch).toHaveBeenCalledWith({
      tasklist: 'list1',
      task: 'task1',
      requestBody: { status: 'completed' },
    })
  })
})
