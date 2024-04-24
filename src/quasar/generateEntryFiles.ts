export async function generateModulesMeta(config, api, { quasarConf: _quasarConf }) {
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
