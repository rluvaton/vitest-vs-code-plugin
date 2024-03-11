import type * as ts from 'typescript';
import * as vscode from 'vscode';
import {convertCancellationTokenToAbortSignal} from './utils';
import {DebugVitestCommand, RunVitestCommand, WatchVitestCommand} from './vscode';
import {TestTreeBuilder} from "./test-tree/build";
import {TestTreeNode} from './test-tree/types';

const config = vscode.workspace.getConfiguration('vscode-vitest');

export class CodeLensProvider implements vscode.CodeLensProvider {
    constructor(private typescript: typeof ts) {
    }

    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        const ts = this.typescript;

        const text = document.getText();

        const nodes = TestTreeBuilder.build(ts, text, convertCancellationTokenToAbortSignal(token));
        const allNodes = this.flatNodes(nodes);

        return allNodes.flatMap(testNode => {
            const start = document.positionAt(testNode.position.start);
            const end = document.positionAt(testNode.position.end);

            const executableOptions: string[] = config.get("executableOptions") ?? []

            const runCommand = executableOptions.includes("run") ? [
                new vscode.CodeLens(
                    new vscode.Range(start, end),
                    new RunVitestCommand(testNode.name, document.fileName)
                )
            ] : []

            const debugCommand = executableOptions.includes("debug") ? [
                new vscode.CodeLens(
                    new vscode.Range(start, end),
                    new DebugVitestCommand(testNode.name, document.fileName)
                )
            ] : []

            const watchCommand = executableOptions.includes("watch") ? [ 
                new vscode.CodeLens(
                    new vscode.Range(start, end),
                    new WatchVitestCommand(testNode.name, document.fileName)
                )
            ] : []

            return [
                ...runCommand,
                ...debugCommand,
                ...watchCommand,
            ];
        });
    }

    private flatNodes(testNodes: TestTreeNode[]): TestTreeNode[] {
        let nodes = [...testNodes];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.type === 'suite') {
                nodes = nodes.concat(node.children);
            }
        }

        return nodes;
    }
}
