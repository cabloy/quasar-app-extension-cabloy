import { getFlavor } from '../common/utils.js';

export function getEnvMeta(api) {
  // flavor
  const flavor = getFlavor();
  // mode
  const mode = api.ctx.prod ? 'production' : 'development';
  // appMode
  const appMode = api.ctx.modeName;
  return { flavor, mode, appMode, mine: 'mine' };
}
