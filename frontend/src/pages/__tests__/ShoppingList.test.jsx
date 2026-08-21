import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ShoppingList, { parseItemNames } from '../ShoppingList'

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
  updateShoppingItem,
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
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'detergente')

    expect(screen.getByText('Sugerencia:')).toBeInTheDocument()
    expect(screen.getByText('Limpieza')).toBeInTheDocument()
    expect(screen.getByText('🧹')).toBeInTheDocument()
  })

  it('no muestra chip para texto sin match', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'xyzabc')

    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()
  })

  it('aceptar sugerencia actualiza el dropdown de categoría', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'detergente')

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
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'detergente')
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
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    // First select a category from dropdown
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'cat-3')

    // Then type a keyword that would normally trigger a suggestion
    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'detergente')

    // No suggestion should appear since category is already selected
    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()
  })

  it('sugerencia cambia al modificar el texto', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Agregar productos (separa con comas)...')

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
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Sugeridos para volver a comprar/i)).not.toBeInTheDocument()
  })

  it('enviar el formulario con sugerencia aceptada envía el category_id correcto', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Agregar productos (separa con comas)...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Agregar productos (separa con comas)...'), 'detergente')

    // Accept suggestion
    const chip = screen.getByRole('button', { name: /Limpieza/ })
    await user.click(chip)

    // Submit form
    const submitBtn = screen.getByRole('button', { name: '' })
    // The submit button has no text, just an SVG icon. Find it by type=submit
    const form = screen.getByPlaceholderText('Agregar productos (separa con comas)...').closest('form')
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

describe('ShoppingList — edición de ítems', () => {
  const PENDING_ITEM = {
    id: 'item-1',
    name: 'Detergente',
    note: null,
    category_id: null,
    category_name: null,
    category_emoji: null,
    is_purchased: false,
    added_by: 'Juan',
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchShoppingItems.mockResolvedValue([PENDING_ITEM])
    fetchShoppingCategories.mockResolvedValue(MOCK_CATEGORIES)
    fetchShoppingRecommendations.mockResolvedValue([])
    updateShoppingItem.mockResolvedValue({ ...PENDING_ITEM })
  })

  it('al tocar editar muestra el formulario inline con los valores actuales', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Editar'))

    expect(screen.getByDisplayValue('Detergente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('asignar una categoría a un ítem sin categoría llama a updateShoppingItem', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Editar'))

    // En modo edición hay 2 selects: el del form de agregar y el de la edición.
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[selects.length - 1], 'cat-1')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(updateShoppingItem).toHaveBeenCalledWith('item-1', {
        name: 'Detergente',
        note: null,
        category_id: 'cat-1',
      })
    })
  })

  it('editar el nombre y la nota envía los nuevos valores', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Editar'))

    const nameInput = screen.getByDisplayValue('Detergente')
    await user.clear(nameInput)
    await user.type(nameInput, 'Detergente liquido')

    await user.type(screen.getByPlaceholderText('Nota (ej: marca, cantidad...)'), 'marca Fab')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(updateShoppingItem).toHaveBeenCalledWith('item-1', {
        name: 'Detergente liquido',
        note: 'marca Fab',
        category_id: null,
      })
    })
  })

  it('cancelar sale del modo edición sin guardar', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Editar'))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateShoppingItem).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.getByText('Detergente')).toBeInTheDocument()
  })

  it('no permite guardar con el nombre vacío', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    await waitFor(() => {
      expect(screen.getByText('Detergente')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Editar'))
    await user.clear(screen.getByDisplayValue('Detergente'))

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})

describe('parseItemNames', () => {
  it('devuelve un solo nombre cuando no hay comas', () => {
    expect(parseItemNames('detergente')).toEqual(['detergente'])
  })

  it('separa por comas y recorta espacios', () => {
    expect(parseItemNames('manzana, pera ,  banano')).toEqual(['manzana', 'pera', 'banano'])
  })

  it('ignora entradas vacías y comas sobrantes', () => {
    expect(parseItemNames(' , manzana,, ,pera, ')).toEqual(['manzana', 'pera'])
  })

  it('elimina duplicados sin distinguir mayúsculas', () => {
    expect(parseItemNames('Leche, leche, LECHE, pan')).toEqual(['Leche', 'pan'])
  })

  it('normaliza espacios internos', () => {
    expect(parseItemNames('papel   higienico')).toEqual(['papel higienico'])
  })

  it('devuelve lista vacía para texto vacío o nulo', () => {
    expect(parseItemNames('')).toEqual([])
    expect(parseItemNames('   ')).toEqual([])
    expect(parseItemNames(null)).toEqual([])
  })
})

describe('ShoppingList — agregar múltiples productos por coma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchShoppingItems.mockResolvedValue([])
    fetchShoppingCategories.mockResolvedValue(MOCK_CATEGORIES)
    fetchShoppingRecommendations.mockResolvedValue([])
    createShoppingItem.mockResolvedValue({ id: 'new-1' })
  })

  it('crea un item por cada producto separado por coma con la misma categoría', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, tomate, cebolla')
    await user.selectOptions(screen.getByRole('combobox'), 'cat-2')
    input.closest('form').requestSubmit()

    await waitFor(() => {
      expect(createShoppingItem).toHaveBeenCalledTimes(3)
    })
    expect(createShoppingItem).toHaveBeenCalledWith({ name: 'lechuga', note: null, category_id: 'cat-2' })
    expect(createShoppingItem).toHaveBeenCalledWith({ name: 'tomate', note: null, category_id: 'cat-2' })
    expect(createShoppingItem).toHaveBeenCalledWith({ name: 'cebolla', note: null, category_id: 'cat-2' })
  })

  it('muestra el preview con la cantidad de productos', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, tomate')

    expect(screen.getByText(/2 productos: lechuga · tomate/)).toBeInTheDocument()
  })

  it('no muestra preview con un solo producto', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga')

    expect(screen.queryByText(/productos:/)).not.toBeInTheDocument()
  })

  it('limpia el input y avisa cuántos se agregaron', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, tomate')
    input.closest('form').requestSubmit()

    await waitFor(() => {
      expect(screen.getByText('2 productos agregados')).toBeInTheDocument()
    })
    expect(input.value).toBe('')
  })

  it('conserva en el input los productos que fallaron', async () => {
    const user = userEvent.setup()
    createShoppingItem.mockImplementation(({ name }) =>
      name === 'tomate' ? Promise.reject(new Error('boom')) : Promise.resolve({ id: 'ok' })
    )
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, tomate')
    input.closest('form').requestSubmit()

    await waitFor(() => {
      expect(screen.getByText('1 agregados, 1 con error')).toBeInTheDocument()
    })
    expect(input.value).toBe('tomate')
  })

  it('sugiere la categoría cuando todos los productos son de la misma', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, tomate')

    expect(screen.getByText('Sugerencia:')).toBeInTheDocument()
    expect(screen.getByText('Frutas y Verduras')).toBeInTheDocument()
  })

  it('no sugiere categoría cuando los productos son de categorías distintas', async () => {
    const user = userEvent.setup()
    renderShoppingList()

    const input = await screen.findByPlaceholderText('Agregar productos (separa con comas)...')
    await user.type(input, 'lechuga, detergente')

    expect(screen.queryByText('Sugerencia:')).not.toBeInTheDocument()
  })
})
