import "@testing-library/jest-dom"
import { vi } from 'vitest'

vi.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}))