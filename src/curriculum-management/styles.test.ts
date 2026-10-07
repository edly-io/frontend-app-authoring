import fs from 'fs';
import path from 'path';

const moduleDir = __dirname;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__mocks__' ? [] : sourceFiles(full);
    }
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
  });

const scss = fs.readFileSync(path.join(moduleDir, 'CurriculumManagement.scss'), 'utf8');

describe('curriculum-management styles', () => {
  it('does not rely on a `min-w-0` utility, which neither Paragon nor Bootstrap 4 provides', () => {
    const offenders = sourceFiles(moduleDir).filter((file) => /\bmin-w-0\b/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders.map((file) => path.relative(moduleDir, file))).toEqual([]);
  });

  it('defines every curriculum-management-* class that the components use', () => {
    const used = new Set<string>();
    sourceFiles(moduleDir).forEach((file) => {
      (fs.readFileSync(file, 'utf8').match(/curriculum-management-[a-z0-9-]+/g) ?? []).forEach((name) =>
        used.add(name)
      );
    });
    const undefinedClasses = [...used].filter((name) => !scss.includes(`.${name}`));
    expect(undefinedClasses).toEqual([]);
  });

  it('keeps flex children shrinkable so long names wrap instead of overflowing', () => {
    expect(scss).toMatch(/\.curriculum-management-min-width-0\s*\{\s*min-width:\s*0;/);
  });
});
