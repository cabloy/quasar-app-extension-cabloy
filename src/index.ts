/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

import { readFileSync } from 'node:fs';
import fse from 'fs-extra';
import compileTemplate from 'lodash/template.js';
import { glob } from '@cabloy/module-glob';
import parseArgs from 'minimist';
import tmp from 'tmp';
import { build as esBuild } from 'esbuild';
import chalk from 'chalk';
import { extend } from '@cabloy/extend';
import { mergeConfig } from 'vite';
import babel from '@cabloy/vite-plugin-babel';
import { pathToFileURL } from 'node:url';
import * as Path from 'node:path';

const __SvgIconPattern = /assets\/icons\/groups\/.*?\.svg/;

export default async function (api) {
  // config
  api.extendQuasarConf(extendQuasarConf);
  api.extendViteConf(extendViteConf);
  // before dev
  api.beforeDev(async (api, { quasarConf }) => {
    await generateEntryFiles(api, { quasarConf });
  });
  // before build
  api.beforeBuild(async (api, { quasarConf }) => {
    await generateEntryFiles(api, { quasarConf });
  });
}

function extendQuasarConf(conf, _api) {
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

function extendViteConf(conf, _api) {
  conf.build = mergeConfig(conf.build as unknown as any, {
    rollupOptions: {
      output: {
        manualChunks: id => {
          return configManualChunk(conf, id);
        },
      },
    },
    assetsInlineLimit: (filePath: string) => {
      if (__SvgIconPattern.test(filePath)) {
        return 0;
      }
    },
  });
}

async function generateEntryFiles(api, { quasarConf }) {
  // config
  const config = await generateConfig(api, { quasarConf });
  // modules meta
  await generateModulesMeta(config, api, { quasarConf });
}

async function generateConfig(api, { quasarConf }) {
  const appPaths = api.ctx.appPaths;
  // flavor
  const argv = parseArgs(process.argv.slice(2));
  const flavor = argv.flavor || 'web';
  // entry
  const entryDefault = appPaths.resolve.src('front/config/config.default.ts');
  const entryFlavor = appPaths.resolve.src(`front/config/config.${flavor}.ts`);
  if (!fse.existsSync(entryDefault)) {
    console.log(chalk.red('Please copy directory: from _config to config\n'));
    process.exit(0);
  }
  if (!fse.existsSync(entryFlavor)) {
    console.log(chalk.red(`  Flavor Config File Not Found:\n  ${entryFlavor}\n`));
    process.exit(0);
  }
  // meta
  const meta = {
    flavor: flavor,
    mode: api.ctx.mode,
    modeName: api.ctx.modeName,
    dev: api.ctx.dev,
    prod: api.ctx.prod,
  };
  // config
  const configDefault = await _loadConfig(entryDefault, api, { quasarConf });
  const configFlavor = await _loadConfig(entryFlavor, api, { quasarConf });
  const config = extend(true, { meta }, configDefault, configFlavor);
  // output
  const contentDest = `export default ${JSON.stringify(config, null, 2)};`;
  const fileDest = appPaths.resolve.app('.quasar/cabloy/config.js');
  fse.ensureFileSync(fileDest);
  fse.writeFileSync(fileDest, contentDest, 'utf-8');
  // ok
  return config;
}

async function _loadConfig(fileName: string, api, { quasarConf }) {
  // temp
  const fileTempObj = tmp.fileSync({ postfix: '.mjs' });
  const fileTemp = fileTempObj.name;
  // build
  const esBuildConfig = _createEsbuildConfig(fileName, fileTemp, api);
  await esBuild(esBuildConfig as any);
  // load
  const fnResult = await import(_pathToHref(fileTemp));
  const configFn = fnResult.default || fnResult;
  const config = await configFn(api.ctx, { quasarConf });
  // delete temp
  fileTempObj.removeCallback();
  // ok
  return config;
}

function _createEsbuildConfig(fileSrc: string, fileDest: string, api) {
  const appPaths = api.ctx.appPaths;
  return {
    platform: 'node',
    format: appPaths.quasarConfigOutputFormat,
    bundle: true,
    packages: 'external',
    resolveExtensions: [appPaths.quasarConfigOutputFormat === 'esm' ? '.mjs' : '.cjs', '.js', '.mts', '.ts', '.json'],
    entryPoints: [fileSrc],
    outfile: fileDest,
  };
}

async function generateModulesMeta(config, api, { quasarConf: _quasarConf }) {
  const appPaths = api.ctx.appPaths;
  // modules
  const { modules } = await glob({
    projectPath: appPaths.appDir,
    disabledModules: config.base.disabledModules,
    disabledSuites: config.base.disabledSuites,
    log: true,
    projectMode: 'front',
    loadPackage: true,
  });
  // src
  const fileSrc = new URL('../templates/cabloy-modules-meta.ejs', import.meta.url);
  const contentSrc = readFileSync(fileSrc, 'utf8');
  const template = compileTemplate(contentSrc);
  // dest
  const contentDest = template({ modules });
  const fileDest = appPaths.resolve.app('.quasar/cabloy/modules-meta.js');
  fse.ensureFileSync(fileDest);
  fse.writeFileSync(fileDest, contentDest, 'utf-8');
}

const moduleLibs = [
  /src\/module\/([^\/]*?)\//,
  /src\/module-vendor\/([^\/]*?)\//,
  /src\/suite\/.*\/modules\/([^\/]*?)\//,
  /src\/suite-vendor\/.*\/modules\/([^\/]*?)\//,
  /node_modules\/cabloy-module-front-([^\/]*?)\//,
];

const configManualChunk = (conf, id: string) => {
  id = id.replace(/\\/gi, '/');
  // modules
  let output = _configManualChunk_modules(id);
  if (output) return output;
  // vendors
  output = _configManualChunk_vendors(conf, id);
  if (output) return output;
  // default
  if (conf.cabloyManualChunk.debug) {
    console.log(id);
  }
  return 'vendor';
};

function _configManualChunk_vendors(conf, id: string) {
  const matchItem = conf.cabloyManualChunk.vendors.find(item => {
    return item.match.some(item => id.indexOf(`/${item}/`) > -1);
  });
  if (matchItem) return matchItem.output;
  return null;
}

function _configManualChunk_modules(id: string) {
  for (const moduleLib of moduleLibs) {
    const matched = id.match(moduleLib);
    if (matched) return matched[1];
  }
  return null;
}

function _pathToHref(fileName: string): string {
  return Path.sep === '\\' ? pathToFileURL(fileName).href : fileName;
}
