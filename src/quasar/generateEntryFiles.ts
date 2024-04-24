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
import { getFlavor } from './getFlavor.js';

export async function generateEntryFiles(api, { quasarConf }) {
  // config
  const config = await generateConfig(api, { quasarConf });
  // modules meta
  await generateModulesMeta(config, api, { quasarConf });
}

async function generateConfig(api, { quasarConf }) {
  const appPaths = api.ctx.appPaths;
  // flavor
  const flavor = getFlavor();
  // entry
  const entryDefault = appPaths.resolve.src('front/config/config/config.ts');
  const entryFlavor = appPaths.resolve.src(`front/config/config/config.${flavor}.ts`);
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
