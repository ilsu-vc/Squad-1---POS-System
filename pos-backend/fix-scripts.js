const fs = require('fs');
const path = require('path');

const dirs = fs.readdirSync(__dirname);

for (const dir of dirs) {
  const pkgPath = path.join(__dirname, dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.scripts) {
      let modified = false;
      const newScripts = {};
      for (const [key, value] of Object.entries(pkg.scripts)) {
        if (key.includes(':POS-')) {
          const newKey = key.split(':POS-')[0];
          newScripts[newKey] = value;
          modified = true;
        } else {
          newScripts[key] = value;
        }
      }
      if (modified) {
        pkg.scripts = newScripts;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Fixed scripts in ${dir}/package.json`);
      }
    }
  }
}
