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
    const each = isEach(typescript, callExpression);
    if (!each && !(typescript.isIdentifier(callExpression.expression) && caseText.has((callExpression.expression as ts.Identifier).text))) {
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

    let testNameText = testName.text;

    const start = callExpression.getStart(file);
    if (each) {
        //
        testNameText = testNameText
            // From https://github.com/jestjs/jest/blob/0fd5b1c37555f485c56a6ad2d6b010a72204f9f6/packages/jest-each/src/table/array.ts#L15C32-L15C47
            // (Did not find inside vitest source code)
            .replace(/%[sdifjoOp#]/g, '.*')
            // When using template string
            .replace(/\$[a-zA-Z_0-9]+/g, '.*');
    }

    return {
        start,
        end: callExpression.getEnd(),
        text: testNameText
    };
}

function isEach(typescript: typeof ts, callExpression: ts.CallExpression) {
    return isEachWithArray(typescript, callExpression) || isEachWithTemplate(typescript, callExpression);
}

function isEachWithArray(typescript: typeof ts, callExpression: ts.CallExpression) {
    return (
        typescript.isCallExpression(callExpression.expression) &&
        typescript.isPropertyAccessExpression(callExpression.expression.expression) &&
        typescript.isIdentifier(callExpression.expression.expression.expression) &&
        typescript.isIdentifier(callExpression.expression.expression.name) &&
        callExpression.expression.expression.name.text === 'each' &&
        caseText.has(callExpression.expression.expression.expression.text)
    );
}

function isEachWithTemplate(typescript: typeof ts, callExpression: ts.CallExpression) {
    return (
        typescript.isTaggedTemplateExpression(callExpression.expression) &&
        typescript.isPropertyAccessExpression(callExpression.expression.tag) &&
        typescript.isIdentifier(callExpression.expression.tag.expression) &&
        typescript.isIdentifier(callExpression.expression.tag.name) &&
        callExpression.expression.tag.name.text === 'each' &&
        caseText.has(callExpression.expression.tag.expression.text)
    );
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
            ts.ScriptTarget.Latest
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
