import path from 'path';
import fs from './utils/fs';
import makeDir from 'make-dir';
import { cacheDir } from './paths';
import del from 'del';

const isCacheValid = settings => {
  return makeDir(cacheDir)
    .then(() => fs.statAsync(path.resolve(cacheDir, settings.hash)))
    .then(() => true)
    .catch(() => false);
};

const cleanup = settings => () => {
  return fs
    .readdirAsync(cacheDir)
    .filter(dirname => dirname.startsWith(`${settings.env}_${settings.id}`))
    .each(dirname => del(path.join(cacheDir, dirname)));
};

export const runCompile = (settings, getDllCompiler) => () => {
  // skip compiling if there is nothing to build
  // if (isEmpty(settings.entry)) return;
  return new Promise((resolve, reject) => {
    getDllCompiler().run((err, stats) => {
      if (err) {
        return reject(err);
      }
      resolve(stats);
    });
  });
};

// const createStatsCache = (hash) => {
//   let cache;

//   const statsPath = path.join(cacheDir, hash, 'stats.json');

//   return {
//     read () {
//       if (cache) {
//         return Promise.resolve(cache);
//       }

//       return fs.readFileAsync(statsPath)
//         .then((buffer) => {
//           cache = JSON.parse(buffer);
//           return cache;
//         });
//     },

//     write (stats) {
//       cache = null;
//       return fs.writeFileAsync(statsPath, JSON.stringify(stats.toJson()));
//     }
//   };
// };

const output = (source, stats) => ({
  source,
  stats: stats ? stats.toJson() : null
});

const createCompileIfNeeded = (log, settings) => {
  const compileIfNeeded = (getCompiler) => {
    return isCacheValid(settings)
      .then(log.tap(isValid => `is valid cache? ${isValid}`))
      .then(isValid => {
        if (isValid) { return output('cache', null); }

        return Promise.resolve()
          .then(log.tap('cleanup'))
          .then(cleanup(settings))
          .then(log.tap('compile'))
          .then(runCompile(settings, getCompiler))
          .then((stats) => output('build', stats));
      });
  };

  return compileIfNeeded;
};

export default createCompileIfNeeded;
