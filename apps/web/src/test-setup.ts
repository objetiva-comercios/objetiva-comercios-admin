import '@testing-library/jest-dom/vitest'

// Polyfills para APIs que jsdom no provee y que Radix UI consume al renderizar
// Dialog / Popover / Form. Sin estos, los tests RTL con jsdom rompen con
// "target.hasPointerCapture is not a function" o similar. Definidos solo cuando
// window existe (tests con `// @vitest-environment jsdom`).

if (typeof window !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
}
