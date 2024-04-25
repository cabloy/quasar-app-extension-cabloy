import babel from '@cabloy/vite-plugin-babel';
import { loadEnvs } from '@cabloy/dotenv';
import { mergeConfig } from 'vite';
import { getEnvMeta } from './utils.js';

export function extendQuasarConf(conf, api) {
  // boot
  conf.boot.unshift('cabloy');
  // env
  const env = __loadEnvs(api);
  // build: alias
  conf.build = mergeConfig(conf.build as unknown as any, {
    alias: {
      '@vue/runtime-core': '@cabloy/vue-runtime-core',
    },
    env,
  });
  // build: publicPath
  conf.build.publicPath = env.APP_PUBLIC_PATH;
  // build: vueRouterMode/vueRouterBase
  conf.build.vueRouterMode = env.APP_ROUTER_MODE;
  conf.build.vueRouterBase = env.APP_ROUTER_BASE;
  // build: vitePlugins
  const vitePlugins = generateVitePlugins();
  conf.build.vitePlugins = (conf.build.vitePlugins || []).concat(vitePlugins);
}

function __loadEnvs(api) {
  const meta = getEnvMeta(api);
  const appPaths = api.ctx.appPaths;
  const envDir = appPaths.resolve.app('env');
  const envs = loadEnvs(meta, envDir, '.env');
  return Object.assign({}, envs, {
    META_FLAVOR: meta.flavor,
    META_MODE: meta.mode,
    META_APP_MODE: meta.appMode,
  });
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
