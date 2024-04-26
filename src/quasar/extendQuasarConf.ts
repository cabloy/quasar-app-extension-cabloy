import babel from '@cabloy/vite-plugin-babel';
import { loadEnvs } from '@cabloy/dotenv';
import { mergeConfig } from 'vite';
import { getEnvMeta } from './utils.js';
import { vitePluginFakeServer } from 'vite-plugin-fake-server';

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
  const vitePlugins = generateVitePlugins(api);
  conf.build.vitePlugins = (conf.build.vitePlugins || []).concat(vitePlugins);
}

function __loadEnvs(api) {
  const meta = getEnvMeta(api);
  const appPaths = api.ctx.appPaths;
  const envDir = appPaths.resolve.app('env');
  const envs = loadEnvs(meta, envDir, '.env');
  return Object.assign(
    {
      NODE_ENV: meta.mode,
    },
    envs,
    {
      META_FLAVOR: meta.flavor,
      META_MODE: meta.mode,
      META_APP_MODE: meta.appMode,
    },
  );
}

function _getVitePluginTs() {
  return (<any>babel)({
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
  });
}

function _getVitePluginTsx() {
  return [
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
  ];
}

function _getVitePluginMock(_api) {
  const include = process.env.MOCK_PATH;
  const logger = process.env.MOCK_LOGGER === 'true';
  const basename = process.env.MOCK_BASE_NAME || '';
  const build =
    process.env.MOCK_BUILD === 'true'
      ? {
          port: Number(process.env.MOCK_BUILD_PORT || 8888),
          outDir: process.env.MOCK_BUILD_OUTPUT || 'distMockServer',
        }
      : false;
  return vitePluginFakeServer({
    include,
    exclude: ['_*'],
    infixName: 'fake',
    watch: true,
    logger,
    basename,
    enableDev: true,
    enableProd: true,
    build,
  });
}

function _getVitePluginChecker() {
  return [
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
  ];
}

function generateVitePlugins(api) {
  const vitePlugins: any[] = [];
  vitePlugins.push(_getVitePluginTs());
  vitePlugins.push(_getVitePluginTsx());
  if (process.env.MOCK_ENABLED === 'true') {
    vitePlugins.push(_getVitePluginMock(api));
  }
  vitePlugins.push(_getVitePluginChecker());
  return vitePlugins;
}
