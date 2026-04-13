import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressRing from '../ProgressRing'

describe('<ProgressRing />', () => {
  it('muestra el numero completado y el total', () => {
    render(<ProgressRing completed={3} total={7} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('/7')).toBeInTheDocument()
  })

  it('no revienta cuando total es 0 (division por cero)', () => {
    const { container } = render(<ProgressRing completed={0} total={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    // El SVG debe renderizarse correctamente
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('usa el color de completado cuando progress >= 1', () => {
    const { container } = render(<ProgressRing completed={5} total={5} />)
    const progressCircle = container.querySelector('.progress-ring-circle')
    // moss-400 es el color de completado
    expect(progressCircle.getAttribute('stroke')).toContain('moss-400')
  })

  it('usa el color en progreso cuando progress < 1', () => {
    const { container } = render(<ProgressRing completed={2} total={5} />)
    const progressCircle = container.querySelector('.progress-ring-circle')
    expect(progressCircle.getAttribute('stroke')).toContain('moss-300')
  })

  it('calcula el dashOffset proporcional al progreso', () => {
    const { container } = render(<ProgressRing completed={0} total={10} />)
    const progressCircle = container.querySelector('.progress-ring-circle')
    const dashArray = parseFloat(progressCircle.getAttribute('stroke-dasharray'))
    const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset'))
    // Sin progreso → offset == circumferencia completa
    expect(dashOffset).toBeCloseTo(dashArray, 2)
  })

  it('renderiza un SVG con las dimensiones esperadas', () => {
    const { container } = render(<ProgressRing completed={1} total={2} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('56')
    expect(svg.getAttribute('height')).toBe('56')
  })
})
