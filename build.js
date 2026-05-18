const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

const buildOptions = [
  {
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: './dist/extension.js',
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    external: ['vscode'],
    minify: !isDev,
    sourcemap: isDev,
    treeShaking: true,
    drop: isDev ? [] : ['console', 'debugger'],
    metafile: true
  },
  {
    entryPoints: ['./src/webview/index.tsx'],
    bundle: true,
    outfile: './dist/webview.js',
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
    minify: !isDev,
    sourcemap: isDev,
    treeShaking: true,
    drop: isDev ? [] : ['console', 'debugger'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  }
];

async function build() {
  try {
    for (const options of buildOptions) {
      if (isWatch) {
        const ctx = await esbuild.context(options);
        await ctx.watch();
      } else {
        const result = await esbuild.build(options);
        if (result.metafile && options.outfile.includes('extension')) {
          fs.writeFileSync('./dist/extension.meta.json', JSON.stringify(result.metafile, null, 2));
        }
      }
    }

    const cssPath = './src/webview/styles/global.css';
    if (fs.existsSync(cssPath)) {
      fs.copyFileSync(cssPath, './dist/webview.css');
    }

    const cssDistPath = './dist/webview.css';
    const jsDistPath = './dist/webview.js';
    if (fs.existsSync(cssDistPath) && fs.existsSync(jsDistPath)) {
      const css = fs.readFileSync(cssDistPath, 'utf8');
      const js = fs.readFileSync(jsDistPath, 'utf8');
      const inlined = js + `\n(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      fs.writeFileSync(jsDistPath, inlined);
      fs.unlinkSync(cssDistPath);
    }

    console.log('Build complete');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
