import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/t.js',
    format: 'iife',
    name: 'tidemeter',
    sourcemap: false,
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    terser({
      compress: { passes: 2 },
      mangle: true,
    }),
  ],
};
