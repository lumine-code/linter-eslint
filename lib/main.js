const { Emitter, CompositeDisposable, Disposable } = require("atom");
const lint = require("./lint");
const exec = require("./exec");
const config = require("./config");
const indie = require("./indie");

const GRAMMAR_SCOPES = [
  "source.js",
  "source.jsx",
  "source.es6",
  "source.js.jsx",
  "source.babel",
  "source.js-semantic",
  "source.ts",
  "source.tsx",
];

let disposables;
let busySignal;

function withBusySignal(title, callback) {
  const provider =
    busySignal && typeof busySignal.create === "function" ? busySignal.create() : null;
  provider?.add(title);

  try {
    return callback();
  } finally {
    provider?.dispose();
  }
}

function activate() {
  const emitter = new Emitter();

  disposables = new CompositeDisposable();
  disposables.add(emitter);

  disposables.add(
    atom.commands.add("atom-workspace", {
      "linter-eslint:reload": () => {
        withBusySignal("Reloading ESLint", () => {
          exec.resetEngine();
          indie.resetEngine();
        });
      },
      "linter-eslint:lint-projects": () => {
        indie.runScan();
      },
      // The tree view is inside the workspace, so its context menu reaches this
      // handler on its own. A second registration on .tree-view would run the
      // scan twice for every dispatch from there.
      "linter-eslint:lint-selected": () => {
        indie.runSelectedScan();
      },
    }),
  );

  // Reset indie engine when project paths change
  disposables.add(
    atom.project.onDidChangePaths(() => {
      indie.resetEngine();
    }),
  );

  config.onActivate(atom, emitter, disposables);
}

function deactivate() {
  exec.dispose();
  indie.dispose();
  disposables.dispose();
}

function provideLinter() {
  return {
    grammarScopes: GRAMMAR_SCOPES,
    scope: "file",
    name: "ESLint",
    lintsOnChange: true,
    lint: lint.lint,
  };
}

function consumeLinterRegistry(registerIndie) {
  const delegate = registerIndie({
    name: "ESLint/Project",
    deleteOnOpen: atom.config.get("linter-eslint.deleteOnOpen"),
  });
  disposables.add(delegate);
  indie.register(delegate);
}

function consumeBusySignal(signal) {
  busySignal = signal;
  exec.setBusySignal(signal);
  indie.setBusySignal(signal);
}

function consumeTreeViewSelection(treeView) {
  indie.setTreeView(treeView);
  return new Disposable(() => {
    indie.setTreeView(null);
  });
}

module.exports = {
  activate,
  deactivate,
  provideLinter,
  consumeLinterRegistry,
  consumeBusySignal,
  consumeTreeViewSelection,
};
