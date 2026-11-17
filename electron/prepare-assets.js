const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'desktop-vendor');
const { devDependencies } = require('../package.json');

function copyAsset(match, name, version, filename, integrity) {
    if (devDependencies[name] !== version) {
        throw new Error(`Browser and desktop versions differ for ${name}`);
    }
    const source = path.join(root, 'node_modules', name, filename);
    const hash = createHash('sha384').update(fs.readFileSync(source)).digest('base64');
    if (integrity !== `sha384-${hash}`) {
        throw new Error(`Integrity mismatch for ${name}/${filename}`);
    }
    const destination = path.join(vendor, name, filename);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    const packageRoot = path.join(root, 'node_modules', name);
    for (const license of fs.readdirSync(packageRoot).filter(file => /^licen[cs]e/i.test(file))) {
        fs.copyFileSync(path.join(packageRoot, license), path.join(vendor, name, license));
    }
    return `desktop-vendor/${name}/${filename}"`;
}

const asset = /https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/([^"]+)" (?:data-)?integrity="([^"]+)"(?: crossorigin="anonymous")?/g;
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(asset, copyAsset)
    .replaceAll(' https://cdn.jsdelivr.net', '');

for (const [name, directory] of [['katex', 'dist/fonts'], ['@fortawesome/fontawesome-free', 'webfonts']]) {
    fs.cpSync(path.join(root, 'node_modules', name, directory), path.join(vendor, name, directory), {
        recursive: true
    });
}

if (/https:\/\/cdn\.jsdelivr\.net/.test(page)) throw new Error('An asset was not bundled');
fs.writeFileSync(path.join(root, 'index.electron.html'), page);
