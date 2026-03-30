const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const canonicalSourcePath = path.join(workspaceRoot, "runtime", "rule-master", "rule-master-source.js");
const compatibilitySourcePath = path.join(workspaceRoot, "runtime", "prototype", "prototype-rule-source.js");

function loadSourceObjectFromPath(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return sandbox.__KASAN_PROTOTYPE_RULE_SOURCE__ ?? sandbox.window?.__KASAN_PROTOTYPE_RULE_SOURCE__ ?? null;
}

function readRuleMasterSourceText() {
  if (fs.existsSync(canonicalSourcePath)) {
    return fs.readFileSync(canonicalSourcePath, "utf8");
  }

  if (fs.existsSync(compatibilitySourcePath)) {
    return fs.readFileSync(compatibilitySourcePath, "utf8");
  }

  throw new Error("rule master source が見つかりません。");
}

function loadRuleMasterSourceObject() {
  if (fs.existsSync(canonicalSourcePath)) {
    return loadSourceObjectFromPath(canonicalSourcePath);
  }

  if (fs.existsSync(compatibilitySourcePath)) {
    return loadSourceObjectFromPath(compatibilitySourcePath);
  }

  throw new Error("rule master source object を取得できませんでした。");
}

function writePrototypeCompatibilitySource() {
  const sourceText = readRuleMasterSourceText();
  fs.mkdirSync(path.dirname(compatibilitySourcePath), { recursive: true });
  fs.writeFileSync(compatibilitySourcePath, sourceText, "utf8");
  return compatibilitySourcePath;
}

function getRuleMasterSourcePaths() {
  return {
    workspaceRoot,
    canonicalSourcePath,
    compatibilitySourcePath,
  };
}

module.exports = {
  workspaceRoot,
  canonicalSourcePath,
  compatibilitySourcePath,
  readRuleMasterSourceText,
  loadRuleMasterSourceObject,
  writePrototypeCompatibilitySource,
  getRuleMasterSourcePaths,
};
