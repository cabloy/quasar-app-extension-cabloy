import parseArgs from 'minimist';

export function getFlavor() {
  const argv = parseArgs(process.argv.slice(2));
  return argv.flavor || 'web';
}
