import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Plants from '../Plants'

vi.mock('../../lib/api', () => ({
  fetchPlants: vi.fn(),
  createPlant: vi.fn(),
  updatePlant: vi.fn(),
  deletePlant: vi.fn(),
  waterPlant: vi.fn(),
  fetchPlantHistory: vi.fn(),
}))

import {
  fetchPlants,
  createPlant,
  waterPlant,
  fetchPlantHistory,
} from '../../lib/api'

function renderPlants() {
  return render(
    <MemoryRouter>
      <Plants />
    </MemoryRouter>
  )
}

const HOUR_MS = 3600 * 1000
const DAY_MS = 24 * HOUR_MS

describe('Plants page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchPlants.mockResolvedValue([])
  })

  it('muestra estado vacio cuando no hay plantas', async () => {
    renderPlants()
    await waitFor(() => {
      expect(screen.getByText('Sin plantas')).toBeInTheDocument()
    })
    expect(screen.getByText('Agregar primera planta')).toBeInTheDocument()
  })

  it('marca como vencida una planta con last_watered_at viejo', async () => {
    fetchPlants.mockResolvedValue([{
      id: 'p1',
      name: 'Monstera',
      notes: null,
      watering_frequency_days: 7,
      last_watered_at: new Date(Date.now() - 10 * DAY_MS).toISOString(),
      organization_id: 'org-1',
    }])
    renderPlants()
    await waitFor(() => {
      expect(screen.getByText('Monstera')).toBeInTheDocument()
    })
    expect(screen.getByText(/Vencido hace/)).toBeInTheDocument()
  })

  it('marca como "Sin regar" una planta sin last_watered_at', async () => {
    fetchPlants.mockResolvedValue([{
      id: 'p1',
      name: 'Pothos',
      notes: null,
      watering_frequency_days: 7,
      last_watered_at: null,
      organization_id: 'org-1',
    }])
    renderPlants()
    await waitFor(() => {
      expect(screen.getByText('Pothos')).toBeInTheDocument()
    })
    expect(screen.getByText('Sin regar')).toBeInTheDocument()
  })

  it('llama a createPlant al guardar el formulario con nombre y frecuencia', async () => {
    const user = userEvent.setup()
    createPlant.mockResolvedValue({ id: 'p-new' })
    renderPlants()
    await waitFor(() => expect(screen.getByText('Sin plantas')).toBeInTheDocument())

    await user.click(screen.getByText('Agregar primera planta'))
    await user.type(screen.getByPlaceholderText(/Monstera del salon/), 'Cactus')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(createPlant).toHaveBeenCalledWith({
      name: 'Cactus',
      notes: null,
      watering_frequency_days: 7,
    })
  })

  it('llama a waterPlant al hacer click en "Regué esta planta"', async () => {
    const user = userEvent.setup()
    fetchPlants.mockResolvedValue([{
      id: 'p1',
      name: 'Helecho',
      notes: null,
      watering_frequency_days: 5,
      last_watered_at: new Date(Date.now() - DAY_MS).toISOString(),
      organization_id: 'org-1',
    }])
    waterPlant.mockResolvedValue({})
    renderPlants()
    await waitFor(() => expect(screen.getByText('Helecho')).toBeInTheDocument())

    await user.click(screen.getByTitle('Regué esta planta'))

    await waitFor(() => {
      expect(waterPlant).toHaveBeenCalledWith('p1')
    })
  })

  it('abre historial al hacer click en el icono', async () => {
    const user = userEvent.setup()
    fetchPlants.mockResolvedValue([{
      id: 'p1',
      name: 'Suculenta',
      notes: null,
      watering_frequency_days: 14,
      last_watered_at: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      organization_id: 'org-1',
    }])
    fetchPlantHistory.mockResolvedValue([])
    renderPlants()
    await waitFor(() => expect(screen.getByText('Suculenta')).toBeInTheDocument())

    await user.click(screen.getByTitle('Historial'))

    await waitFor(() => {
      expect(fetchPlantHistory).toHaveBeenCalledWith('p1', 20)
      expect(screen.getByText('Aun no se ha regado')).toBeInTheDocument()
    })
  })
})
