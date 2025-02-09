import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default;

  return {
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      environment: 'node',
      include: ['./test/**/*.spec.ts'],
      alias: {
        '@': '/src',
        '@entities': '/src/entities',
        '@services': '/src/services',
        '@controllers': '/src/controllers',
        '@modules': '/src/modules',
        '@tests': '/test',
      },
    },
  };
});
