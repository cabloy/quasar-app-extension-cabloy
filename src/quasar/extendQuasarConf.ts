import babel from '@cabloy/vite-plugin-babel';
import { mergeConfig } from 'vite';

export function extendQuasarConf(conf, _api) {
  const vitePlugins = [
    [
      (<any>babel)({
        filter: /\.ts$/,
        babelConfig: {
          babelrc: false,
          configFile: false,
          plugins: [
            ['babel-plugin-cabloy-front-bean-module'],
            ['babel-plugin-transform-typescript-metadata'],
            ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
            ['@babel/plugin-transform-class-properties', { loose: true }],
            ['@babel/plugin-transform-typescript'],
          ],
        },
      }),
    ],
    [
      '@vitejs/plugin-vue-jsx',
      {
        include: /\.[jt]sx$/,
        babelPlugins: [
          ['babel-plugin-cabloy-front-bean-module'],
          ['babel-plugin-transform-typescript-metadata'],
          ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
        ],
      },
    ],
    [
      'vite-plugin-checker',
      {
        vueTsc: {
          tsconfigPath: 'tsconfig.vue-tsc.json',
        },
        eslint: {
          lintCommand: 'eslint "./**/*.{js,ts,mjs,cjs,vue}"',
        },
      },
      { server: false },
    ],
  ];
  // boot
  conf.boot.unshift('cabloy');
  // build: alias
  conf.build = mergeConfig(conf.build as unknown as any, {
    alias: {
      '@vue/runtime-core': '@cabloy/vue-runtime-core',
    },
  });
  // build: vitePlugins
  conf.build.vitePlugins = (conf.build.vitePlugins || []).concat(vitePlugins);
}
