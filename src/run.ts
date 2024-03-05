import * as vscode from 'vscode';
import * as path from 'path';
import * as findUp from 'find-up';
import { configFiles } from './vitest-config-files';

function getCwd(testFile: string) {
    const configFilePath = findUp.sync(configFiles, { cwd: testFile });

    if (!configFilePath) {
        return;
    }
    return path.dirname(configFilePath);
}

function buildVitestArgs({ caseName, casePath, sanitize = true, command = 'run' }: { caseName: string, casePath: string, sanitize?: boolean, command?: 'run' | 'watch' }) {
    let sanitizedCasePath = casePath;
    if (sanitize) {
        sanitizedCasePath = JSON.stringify(casePath);
        caseName = JSON.stringify(caseName);
    }

    const args = ['vitest', command, '--testNamePattern', caseName, sanitizedCasePath];

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

export async function runInTerminal(text: string, filename: string) {
    let terminalAlreadyExists = true;
    if (!terminal || terminal.exitStatus) {
        terminalAlreadyExists = false;
        terminal?.dispose();
        terminal = vscode.window.createTerminal(`vscode-vitest-runner`);
    }

    const vitestArgs = buildVitestArgs({ caseName: text, casePath: filename });
    const npxArgs = ['npx', ...vitestArgs];

    if (terminalAlreadyExists) {
        // CTRL-C to stop the previous run
        terminal.sendText('\x03');
    }

    await saveFile(filename);

    terminal.sendText(npxArgs.join(' '), true);
    terminal.show();
}

export async function watchInTerminal(text: string, filename: string) {
    let terminalAlreadyExists = true;
    if (!terminal || terminal.exitStatus) {
        terminalAlreadyExists = false;
        terminal?.dispose();
        terminal = vscode.window.createTerminal(`vscode-vitest-runner`);
    }

    const vitestArgs = buildVitestArgs({ command: 'watch', caseName: text, casePath: filename });
    const npxArgs = ['npx', ...vitestArgs];

    if (terminalAlreadyExists) {
        // CTRL-C to stop the previous run
        terminal.sendText('\x03');
    }

    await saveFile(filename);

    terminal.sendText(npxArgs.join(' '), true);
    terminal.show();
}

function buildDebugConfig(
    casePath: string,
    text: string
): vscode.DebugConfiguration {
    return {
        name: 'Debug vitest case',
        request: 'launch',
        runtimeArgs: buildVitestArgs({ caseName: text, casePath: casePath, sanitize: false }),
        cwd: getCwd(casePath) || path.dirname(casePath),
        runtimeExecutable: 'npx',
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
