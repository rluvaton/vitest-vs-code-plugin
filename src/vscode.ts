import * as vscode from 'vscode';
import { debugInTerminal, executeInTerminal } from './run';

export class RunVitestCommand implements vscode.Command {
    static ID = 'vitest.runTest';
    title = 'Run(Vitest)';
    command = RunVitestCommand.ID;
    arguments?: [string, string];

    constructor(text: string, filename: string) {
        this.arguments = [text, filename];
    }
}

export class WatchVitestCommand implements vscode.Command {
    static ID = 'vitest.watchTest';
    title = 'Watch(Vitest)';
    command = WatchVitestCommand.ID;
    arguments?: [string, string];

    constructor(text: string, filename: string) {
        this.arguments = [text, filename];
    }
}

export class DebugVitestCommand implements vscode.Command {
    static ID = 'vitest.debugTest';
    title = 'Debug(Vitest)';
    command = DebugVitestCommand.ID;
    arguments?: [string, string];

    constructor(text: string, filename: string) {
        this.arguments = [text, filename];
    }
}

vscode.commands.registerCommand(
    RunVitestCommand.ID,
    (text: string, filename: string) => {
        executeInTerminal(text, filename, "run")
    }
);

vscode.commands.registerCommand(
    WatchVitestCommand.ID,
    (text: string, filename: string) => {
        executeInTerminal(text, filename, "watch");
    }
);

vscode.commands.registerCommand(
    DebugVitestCommand.ID,
    (text: string, filename: string) => {
        debugInTerminal(text, filename);
    }
);
