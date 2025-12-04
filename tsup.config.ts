import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['serialport', '@serialport/parser-inter-byte-timeout'],
  target: 'node20',
  minify: true,
  splitting: false,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
