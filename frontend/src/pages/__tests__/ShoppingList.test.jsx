import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ShoppingList from '../ShoppingList'

// Mock the API module
vi.mock('../../lib/api', () => ({
  fetchShoppingItems: vi.fn(),
  fetchShoppingCategories: vi.fn(),
  fetchShoppingRecommendations: vi.fn(),
  createShoppingItem: vi.fn(),
  updateShoppingItem: vi.fn(),
  deleteShoppingItem: vi.fn(),
  clearPurchasedItems: vi.fn(),
}))

import {
  fetchShoppingItems,
  fetchShoppingCategories,
  fetchShoppingRecommendations,
  createShoppingItem,
} from '../../lib/api'

const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Limpieza', emoji: '🧹', sort_order: 0 },
  { id: 'cat-2', name: 'Frutas y Verduras', emoji: '🥬', sort_order: 1 },
  { id: 'cat-3', name: 'Despensa', emoji: '🏪', sort_order: 2 },
  { id: 'cat-4', name: 'Lácteos', emoji: '🥛', sort_order: 3 },
]

function renderShoppingList() {
  return render(
    <MemoryRouter>
      <ShoppingList />
    </MemoryRouter>
  )
}

describe('ShoppingList — Smart Tags integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchShoppingItems.mockResolvedValue([])
    fetchShoppingCategories.mockResolvedValue(MOCK_CATEGORIES)
    fetchShoppingRecommendations.mockResolvedValue([])
    createShoppingItem.mockResolvedValue({ id: 'new-1' })
  })

  it('muestra chip de sugerencia al escribir un keyword conocido', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'detergente')

    expect(screen.getByText('Sugerencia:')).toBeInTheDocument()
    expect(screen.getByText('Limpieza')).toBeInTheDocument()
    expect(screen.getByText('🧹')).toBeInTheDocument()
  })

  it('no muestra chip para texto sin match', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'xyzabc')

    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()
  })

  it('aceptar sugerencia actualiza el dropdown de categoría', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'detergente')

    // Click the suggestion chip (the button with the category name)
    const chip = screen.getByRole('button', { name: /Limpieza/ })
    await user.click(chip)

    // Chip should disappear
    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()

    // Dropdown should have the category selected
    const select = screen.getByRole('combobox')
    expect(select.value).toBe('cat-1')
  })

  it('descartar sugerencia con X la oculta', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'detergente')
    expect(screen.getByText('Sugerencia:')).toBeInTheDocument()

    // Click dismiss button (the X)
    const dismissBtn = screen.getByTitle('Descartar sugerencia')
    await user.click(dismissBtn)

    // Chip should disappear
    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()

    // Dropdown should remain unchanged (no category)
    const select = screen.getByRole('combobox')
    expect(select.value).toBe('')
  })

  it('no muestra sugerencia si ya se seleccionó categoría manualmente', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    // First select a category from dropdown
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'cat-3')

    // Then type a keyword that would normally trigger a suggestion
    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'detergente')

    // No suggestion should appear since category is already selected
    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()
  })

  it('sugerencia cambia al modificar el texto', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Agregar producto...')

    // Type a cleaning product
    await user.type(input, 'detergente')
    expect(screen.getByText('Limpieza')).toBeInTheDocument()

    // Clear and type a vegetable (unambiguous match for Frutas y Verduras)
    await user.clear(input)
    await user.type(input, 'lechuga')
    expect(screen.getByText('Frutas y Verduras')).toBeInTheDocument()
  })

  it('muestra la seccion de sugerencias cuando hay recomendaciones', async () => {
    fetchShoppingRecommendations.mockResolvedValue([
      {
        name: 'Papel higienico',
        category_id: 'cat-1',
        category_name: 'Limpieza',
        category_emoji: '🧻',
        times_bought: 3,
        avg_interval_days: 30,
        last_purchased_at: new Date().toISOString(),
        predicted_next: new Date().toISOString(),
        days_until_next: 0,
      },
    ])
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText(/Sugeridos para volver a comprar/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Papel higienico')).toBeInTheDocument()
    expect(screen.getByText(/Toca recomprar/i)).toBeInTheDocument()
  })

  it('agregar una recomendacion llama a createShoppingItem con su category_id', async () => {
    const user = userEvent.setup()
    fetchShoppingRecommendations.mockResolvedValue([
      {
        name: 'Detergente',
        category_id: 'cat-1',
        category_name: 'Limpieza',
        category_emoji: '🧹',
        times_bought: 4,
        avg_interval_days: 21,
        last_purchased_at: new Date().toISOString(),
        predicted_next: new Date().toISOString(),
        days_until_next: -2,
      },
    ])
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: '+ Agregar' })
    await user.click(addBtn)

    await waitFor(() => {
      expect(createShoppingItem).toHaveBeenCalledWith({
        name: 'Detergente',
        note: null,
        category_id: 'cat-1',
      })
    })
  })

  it('no renderiza la seccion de sugerencias cuando no hay recomendaciones', async () => {
    renderShoppingList()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Sugeridos para volver a comprar/i)).not.toBeInTheDocument()
  })

  it('enviar el formulario con sugerencia aceptada envía el category_id correcto', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar producto...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar producto...'), 'detergente')

    // Accept suggestion
    const chip = screen.getByRole('button', { name: /Limpieza/ })
    await user.click(chip)

    // Submit form
    const submitBtn = screen.getByRole('button', { name: '' })
    // The submit button has no text, just an SVG icon. Find it by type=submit
    const form = screen.getByPlaceholderText('Agregar producto...').closest('form')
    form.requestSubmit()

    await waitFor(() => {
      expect(createShoppingItem).toHaveBeenCalledWith({
        name: 'detergente',
        note: null,
        category_id: 'cat-1',
      })
    })
  })
})
