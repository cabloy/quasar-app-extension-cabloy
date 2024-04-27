import { mergeConfig } from 'vite';

const __SvgIconPattern = /assets\/icons\/groups\/.*?\.svg/;
const __ModuleLibs = [
  /src\/module\/([^\/]*?)\//,
  /src\/module-vendor\/([^\/]*?)\//,
  /src\/suite\/.*\/modules\/([^\/]*?)\//,
  /src\/suite-vendor\/.*\/modules\/([^\/]*?)\//,
  /node_modules\/cabloy-module-front-([^\/]*?)\//,
];

const __CabloyManualChunkVendors = [
  { match: ['@faker-js'], output: 'faker' },
  {
    match: [/cabloy\/config\.js/],
    output: '-cabloy-config',
  },
  {
    match: ['vue', '@vue', 'reflect-metadata', '@cabloy', 'packages-cabloy/core'],
    output: 'cabloy',
  },
  { match: ['vue-router'], output: 'vue-router' },
];

export function extendViteConf(conf, _api) {
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
  let vendors = conf.__cabloyManualChunkVendors_runtime;
  if (!vendors) {
    vendors = conf.__cabloyManualChunkVendors_runtime =
      conf.cabloyManualChunk.vendors.concat(__CabloyManualChunkVendors);
  }
  const matchItem = vendors.find(item => {
    return item.match.some(item => {
      if (typeof item === 'string') {
        return id.indexOf(`/${item}/`) > -1;
      }
      return item.test(id);
    });
  });
  if (matchItem) return matchItem.output;
  return null;
}

function _configManualChunk_modules(id: string) {
  for (const moduleLib of __ModuleLibs) {
    const matched = id.match(moduleLib);
    if (matched) return matched[1];
  }
  return null;
}
