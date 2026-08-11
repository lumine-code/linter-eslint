const { Emitter, CompositeDisposable, Disposable } = require("lumine");
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
const IDE_ESLINT_ADAPTER_ID = "ide-eslint";

let disposables;
let busySignal;
let ideClient;

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
    lumine.commands.add("lumine-workspace", {
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
    lumine.project.onDidChangePaths(() => {
      indie.resetEngine();
    }),
  );

  config.onActivate(lumine, emitter, disposables);
}

function deactivate() {
  exec.dispose();
  indie.dispose();
  ideClient = null;
  disposables.dispose();
}

function provideLinter() {
  return {
    grammarScopes: GRAMMAR_SCOPES,
    scope: "file",
    name: "ESLint",
    lintsOnChange: true,
    lint: lintEditor,
  };
}

function isServedByIdeEslint(editor) {
  const adapters = ideClient?.adaptersForEditor?.(editor) || [];
  const registered = adapters.some((adapter) => adapter.id === IDE_ESLINT_ADAPTER_ID);
  if (!registered) return false;
  return (
    lumine.config.get("ide-eslint.features.diagnostics", {
      scope: editor?.getRootScopeDescriptor?.(),
    }) !== false
  );
}

function lintEditor(editor) {
  if (isServedByIdeEslint(editor)) return Promise.resolve([]);
  return lint.lint(editor);
}

function consumeLinterRegistry(registerIndie) {
  const delegate = registerIndie({
    name: "ESLint/Project",
    deleteOnOpen: lumine.config.get("linter-eslint.deleteOnOpen"),
  });
  disposables.add(delegate);
  indie.register(delegate);
}

function consumeBusySignal(signal) {
  busySignal = signal;
  exec.setBusySignal(signal);
  indie.setBusySignal(signal);
}

function consumeIdeClient(service) {
  ideClient = service;
  const subscriptions = new CompositeDisposable();
  const relint = () => {
    lumine.commands.dispatch(lumine.views.getView(lumine.workspace), "linter:lint");
  };
  const adaptersSubscription = service.onDidChangeAdapters?.(relint);
  if (adaptersSubscription) subscriptions.add(adaptersSubscription);
  const featuresSubscription = service.onDidChangeFeatures?.(({ adapter }) => {
    if (adapter.id === IDE_ESLINT_ADAPTER_ID) relint();
  });
  if (featuresSubscription) subscriptions.add(featuresSubscription);
  return new Disposable(() => {
    subscriptions.dispose();
    ideClient = null;
  });
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
  consumeIdeClient,
  consumeTreeViewSelection,
};
