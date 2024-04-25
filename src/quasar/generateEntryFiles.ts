import { readFileSync } from 'node:fs';
import fse from 'fs-extra';
import compileTemplate from 'lodash/template.js';
import { glob } from '@cabloy/module-glob';
import tmp from 'tmp';
import { build as esBuild } from 'esbuild';
import chalk from 'chalk';
import { extend } from '@cabloy/extend';

import { pathToFileURL } from 'node:url';
import * as Path from 'node:path';
import { getEnvMeta } from './utils.js';
import { getEnvFiles } from '@cabloy/dotenv';

export async function generateEntryFiles(api, { quasarConf }) {
  // config
  const config = await generateConfig(api);
  // modules meta
  await generateModulesMeta(config, api, { quasarConf });
}

async function generateConfig(api) {
  const appPaths = api.ctx.appPaths;
  // check config
  let configDir = appPaths.resolve.src('front/config');
  if (!fse.existsSync(configDir)) {
    console.log(chalk.red('Please copy directory: from _config to config\n'));
    process.exit(0);
  }
  // meta
  const meta = getEnvMeta(api);
  configDir = appPaths.resolve.src('front/config/config');
  const files = getEnvFiles(meta, configDir, 'config', '.ts')!;
  const targetMeta: any = { ...meta };
  delete targetMeta.mine;
  const target = {
    meta: targetMeta,
    env: {
      appServer: process.env.APP_SERVER === 'true',
      appRouterMode: process.env.APP_ROUTER_MODE,
      appRouterBase: process.env.APP_ROUTER_BASE,
      appPublicPath: process.env.APP_PUBLIC_PATH,
      appName: process.env.APP_NAME,
      appTitle: process.env.APP_TITLE,
      appVersion: process.env.APP_VERSION,
    },
  };
  for (const file of files) {
    const config = await _loadConfig(file, targetMeta, api);
    if (config) {
      extend(true, target, config);
    }
  }
  // output
  const contentDest = `export default ${JSON.stringify(target, null, 2)};`;
  const fileDest = appPaths.resolve.app('.quasar/cabloy/config.js');
  fse.ensureFileSync(fileDest);
  fse.writeFileSync(fileDest, contentDest, 'utf-8');
  // ok
  return target;
}

async function _loadConfig(fileName: string, meta, api) {
  // temp
  const fileTempObj = tmp.fileSync({ postfix: '.mjs' });
  const fileTemp = fileTempObj.name;
  // build
  const esBuildConfig = _createEsbuildConfig(fileName, fileTemp, api);
  await esBuild(esBuildConfig as any);
  // load
  const fnResult = await import(_pathToHref(fileTemp));
  const configFn = fnResult.default || fnResult;
  const config = await configFn(meta);
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
  const fileSrc = new URL('../../templates/cabloy-modules-meta.ejs', import.meta.url);
  const contentSrc = readFileSync(fileSrc, 'utf8');
  const template = compileTemplate(contentSrc);
  // dest
  const contentDest = template({ modules });
  const fileDest = appPaths.resolve.app('.quasar/cabloy/modules-meta.js');
  fse.ensureFileSync(fileDest);
  fse.writeFileSync(fileDest, contentDest, 'utf-8');
}

function _pathToHref(fileName: string): string {
  return Path.sep === '\\' ? pathToFileURL(fileName).href : fileName;
}
