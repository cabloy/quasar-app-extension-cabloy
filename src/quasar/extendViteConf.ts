import { CabloyViteConfigResult } from '@cabloy/app-vite/dist/types.js';
import { mergeConfig } from 'vite';

export function extendViteConf(conf, api) {
  const cabloyViteMeta = api.cabloyViteMeta as CabloyViteConfigResult;
  conf.build = mergeConfig(conf.build as unknown as any, cabloyViteMeta.viteConfig.build);
}
