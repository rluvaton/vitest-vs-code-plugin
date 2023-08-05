import type * as ts from 'typescript';
import * as vscode from 'vscode';
import { TextCase } from './types';
import { flatMap } from './utils';
import { RunVitestCommand, DebugVitestCommand } from './vscode';

const caseText = new Set(['it', 'describe', 'test']);

function tryGetVitestTestCase(
    typescript: typeof ts,
    callExpression: ts.CallExpression,
    file: ts.SourceFile
): TextCase | undefined {
    if (!isEach(typescript, callExpression) && !(typescript.isIdentifier(callExpression.expression) && caseText.has((callExpression.expression as ts.Identifier).text))) {
        return undefined;
    }

    if(isInsideFunctionDeceleration(typescript, callExpression)) {
        return undefined;
    }

    const args = callExpression.arguments;
    if (args.length < 2) {
        return undefined;
    }

    const [testName, body] = args;
    if (
        !typescript.isStringLiteralLike(testName) ||
        !typescript.isFunctionLike(body)
    ) {
        return undefined;
    }

    return {
        start: testName.getStart(file),
        end: testName.getEnd(),
        text: testName.text
    };
}

function isEach(typescript: typeof ts, callExpression: ts.CallExpression) {
    return (
        typescript.isCallExpression(callExpression.expression) &&
        typescript.isPropertyAccessExpression(callExpression.expression.expression) &&
        typescript.isIdentifier(callExpression.expression.expression.expression) &&
        typescript.isIdentifier(callExpression.expression.expression.name) &&
        callExpression.expression.expression.name.text === 'each' &&
        caseText.has(callExpression.expression.expression.expression.text)
    );
}

function isInsideFunctionDeceleration(typescript: typeof ts, callExpression: ts.CallExpression) {
    let parent = callExpression.parent;
    while(parent) {
        if(typescript.isFunctionLike(parent)) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
}

export class CodeLensProvider implements vscode.CodeLensProvider {
    constructor(private typescript: typeof ts) {
    }

    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        const ts = this.typescript;

        const text = document.getText();
        const sourceFile = ts.createSourceFile(
            'dummy',
            text,
            ts.ScriptTarget.Latest,
            /* setParentNodes */ true,
        );
        const testCases: TextCase[] = [];

        visitor(sourceFile);

        return flatMap(testCases, x => {
            const start = document.positionAt(x.start);
            const end = document.positionAt(x.end);

            return [
                new vscode.CodeLens(
                    new vscode.Range(start, end),
                    new RunVitestCommand(x.text, document.fileName)
                ),
                new vscode.CodeLens(
                    new vscode.Range(start, end),
                    new DebugVitestCommand(x.text, document.fileName)
                )
            ];
        });

        function visitor(node: ts.Node) {
            if (token.isCancellationRequested) {
                return;
            }

            if (ts.isCallExpression(node)) {
                const testCase = tryGetVitestTestCase(ts, node, sourceFile);
                if (testCase) {
                    testCases.push(testCase);
                }
            }
            ts.forEachChild(node, visitor);
        }
    }
}
