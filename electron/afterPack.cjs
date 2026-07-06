const path = require('path');
const { execFileSync } = require('child_process');

// electron-builder copies server/node_modules verbatim (still built for
// system Node's ABI, since that's what `npm install --prefix server` used).
// @electron/rebuild's own rebuild() insists on compiling better-sqlite3 from
// source via node-gyp here (needs Visual Studio, not available), even though
// better-sqlite3 publishes a prebuilt binary for Electron's ABI on its GitHub
// releases. Its own install script (prebuild-install || node-gyp rebuild)
// knows how to fetch that prebuild directly - so just re-run npm's install
// for this one package, pointed at Electron's runtime/ABI/arch via the
// standard prebuild-install env vars, inside the packaged output only. This
// never touches the source-tree server/node_modules that the plain
// `npm start` / `npm run dev` workflow (and any already-running instance of
// it) still depends on.
module.exports = async function afterPack(context) {
  const { Arch } = require('builder-util');
  const electronVersion = require('electron/package.json').version;
  const serverPath = path.join(context.appOutDir, 'resources', 'app', 'server');
  const moduleDir = path.join(serverPath, 'node_modules', 'better-sqlite3');
  const prebuildInstallBin = path.join(serverPath, 'node_modules', 'prebuild-install', 'bin.js');

  // `npm rebuild` skips a package's own "install" script (prebuild-install ||
  // node-gyp rebuild) and goes straight to node-gyp - so call prebuild-install
  // directly instead, which fetches better-sqlite3's published Electron-ABI
  // binary from its GitHub releases instead of compiling anything.
  execFileSync(process.execPath, [
    prebuildInstallBin,
    `--runtime=electron`,
    `--target=${electronVersion}`,
    `--arch=${Arch[context.arch]}`,
    '--platform=win32',
  ], {
    cwd: moduleDir,
    stdio: 'inherit',
  });
};
