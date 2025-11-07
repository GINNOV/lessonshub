import { readdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public', 'my-guides');
const extensions = [/\.png$/i, /\.jpe?g$/i, /\.webp$/i];
const files = readdirSync(dir).filter((file) => extensions.some((regex) => regex.test(file)));

console.log(files);
