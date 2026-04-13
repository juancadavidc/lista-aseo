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
      ],
      // Thresholds fijados al nivel actual para prevenir regresiones.
      // A medida que agreguemos tests, subimos estos numeros.
      thresholds: {
        lines: 7,
        statements: 7,
        functions: 4,
        branches: 5,
      },
    },
  },
})
