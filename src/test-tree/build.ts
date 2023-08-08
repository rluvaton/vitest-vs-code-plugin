import type * as TS from "typescript";
import type { SuiteNode, TestNode, TestTreeNode } from "./types";

const caseText = new Set(['it', 'describe', 'test']);

interface listeners {
    onTest: (test: TestNode) => any;
    onSuite: (suite: SuiteNode) => any;
}

export class TestTreeBuilder {
    private sourceFile: TS.SourceFile;
    private ts: typeof TS;
    private abortSignal: AbortSignal;

    private onTest: listeners['onTest'];
    private onSuite: listeners['onSuite'];

    private rootTestTreeNodes: TestTreeNode[] = [];
    private testTreeNodes = new WeakMap<TS.Node, TestTreeNode>();

    private constructor(ts: typeof TS, codeContent: string, abortSignal: AbortSignal, listeners: Partial<listeners>) {
        this.ts = ts;
        this.abortSignal = abortSignal;

        this.onSuite = listeners.onSuite || (() => { });
        this.onTest = listeners.onTest || (() => { });

        this.sourceFile = ts.createSourceFile(
            'dummy',
            codeContent,
            ts.ScriptTarget.Latest,
            /* setParentNodes */ true,
        );
    }

    static build(ts: typeof TS, codeContent: string, abortSignal: AbortSignal, listeners: Partial<listeners> = {}): TestTreeNode[] {
        const builder = new TestTreeBuilder(ts, codeContent, abortSignal, listeners);
        return builder.build();
    }

    build(): TestTreeNode[] {
        this.visitor(this.sourceFile);

        return this.rootTestTreeNodes;
    }

    visitor(node: TS.Node) {
        if (this.abortSignal.aborted) {
            return;
        }

        if (this.ts.isCallExpression(node)) {
            this.findPossibleTests(node);
        }
        this.ts.forEachChild(node, this.visitor.bind(this));
    }


    findPossibleTests(callExpression: TS.CallExpression) {
        const eachResult = this.isEach(callExpression);
        if (!eachResult.isEach && !(this.ts.isIdentifier(callExpression.expression) && caseText.has(callExpression.expression.text))) {
            return;
        }

        const testType = eachResult.isEach ? eachResult.type : this.getTypeFromFunctionName((callExpression.expression as TS.Identifier).text);

        const args = callExpression.arguments;
        if (args.length < 2) {
            return;
        }

        const [testName, body] = args;
        if (
            !this.ts.isStringLiteralLike(testName) ||
            !this.ts.isFunctionLike(body)
        ) {
            return;
        }

        let testNameText = testName.text;

        if (eachResult.isEach) {
            //
            testNameText = testNameText
                // From https://github.com/jestjs/jest/blob/0fd5b1c37555f485c56a6ad2d6b010a72204f9f6/packages/jest-each/src/table/array.ts#L15C32-L15C47
                // (Did not find inside vitest source code)
                .replace(/%[sdifjoOp#]/g, '.*')
                // When using template string
                .replace(/\$[a-zA-Z_0-9]+/g, '.*');
        }

        const newTestNode = getTreeNode({
            testNameText,
            start: callExpression.getStart(this.sourceFile),
            end: callExpression.getEnd(),
            testType
        });

        switch (newTestNode.type) {
            case 'suite':
                this.onSuite(newTestNode);
                break;
            case 'test':
                this.onTest(newTestNode);
                break;
        }

        if(this.abortSignal.aborted) {
            return;
        }

        let node: TS.Node = callExpression.parent;
        while (node && !this.testTreeNodes.get(node)) {
            node = node.parent;
        }

        let treeNode = this.testTreeNodes.get(node);

        if (!treeNode) {
            this.rootTestTreeNodes.push(newTestNode);
        } else if (treeNode.type === 'suite') {
            treeNode.children.push(newTestNode);
        }

        this.testTreeNodes.set(callExpression, newTestNode);
    }


    private isEach(callExpression: TS.CallExpression): EachResult {
        let eachResult = this.isEachWithArray(callExpression);
        if (eachResult.isEach) {
            return eachResult;
        }

        return this.isEachWithTemplate(callExpression);
    }

    private isEachWithArray(callExpression: TS.CallExpression): EachResult {
        if (
            !this.ts.isCallExpression(callExpression.expression) ||
            !this.ts.isPropertyAccessExpression(callExpression.expression.expression) ||
            !this.ts.isIdentifier(callExpression.expression.expression.expression) ||
            !this.ts.isIdentifier(callExpression.expression.expression.name) ||
            callExpression.expression.expression.name.text !== 'each' ||
            !caseText.has(callExpression.expression.expression.expression.text)
        ) {
            return {
                isEach: false
            };
        }

        return {
            isEach: true,
            type: this.getTypeFromFunctionName(callExpression.expression.expression.expression.text)
        }
    }

    private isEachWithTemplate(callExpression: TS.CallExpression): EachResult {
        if (
            !this.ts.isTaggedTemplateExpression(callExpression.expression) ||
            !this.ts.isPropertyAccessExpression(callExpression.expression.tag) ||
            !this.ts.isIdentifier(callExpression.expression.tag.expression) ||
            !this.ts.isIdentifier(callExpression.expression.tag.name) ||
            callExpression.expression.tag.name.text !== 'each' ||
            !caseText.has(callExpression.expression.tag.expression.text)
        ) {
            return {
                isEach: false
            };
        }

        return {
            isEach: true,
            type: this.getTypeFromFunctionName(callExpression.expression.tag.expression.text)
        }
    }

    private getTypeFromFunctionName(name: string): TestTreeNode['type'] {
        return name === 'describe' ? 'suite' : 'test';
    }

}

interface TreeNode {
    testNameText: string;
    start: number;
    end: number;
    testType: TestTreeNode["type"];
}

function getTreeNode({ testNameText, start, end, testType }: TreeNode): TestTreeNode {
    const data = {
        name: testNameText,
        position: {
            start,
            end: end,
        },
        type: testType,
    } as TestTreeNode;

    if (data.type === 'suite') {
        data.children = [];
    }

    return data;
}

type EachResult = { isEach: false } | {
    isEach: true;
    type: TestTreeNode['type']
};

