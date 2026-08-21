import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Admin from '../Admin'

vi.mock('../../lib/tasks', async () => {
  const actual = await vi.importActual('../../lib/tasks')
  return {
    ...actual,
    fetchAllTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    resetTask: vi.fn(),
  }
})

vi.mock('../../lib/api', () => ({
  getImageUrl: (name) => `/uploads/${name}`,
  fetchHouseMembers: vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  authClient: { useSession: vi.fn() },
}))

import { fetchAllTasks } from '../../lib/tasks'
import { fetchHouseMembers } from '../../lib/api'
import { authClient } from '../../lib/auth'

const TASK = {
  id: 't1',
  name: 'Trapear la cocina',
  description: null,
  frequency_type: 'weekly',
  frequency_value: 7,
  is_active: true,
  product_name: null,
  product_image: null,
  organization_id: 'org-1',
}

function renderAdmin() {
  return render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>
  )
}

function mockSessionAs(role) {
  authClient.useSession.mockReturnValue({ data: { user: { id: 'u1' } } })
  fetchHouseMembers.mockResolvedValue([
    { userId: 'u1', name: 'Juan', avatar: '🧑', color: '#6a9960', role },
  ])
}

describe('Admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAllTasks.mockResolvedValue([TASK])
  })

  it('un miembro puede crear tareas', async () => {
    mockSessionAs('member')
    renderAdmin()

    await waitFor(() => expect(screen.getByText('Trapear la cocina')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Nueva/ })).toBeInTheDocument()
  })

  it('un miembro no ve editar, eliminar ni resetear', async () => {
    mockSessionAs('member')
    renderAdmin()

    await waitFor(() => expect(screen.getByText('Trapear la cocina')).toBeInTheDocument())
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Eliminar')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Resetear')).not.toBeInTheDocument()
    // El historial sigue disponible para cualquier miembro.
    expect(screen.getByTitle('Historial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tarea activa' })).toBeDisabled()
  })

  it('un admin conserva todas las acciones de gestion', async () => {
    mockSessionAs('admin')
    renderAdmin()

    await waitFor(() => expect(screen.getByTitle('Editar')).toBeInTheDocument())
    expect(screen.getByTitle('Eliminar')).toBeInTheDocument()
    expect(screen.getByTitle('Resetear')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tarea activa' })).toBeEnabled()
  })
})
