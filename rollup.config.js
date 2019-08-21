// import resolve from 'rollup-plugin-node-resolve';
// import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default [
  {
    input: 'src/main.js',
    output: {
      name: 'inputKnob',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      // resolve(),
      // commonjs(),
    ]
  },
  {
    input: 'src/main.js',
    external: ['ms'],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ]
  }
];
