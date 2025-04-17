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
        // '@entities': '/src/entities',
        '@enums': '/src/enums',
        '@student': '/src/student',
        '@instructor': '/src/instructor',
        '@user': '/src/users',
        '@alumni': '/src/alumni',
        '@project': '/src/projects',
        '@user-role': '/src/users-role',
        // '@services': '/src/services',
        // '@controllers': '/src/controllers',
        // '@modules': '/src/modules',
        '@tests': '/test',
      },
    },
  };
});
