import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const files = [];
const invalid = [];
let organizations = 0;
let missingLogos = 0;
let inlineOrganizationAbout = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '_site', 'node_modules'].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.html')) files.push(target);
  }
}

walk(ROOT);
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const queue = [JSON.parse(match[1])];
      while (queue.length) {
        const value = queue.pop();
        if (Array.isArray(value)) queue.push(...value);
        else if (value && typeof value === 'object') {
          const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
          if (types.includes('Organization')) {
            organizations++;
            const substantive = Object.keys(value).some(key => key !== '@id' && key !== '@type');
            if (substantive && !value.logo) missingLogos++;
          }
          if (value.about?.['@type'] === 'Organization') inlineOrganizationAbout++;
          queue.push(...Object.values(value));
        }
      }
    } catch (error) {
      invalid.push(`${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
}

const totals = { htmlFiles: files.length, organizations, organizationsMissingLogo: missingLogos, inlineOrganizationAbout, invalidSchemas: invalid.length };
console.log(JSON.stringify(totals, null, 2));
for (const error of invalid) console.log(error);
if (missingLogos || inlineOrganizationAbout || invalid.length) process.exitCode = 2;
