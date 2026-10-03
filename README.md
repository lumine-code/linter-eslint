# linter-eslint

ESLint linter provider with bundled v8 and v10 support.

> [!WARNING]
> **This package is deprecated.** ESLint diagnostics, fixes, and project scans are now provided by [ide-eslint](https://github.com/lumine-code/ide-eslint) through [ide-client](https://github.com/lumine-code/ide-client) and [linter](https://github.com/lumine-code/linter). This repository is archived and no longer maintained.

Uses project-installed ESLint when available, falls back to bundled version.

## Features

- **Project ESLint first**: uses ESLint from your project's `node_modules` if installed.
- **Bundled fallback**: includes ESLint v8 and v10, no global install needed.
- **Multi-project support**: each project in workspace uses its own ESLint independently.
- **Silent mode**: if no ESLint config is found, the package silently does nothing.
- **Ignore support**: respects `.eslintignore` files.
- **Precise highlighting**: token-level range highlighting for lint messages.
- **Auto-fix**: supports fix suggestions from ESLint rules.
- **Project scans**: lints whole projects or tree-view selections in a background task and reports results through the indie linter API.

## Migration

Disable or uninstall `linter-eslint` and install `ide-eslint` with `ide-client`. Keep `linter` installed to display diagnostics and `linter-panel` to browse project scan results.

```sh
lumine --install lumine-code/ide-client
lumine --install lumine-code/ide-eslint
lumine --install lumine-code/linter
```

Use `ide-eslint:lint-projects` and `ide-eslint:lint-selected` for project and tree-view scans. Install `intentions` for rule fixes and `code-format` to apply ESLint fixes during formatting or on save. Use `ide-client:restart` to restart the active document's language servers.

The adapter keeps project ESLint and plugins authoritative, with bundled ESLint v8 for legacy configuration and v10 for flat configuration when no user-installed engine is available. Configuration Mode defaults to automatic detection; choose Flat or Legacy when the project requires it. Settings under `linter-eslint` are no longer read. Projects using TypeScript, React, or other plugins still need those plugins installed locally.

## Commands

Commands available in `lumine-workspace`:

- `linter-eslint:reload`: reset the ESLint engine cache and re-detect,
- `linter-eslint:lint-projects`: lint all files in the project,
- `linter-eslint:lint-selected`: lint selected tree-view files or folders.

## Usage

If your project uses TypeScript, React, or other plugins, install ESLint locally:

```bash
npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

The bundled ESLint is minimal and intended for basic linting only (no plugins).

How it works:

1. **Project ESLint**: first checks for ESLint in your project's `node_modules/eslint`.
2. **Bundled fallback**: if no project ESLint found, tries bundled v8, then v10.
3. **Silent skip**: if no ESLint config found (tried both versions), silently skips the project.

**Caching:** ESLint resolution and config detection happen on first lint and are cached per project. Use `linter-eslint:reload` to clear the cache and re-detect (e.g., after installing ESLint or adding a config file).

Troubleshooting: enable **Debug Mode** in settings and open the developer console (View → Developer → Toggle Developer Tools).

**Project ESLint found:**

```
[linter-eslint] Project: C:\projects\my-app
[linter-eslint] Project ESLint found: v10.0.0
[linter-eslint] Path: C:\projects\my-app\node_modules\eslint
```

**Using bundled ESLint:**

```
[linter-eslint] Project: C:\projects\my-app
[linter-eslint] Project ESLint not found: No eslint in project node_modules
[linter-eslint] Using bundled ESLint: bundled-v8, v8.57.1
```

**No config found:**

```
[linter-eslint] No ESLint config found (tried both v8 and v10), skipping project
```

Example config for ESLint v8 (`.eslintrc.js`):

```js
module.exports = {
  env: { browser: true, es2021: true, node: true },
  extends: "eslint:recommended",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {},
};
```

Example config for ESLint v10 (`eslint.config.js`):

```js
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { console: "readonly" },
    },
    rules: {},
  },
];
```

## Services

- `linter.provider`: provided to the linter package; exposes the ESLint file linter with its name, grammar scopes and `lint` function.
- `linter.registry`: consumed to report project-wide scan results through an indie linter delegate.
- `ide-client`: consumed to avoid duplicating diagnostics supplied by the `ide-eslint` adapter.
- `busy-signal`: consumed to show busy messages while ESLint engines load and project scans run.
- `tree-view.selection`: consumed to resolve the selected files or folders for `linter-eslint:lint-selected`.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
