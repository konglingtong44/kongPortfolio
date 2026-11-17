import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Repository Markdown conventions: inline links/images and reference definitions.
// This checks local file targets only, not heading fragments or external URLs.
export function localLinks(markdown) {
  const links = [];
  let fence;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker) { fence = marker[1]; continue; }
    const prose = line.replace(/(`+).*?\1/g, '');
    const inline = /!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
    const reference = /^ {0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/g;
    for (const pattern of [inline, reference]) {
      for (const match of prose.matchAll(pattern)) {
        const href = match[1].startsWith('<') ? match[1].slice(1, -1) : match[1];
        if (href.startsWith('#') || href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
        links.push({ href, line: index + 1 });
      }
    }
  }
  return links;
}

export function checkLinks(root, file, markdown) {
  const failures = [];
  for (const link of localLinks(markdown)) {
    let path;
    try { path = decodeURIComponent(link.href.split(/[?#]/, 1)[0]); }
    catch { failures.push({ ...link, reason: 'invalid URL encoding' }); continue; }
    const target = path.startsWith('/') ? resolve(root, `.${path}`) : resolve(root, dirname(file), path);
    const within = relative(root, target);
    if (within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) {
      failures.push({ ...link, reason: 'target leaves repository' });
    } else if (!existsSync(target)) {
      failures.push({ ...link, reason: 'missing local target' });
    }
  }
  return failures;
}

export function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });
  if (files.error || files.status !== 0) throw new Error('Cannot enumerate repository Markdown files.');
  const paths = [...new Set(files.stdout.split('\0'))].filter(path => path.endsWith('.md') && existsSync(resolve(root, path)));
  let count = 0;
  for (const path of paths) {
    for (const failure of checkLinks(root, path, readFileSync(resolve(root, path), 'utf8'))) {
      console.error(`${path}:${failure.line}: ${failure.reason}: ${failure.href}`);
      count++;
    }
  }
  if (count) {
    console.error(`Documentation check failed: ${count} broken local link(s). Fix the destination or relative path.`);
    process.exitCode = 1;
  } else {
    console.log(`Documentation links passed (${paths.length} Markdown files; local targets only).`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
