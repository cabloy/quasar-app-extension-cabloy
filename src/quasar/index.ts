/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

import { extendQuasarConf } from './extendQuasarConf.js';
import { extendViteConf } from './extendViteConf.js';
import { generateEntryFiles } from './generateEntryFiles.js';

export async function quasar(api) {
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
