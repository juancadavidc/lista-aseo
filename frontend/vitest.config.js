import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // all: true reporta TODOS los archivos del proyecto (incluidos los sin tests)
      // para reflejar la cobertura real, no solo la de archivos importados por tests.
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/**/*.test.{js,jsx}',
        'src/test/**',
        // auth.js solo configura el cliente de better-auth a partir de env vars,
        // no tiene logica que valga la pena testear.
        'src/lib/auth.js',
      ],
      // Thresholds fijados al nivel actual para prevenir regresiones.
      // A medida que agreguemos tests, subimos estos numeros.
      thresholds: {
        lines: 17,
        statements: 17,
        functions: 18,
        branches: 11,
      },
    },
  },
})
