# vscode-vitest

Vitest runner for vscode that actually works

### Run/Watch/debug any test (`it`, `test`, or `describe`) in `.js`, `.ts`, `.jsx`, or `.tsx` files:

  ![preview](screenshot.png)


## Extension Settings

| Command                           | Description                               | Examples                                                                                                      | Default                                       |
| --------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------| --------------------------------------------- |
| `vscode-vitest.preTest`           | Any command(s) to run before test starts  | `["npm run script1", "npm run script2"` (will run in the given order. If command(s) fail, tests will not run) | []                                            |
| `vscode-vitest.postTest`          | Any command(s) to run after test finishes | `["npm run clean1", "npm run clean2"`   (will run in the given order)                                         | []                                            |
| `vscode-vitest.packageManager`    | Desired package manager                   | `npm`, `yarn`, `pnpm`, `pnpn dlx`, etc                                                                        | `npx`                                         |
| `vscode-vitest.testCommand`       | Define an alternative vitest command      | `test` (e.g. for CRA, package.json `test` script, or similar abstractions)                                    | `vitest`                                      |
| `vscode-vitest.extraArguments`    | Any additional vitest arguments           |  `--silent=true --maxWorkers=2`                                                                               | `""`                                          |
| `vscode-vitest.executableOptions` | Executable option to show                 |  `{"debug": false, "run": false}` (will only display `watch`)                                                 | `{"debug": true,"run": true, "run": true}`    |


### Example Settings:
```
  "vscode-vitest.preTest": ["npm run script1"],
  "vscode-vitest.postTest": ["npm run cleanAfterTest"],
  "vscode-vitest.packageManager": "pnpm",
  "vscode-vitest.testCommand": "test",
  "vscode-vitest.extraArguments": "--silent --maxWorkers=2",
  "vscode-vitest.executableOptions": {
    "debug": false,
    "watch": false
  },
```