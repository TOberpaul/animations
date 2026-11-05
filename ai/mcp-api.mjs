import {readFile, readdir} from 'node:fs/promises';

export async function readApi(base) {
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(new URL(path, base), {withFileTypes: true})) {
      const file = path + '/' + entry.name;
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.d.ts')) files.push(file);
    }
  }
  await walk('dist');
  files.sort();
  const declarations = await Promise.all(files.map(async file =>
    '// ' + file + '\n' + await readFile(new URL(file, base), 'utf8')
  ));
  return declarations.join('\n\n');
}
