import * as vscode from 'vscode';
import * as path from 'path';
import * as findUp from 'find-up';
import { configFiles } from './vitest-config-files';

const config = vscode.workspace.getConfiguration('vscode-vitest');

function getCwd(testFile: string) {
    const configFilePath = findUp.sync(configFiles, { cwd: testFile });

    if (!configFilePath) {
        return;
    }
    return path.dirname(configFilePath);
}

function buildVitestArgs({ caseName, casePath, sanitize = true, testMode = 'run' }: { caseName: string, casePath: string, sanitize?: boolean, testMode?: 'run' | 'watch' }) {
    
    let sanitizedCasePath = casePath;
    if (sanitize) {
        sanitizedCasePath = JSON.stringify(casePath);
        caseName = JSON.stringify(caseName);
    }

    const testCommand = config.get("testCommand")

    const args = [testCommand, testMode, '--testNamePattern', caseName, sanitizedCasePath];

    const rootDir = getCwd(casePath);
    if (rootDir) {
        args.push('--root', rootDir);
    }

    return args;
}

let terminal: vscode.Terminal | undefined;

async function saveFile(filePath: string) {
    await vscode.workspace.textDocuments.find((doc) => doc.fileName === filePath)?.save();
}

export async function executeInTerminal(text: string, filename: string, testMode: "run" | "watch" = "run") {
    let terminalAlreadyExists = true;
    if (!terminal || terminal.exitStatus) {
        terminalAlreadyExists = false;
        terminal?.dispose();
        terminal = vscode.window.createTerminal(`vscode-vitest-runner`);
    }

    const pretest = (config.get("pretest") as string[]);
    const finalPretest = pretest.length > 0 ? [`${pretest.join("; ")};`] : []
    const packageManager = config.get("packageManager")
    const extraArguments = config.get("extraArguments")

    const vitestArgs = buildVitestArgs({ caseName: text, casePath: filename, testMode });
    const commandToRun = [...finalPretest, packageManager, ...vitestArgs, extraArguments];

    if (terminalAlreadyExists) {
        // CTRL-C to stop the previous run
        terminal.sendText('\x03');
    }

    await saveFile(filename);

    terminal.sendText(commandToRun.join(' '), true);
    terminal.show();
}

function buildDebugConfig(
    casePath: string,
    text: string
): vscode.DebugConfiguration {
    const packageManager = config.get("packageManager")

    return {
        name: 'Debug vitest case',
        request: 'launch',
        runtimeArgs: buildVitestArgs({ caseName: text, casePath: casePath, sanitize: false }),
        cwd: getCwd(casePath) || path.dirname(casePath),
        runtimeExecutable: packageManager,
        skipFiles: ['<node_internals>/**'],
        type: 'pwa-node',
        console: 'integratedTerminal',
        internalConsoleOptions: 'neverOpen'
    };
}

export async function debugInTerminal(text: string, filename: string) {
    const config = buildDebugConfig(filename, text);

    await saveFile(filename);
    vscode.debug.startDebugging(undefined, config);
}
