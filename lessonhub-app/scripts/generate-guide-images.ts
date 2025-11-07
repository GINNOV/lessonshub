import { readdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public', 'my-guides');
const extensions = [/\.png$/i, /\.jpe?g$/i, /\.webp$/i];
const files = readdirSync(dir).filter((file) => extensions.some((regex) => regex.test(file)));

const entries = files.map((file) => {
  const value = `/my-guides/${file}`;
  const label = file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return { label, value };
});

console.log('export const guideImageOptions = ' + JSON.stringify(entries, null, 2) + ' as const;');
