const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Let Metro see the entire monorepo (merge with Expo defaults, not replace)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Prefer app-local node_modules, then fall back to workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force React and React Native to always resolve from the app-local
// node_modules so there is only ever one copy in the bundle.
// Without this, the root node_modules copy (a different minor version)
// gets bundled alongside the app copy → "invalid hook call" crash.
const SINGLE_INSTANCE_MODULES = ['react', 'react-dom', 'react-native'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLE_INSTANCE_MODULES.some((m) => moduleName === m || moduleName.startsWith(m + '/'))) {
    return {
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
