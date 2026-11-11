import { spawnSync } from 'node:child_process';

// NUL delimiters preserve spaces, Unicode and line breaks in Git paths.
const args = process.argv.includes('--all') ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'];
const result = spawnSync('git', args, { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error('Commit blocked: could not inspect staged file paths.');
  process.exit(1);
}

function privatePath(path) {
  const parts = path.normalize('NFKC').toLowerCase().split('/');
  const filename = parts.at(-1);
  if (parts.some(part => ['.local', '.aws', '.ssh', '.terraform', 'secrets', 'resume', 'resumes', 'resume-review', 'cv'].includes(part))) return true;
  if (/\.(?:tfstate(?:\..*)?|tfplan(?:\..*)?|tfvars(?:\.json)?|tflock)$/.test(filename)) return true;
  if (['backend.hcl', '.terraformrc', 'terraform.rc', 'override.tf', 'override.tf.json'].includes(filename) || /_override\.tf(?:\.json)?$/.test(filename)) return true;
  if (parts.some(part => /^credentials(?:$|\.)/.test(part) || /^\.env(?:$|\.)/.test(part))) return true;
  if (/\.(?:pem|key|p12|pfx|jks|keystore|crt|cer|der|csr|p7b|p7c|p8|log)$/.test(filename)) return true;
  if (/^(?:resume|cv)(?:$|[._\s-])/.test(filename) || /履歴書|職務経歴書|简历|履历/.test(filename)) return true;
  return /(?:secret|service-account).*\.json$/.test(filename);
}

const blocked = result.stdout.split('\0').filter(Boolean).filter(privatePath);
if (blocked.length) {
  console.error('Commit blocked: private local data, resume, log, credential or certificate file is staged.');
  for (const path of blocked) console.error(`  ${JSON.stringify(path)}`);
  console.error('Unstage these files before committing; keep them outside the published source.');
  process.exit(1);
}
