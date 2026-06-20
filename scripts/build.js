const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(path.join(__dirname, '..', 'src', 'header.txt'), 'utf-8');
const watch = process.argv.includes('--watch');

async function build() {
    try {
        const result = await esbuild.build({
            entryPoints: [path.join(__dirname, '..', 'src', 'main.js')],
            bundle: true,
            format: 'iife',
            target: 'es2015',
            outfile: path.join(__dirname, '..', 'enhance.js'),
            banner: { js: header },
            charset: 'utf8',
            minify: false,
            sourcemap: false
        });
        if (result.errors.length > 0) {
            console.error(result.errors);
            process.exit(1);
        }
        console.log('Build completed: enhance.js');
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

if (watch) {
    console.log('Watching src/ for changes...');
    const srcDir = path.join(__dirname, '..', 'src');
    fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`Changed: ${filename}`);
            build();
        }
    });
    build();
} else {
    build();
}
