// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

vi.mock('@/lib/api.client', () => ({
  createPropiedad: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

import { PropiedadCreateDialog } from './propiedad-create-dialog'
import type { PropiedadCreateDialogProps } from './propiedad-create-dialog'
import type { Propiedad } from '@/types/propiedad'
import { createPropiedad as mockCreatePropiedad } from '@/lib/api.client'

describe('PropiedadCreateDialog — public contract for Phase 32 (D-19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expone la signature de props requerida por Phase 32', () => {
    const props: PropiedadCreateDialogProps = {
      propTipo: 'marca',
      onCreated: (created: Propiedad) => {
        const _id: number = created.id
        const _nombre: string = created.nombre
        const _abrev: string = created.abrev
        void _id
        void _nombre
        void _abrev
      },
      trigger: undefined,
      open: false,
      onOpenChange: () => {},
    }
    expect(props.propTipo).toBe('marca')
  })

  it('invoca onCreated con { id, nombre, abrev } al submit exitoso', async () => {
    const user = userEvent.setup()
    const onCreatedSpy = vi.fn()

    const fakeCreated: Propiedad = {
      id: 42,
      nombre: 'TestBrand',
      abrev: 'TEST',
      activo: true,
      createdAt: '2026-04-30T00:00:00Z',
      updatedAt: '2026-04-30T00:00:00Z',
    }
    vi.mocked(mockCreatePropiedad).mockResolvedValueOnce(fakeCreated)

    render(
      <PropiedadCreateDialog
        propTipo="marca"
        open={true}
        onOpenChange={() => {}}
        onCreated={onCreatedSpy}
      />
    )

    const nombreInput = await screen.findByLabelText(/Nombre/i)
    await user.clear(nombreInput)
    await user.type(nombreInput, 'TestBrand')

    const abrevInput = await screen.findByLabelText(/Abreviación/i)
    await user.clear(abrevInput)
    await user.type(abrevInput, 'TEST')

    const submitBtn = screen.getByRole('button', { name: /Crear marca/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(onCreatedSpy).toHaveBeenCalledTimes(1)
    })

    const arg = onCreatedSpy.mock.calls[0][0]
    expect(arg).toMatchObject({
      id: expect.any(Number),
      nombre: expect.any(String),
      abrev: expect.any(String),
    })
    expect(arg.id).toBe(42)
    expect(arg.nombre).toBe('TestBrand')
    expect(arg.abrev).toBe('TEST')
  })
})
