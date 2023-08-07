export interface BaseTestTreeNode {
    name: string | symbol;
    position: {
        start: number;
        end: number;
    };
}

export interface TestNode extends BaseTestTreeNode {
    type: 'test';
}

export interface SuiteNode extends BaseTestTreeNode {
    type: 'suite';
    children: TestTreeNode[];
}

export type TestTreeNode = TestNode | SuiteNode
