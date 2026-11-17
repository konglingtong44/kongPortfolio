import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { main } from './checks/check-docs.mjs';
export { checkLinks, localLinks } from './checks/check-docs.mjs';

// Keep the original CLI and import API while implementation lives in checks/.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
