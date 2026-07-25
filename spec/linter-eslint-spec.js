const path = require("path");

const PROJECT_DIR = path.join(__dirname, "fixtures", "project");

describe("linter-eslint", () => {
  let mainModule, workspaceElement;

  beforeEach(async () => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);

    atom.project.setPaths([PROJECT_DIR]);

    // The package defers activation until one of its commands is dispatched.
    const activation = atom.packages.activatePackage("linter-eslint");
    atom.commands.dispatch(workspaceElement, "linter-eslint:lint-projects");
    mainModule = (await activation).mainModule;
  });

  afterEach(() => {
    // Shut down the per-project worker processes between specs.
    require("../lib/exec").resetEngine();
  });

  describe("linter provider", () => {
    it("exposes the shape expected by the linter service", () => {
      const provider = mainModule.provideLinter();
      expect(provider.name).toBe("ESLint");
      expect(provider.scope).toBe("file");
      expect(provider.lintsOnChange).toBe(true);
      expect(provider.grammarScopes).toContain("source.js");
      expect(provider.grammarScopes).toContain("source.ts");
      expect(typeof provider.lint).toBe("function");
    });
  });

  describe("lint()", () => {
    it("lints a fixture with the bundled ESLint via the worker", async () => {
      const editor = await atom.workspace.open(path.join(PROJECT_DIR, "sample.js"));
      const provider = mainModule.provideLinter();

      const messages = await provider.lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe("error");
      expect(messages[0].excerpt).toBe("semi: Missing semicolon.");
      expect(messages[0].location.file).toBe(editor.getPath());
      expect(messages[0].location.position[0][0]).toBe(0);
      // The semi rule ships an auto-fix, surfaced as a solution.
      expect(Array.isArray(messages[0].solutions)).toBe(true);
      expect(messages[0].solutions[0].replaceWith).toContain(";");
    }, 60000);

    it("returns an empty list for files outside any project", async () => {
      const editor = await atom.workspace.open(path.join(atom.getConfigDirPath(), "loose.js"));
      const messages = await mainModule.provideLinter().lint(editor);
      expect(messages).toEqual([]);
    });
  });

  describe("message conversion", () => {
    const indie = require("../lib/indie");

    it("maps ESLint 1-based coordinates to 0-based linter positions", () => {
      const message = indie.convertMessage("/tmp/a.js", {
        line: 3,
        column: 5,
        endLine: 3,
        endColumn: 9,
        message: "Unexpected token",
        ruleId: "no-thing",
        severity: 2,
      });

      expect(message.severity).toBe("error");
      expect(message.excerpt).toBe("no-thing: Unexpected token");
      expect(message.location.file).toBe("/tmp/a.js");
      expect(message.location.position).toEqual([
        [2, 4],
        [2, 8],
      ]);
    });

    it("labels warnings and fatal messages", () => {
      const warning = indie.convertMessage("/tmp/a.js", {
        line: 1,
        column: 1,
        message: "Prefer const",
        ruleId: "prefer-const",
        severity: 1,
      });
      expect(warning.severity).toBe("warning");

      const fatal = indie.convertMessage("/tmp/a.js", {
        line: 1,
        column: 1,
        message: "Parsing error",
        ruleId: null,
        severity: 2,
      });
      expect(fatal.excerpt).toBe("fatal: Parsing error");
    });
  });

  describe("bundled engines", () => {
    const { getBundledEslint } = require("../lib/resolve");

    it("resolves both bundled ESLint major versions", async () => {
      const v8 = await getBundledEslint("v8");
      expect(v8).not.toBeNull();
      expect(v8.source).toBe("bundled-v8");
      expect(v8.version).toMatch(/^8\./);
      expect(typeof v8.ESLint).toBe("function");

      const v10 = await getBundledEslint("v10");
      expect(v10).not.toBeNull();
      expect(v10.source).toBe("bundled-v10");
      expect(v10.version).toMatch(/^10\./);
      expect(typeof v10.ESLint).toBe("function");
    });
  });
});
