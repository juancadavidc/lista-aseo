import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TaskCard from '../TaskCard'

function buildTask(overrides = {}) {
  return {
    id: 1,
    name: 'Trapear cocina',
    description: 'Con jabon de piso',
    frequency_type: 'weekly',
    frequencyLabel: 'Semanal',
    overdueLabel: 'desde hace 2 días',
    lastCompletedAt: '2026-04-20T00:00:00Z',
    ...overrides,
  }
}

describe('<TaskCard />', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('renderiza nombre, descripcion y badge de frecuencia', () => {
    render(<TaskCard task={buildTask()} onComplete={vi.fn()} />)
    expect(screen.getByText('Trapear cocina')).toBeInTheDocument()
    expect(screen.getByText('Con jabon de piso')).toBeInTheDocument()
    expect(screen.getByText('Semanal')).toBeInTheDocument()
    expect(screen.getByText('desde hace 2 días')).toBeInTheDocument()
  })

  it('muestra el producto asociado cuando viene en la tarea', () => {
    const task = buildTask({
      product_name: 'Detergente',
      product_image: 'imgs/det.png',
    })
    render(<TaskCard task={task} onComplete={vi.fn()} />)
    expect(screen.getByText('🧴 Detergente')).toBeInTheDocument()
    const img = screen.getByAltText('Detergente')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toContain('imgs/det.png')
  })

  it('usa urgencia alta cuando la tarea nunca ha sido completada', () => {
    const task = buildTask({ lastCompletedAt: null, overdueLabel: 'nunca' })
    const { container } = render(<TaskCard task={task} onComplete={vi.fn()} />)
    const stripe = container.querySelector('.urgency-stripe')
    expect(stripe.getAttribute('style')).toContain('var(--urgency-high)')
  })

  it('usa urgencia baja cuando el overdueLabel no indica retraso', () => {
    const task = buildTask({ overdueLabel: 'hoy' })
    const { container } = render(<TaskCard task={task} onComplete={vi.fn()} />)
    const stripe = container.querySelector('.urgency-stripe')
    expect(stripe.getAttribute('style')).toContain('var(--urgency-low)')
  })

  it('muestra icono mensual para tareas con frecuencia monthly', () => {
    const task = buildTask({ frequency_type: 'monthly', frequencyLabel: 'Mensual' })
    render(<TaskCard task={task} onComplete={vi.fn()} />)
    expect(screen.getByText('Mensual')).toBeInTheDocument()
  })

  it('cae al icono semanal cuando la frecuencia es desconocida', () => {
    const task = buildTask({ frequency_type: 'yearly', frequencyLabel: 'Anual' })
    const { container } = render(<TaskCard task={task} onComplete={vi.fn()} />)
    // weekly icon usa <rect> con esquinas redondeadas
    expect(container.querySelector('rect[rx="2"]')).toBeInTheDocument()
  })

  it('llama onComplete con el id al hacer click', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<TaskCard task={buildTask()} onComplete={onComplete} />)
    const card = container.querySelector('.task-card')

    await act(async () => {
      fireEvent.click(card)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(onComplete).toHaveBeenCalledWith(1)
  })

  it('aplica la clase task-exit despues del click', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<TaskCard task={buildTask()} onComplete={onComplete} />)
    const card = container.querySelector('.task-card')

    await act(async () => {
      fireEvent.click(card)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(card.classList.contains('task-exit')).toBe(true)
  })
})
