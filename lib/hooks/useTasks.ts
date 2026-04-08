import { useCallback, useEffect, useState } from 'react'
import type { Task } from '@/lib/types'
import { deleteTask, listTasks, upsertTask } from '@/lib/services/tasks.service'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listTasks()
      setTasks(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Error cargando tareas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    tasks,
    loading,
    error,
    refresh,
    saveTask: upsertTask,
    removeTask: deleteTask,
  }
}
