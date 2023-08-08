import * as vscode from 'vscode';
import * as path from 'path';
import * as findUp from 'find-up';
import * as fs from 'fs';
import { configFiles } from './vitest-config-files';
import { spawn, execFile } from 'child_process';
import { getInstalledPath } from 'get-installed-path';

function getCwd(testFile: string) {
    const configFilePath = findUp.sync(configFiles, { cwd: testFile });

    if (!configFilePath) {
        return;
    }
    return path.dirname(configFilePath);
}

function buildVitestArgs({ caseName, casePath, addRoot = true, sanitize = true }: { caseName: string, casePath: string, addRoot?: boolean, sanitize?: boolean }) {
    let sanitizedCasePath = casePath;
    if (sanitize) {
        sanitizedCasePath = JSON.stringify(casePath);
        caseName = JSON.stringify(caseName);
    }

    const args = ['vitest', 'run', '--testNamePattern', caseName, sanitizedCasePath];

    if (addRoot) {
        const rootDir = getCwd(casePath);
        if (rootDir) {
            args.push('--root', rootDir);
        }
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

async function isFileExist(filename: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        fs.access(filename, fs.constants.F_OK, (err: any) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

async function findVitestRunner(cwd: string) {
    let nodeModules = await findUp.default('node_modules', { cwd, type: 'directory' });
    let vitestPath = path.join(nodeModules || cwd, '.bin', 'vitest');
    let exists = nodeModules && await isFileExist(vitestPath);

    if (!exists) {
        const vitestGlobalLocation = await getInstalledPath('vitest', { local: false });

        nodeModules = await findUp.default('node_modules', { cwd: vitestGlobalLocation, type: 'directory' });

        vitestPath = path.join(nodeModules, '.bin', 'vitest');
        exists = nodeModules && await isFileExist(vitestPath);
    }

    if (!exists) {
        throw new Error('Could not find vitest');
    }

    return vitestPath;
}

export async function executeTest(filename: string, text: string, signal: AbortSignal) {
    // TODO - check about this sanitization
    const vitestArgs = buildVitestArgs({ caseName: text, casePath: filename, addRoot: false, sanitize: false });
    vitestArgs.shift(); // remove `vitest`
    // TODO - save file before running
    // await saveFile(filename);

    // const testRun = spawn('npx', vitestArgs, {
    const vitestRunner = await findVitestRunner(path.dirname(filename));
    // TODO - use the same node as the current terminal node
    const testRun = execFile(vitestRunner, vitestArgs, {
        cwd: getCwd(filename) || path.dirname(filename),
        signal,
        windowsHide: true,
        env: {
            ...process.env,
            FORCE_COLOR: '1',
        }
    });

    let res: () => void;
    let rej: (err: Error) => void;

    const finishPromise = new Promise<void>((resolve, reject) => {
        res = resolve;
        rej = reject;
    });

    testRun.on('error', (err) => {
        console.error(err);
        rej(err);
    });

    testRun.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code === 0) {
            res();
        } else {
            rej(new Error(`child process exited with code ${code}`));
        }
    });

    return {
        finishPromise,
        stdout: testRun.stdout,
        stderr: testRun.stderr,
    }

    // terminal.sendText(npxArgs.join(' '), true);
    // terminal.show();
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
