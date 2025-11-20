import { promises as fsPromises, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync, unlinkSync, copyFileSync } from "fs";
import path from "path";
async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
}
function ensureDirSync(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
function mkdirpSync(dirPath) {
  ensureDirSync(dirPath);
}
async function pathExists(filePath) {
  return existsSync(filePath);
}
async function readJson(filePath) {
  const content = await fsPromises.readFile(filePath, "utf-8");
  return JSON.parse(content);
}
function readJsonSync(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}
async function writeJson(filePath, data, options) {
  const spaces = options?.spaces ?? 2;
  const content = JSON.stringify(data, null, spaces);
  await fsPromises.writeFile(filePath, content, "utf-8");
}
function writeJsonSync(filePath, data, options) {
  const spaces = options?.spaces ?? 2;
  const content = JSON.stringify(data, null, spaces);
  writeFileSync(filePath, content, "utf-8");
}
async function remove(targetPath) {
  if (existsSync(targetPath)) {
    await fsPromises.rm(targetPath, { recursive: true, force: true });
  }
}
function removeSync(targetPath) {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }
}
async function copy(src, dest, options) {
  const srcStat = await fsPromises.stat(src);
  if (srcStat.isFile()) {
    await fsPromises.mkdir(path.dirname(dest), { recursive: true });
    await fsPromises.copyFile(src, dest);
  } else if (srcStat.isDirectory()) {
    await fsPromises.mkdir(dest, { recursive: true });
    const entries = await fsPromises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (options?.filter && !options.filter(srcPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        await copy(srcPath, destPath, options);
      } else {
        await fsPromises.copyFile(srcPath, destPath);
      }
    }
  }
}
function copySync(src, dest, options) {
  const srcStat = statSync(src);
  if (srcStat.isFile()) {
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  } else if (srcStat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (options?.filter && !options.filter(srcPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        copySync(srcPath, destPath, options);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}
async function ensureFile(filePath) {
  if (!existsSync(filePath)) {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, "", "utf-8");
  }
}
function ensureFileSync(filePath) {
  if (!existsSync(filePath)) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, "", "utf-8");
  }
}
const {
  readFile,
  writeFile,
  appendFile,
  stat,
  readdir,
  access,
  unlink,
  rmdir,
  rename,
  chmod
} = fsPromises;
var fs_native_default = {
  // Async methods
  ensureDir,
  pathExists,
  readJson,
  writeJson,
  remove,
  copy,
  ensureFile,
  readFile,
  writeFile,
  appendFile,
  stat,
  readdir,
  access,
  unlink,
  // Sync methods
  ensureDirSync,
  mkdirpSync,
  existsSync,
  readJsonSync,
  writeJsonSync,
  removeSync,
  copySync,
  ensureFileSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  rmSync
};
export {
  access,
  appendFile,
  chmod,
  copy,
  copySync,
  fs_native_default as default,
  ensureDir,
  ensureDirSync,
  ensureFile,
  ensureFileSync,
  existsSync,
  mkdirSync,
  mkdirpSync,
  pathExists,
  readFile,
  readFileSync,
  readJson,
  readJsonSync,
  readdir,
  readdirSync,
  remove,
  removeSync,
  rename,
  rmSync,
  rmdir,
  stat,
  statSync,
  unlink,
  unlinkSync,
  writeFile,
  writeFileSync,
  writeJson,
  writeJsonSync
};
