import babel from '@cabloy/vite-plugin-babel';
import { loadEnvs } from '@cabloy/dotenv';
import { mergeConfig } from 'vite';
import { getFlavor } from './getFlavor.js';

export function extendQuasarConf(conf, api) {
  // boot
  conf.boot.unshift('cabloy');
  // load envs
  const envs = __loadEnvs(api);
  console.log(envs);
  // build: alias
  conf.build = mergeConfig(conf.build as unknown as any, {
    alias: {
      '@vue/runtime-core': '@cabloy/vue-runtime-core',
    },
  });
  // build: vitePlugins
  const vitePlugins = generateVitePlugins();
  conf.build.vitePlugins = (conf.build.vitePlugins || []).concat(vitePlugins);
}

function __loadEnvs(api) {
  // flavor
  const flavor = getFlavor();
  // mode
  const mode = api.ctx.prod ? 'production' : 'development';
  // appMode
  const appMode = api.ctx.modeName;
  const meta = { flavor, mode, appMode, mine: 'mine' };
  const appPaths = api.ctx.appPaths;
  const envDir = appPaths.resolve.src('env');
  const envs = loadEnvs(meta, envDir, '.env');
  return envs;
}

function generateVitePlugins() {
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
  return vitePlugins;
}
