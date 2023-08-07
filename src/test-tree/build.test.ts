import * as ts from "typescript";
import {describe, expect, it} from "vitest";
import {TestTreeBuilder} from "./build";
import {TestTreeNode} from "./types";

describe('build', () => {
    describe('simple cases', () => {
        it('it', () => {
            const code = `it("Test should work", () => {
    expect(42).toBe(42)
});`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                {
                    name: "Test should work",
                    position: {
                        start: 0,
                        end: 57
                    },
                    type: "test"
                }
            ])
        });

        it('test', () => {
            const code = `test("Test should work", () => {
    expect(42).toBe(42)
})`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                {
                    name: "Test should work",
                    position: {
                        start: 0,
                        end: 59
                    },
                    type: "test"
                }
            ])
            console.log(root)
        });

        it('it inside describe', () => {
            const code = `describe('something', () => {
    it("Test should work", () => {
        expect(42).toBe(42)
    });
});`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                expect.objectContaining({
                    children: [{
                        name: "Test should work",
                        position: {
                            start: 34,
                            end: 99
                        },
                        type: "test"
                    }],
                })
            ])
        });

        it('test inside describe', () => {
            const code = `describe('something', () => {
    test("Test should work", () => {
        expect(42).toBe(42)
    });
});`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                expect.objectContaining({
                    children: [{
                        name: "Test should work",
                        position: {
                            start: 34,
                            end: 101
                        },
                        type: "test"
                    }],
                })
            ])
        });

        it('describe', () => {
            const code = `describe('something', () => {
});`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                {
                    type: "suite",
                    children: [],
                    name: "something",
                    position: {
                        start: 0,
                        end: 32
                    },
                }
            ])
        });

        it('nested describe', () => {
            const code = `
describe('something', () => {
    describe('nested', () => {
    });
});`;

            const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

            expect(root).toEqual<TestTreeNode[]>([
                {
                    type: "suite",
                    name: "something",
                    position: {
                        start: 1,
                        end: 72
                    },
                    children: [{
                        type: "suite",
                        name: "nested",
                        position: {
                            start: 35,
                            end: 68
                        },
                        children: []
                    }],
                }
            ])
        });

        describe('each', () => {
            it('it.each with array', () => {
                const code = `it.each([1])("Test %s work", () => {
    expect(42).toBe(42)
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "Test .* work",
                        position: {
                            start: 0,
                            end: 63
                        },
                        type: "test",
                    }
                ])
            });

            it('it.each with template', () => {
                const code = `
it.each\`
    value
    \${1}
\`('test this $value hello', ({value}) => {
    console.log(value);
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "test this .* hello",
                        position: {
                            start: 1,
                            end: 98
                        },
                        type: "test",
                    }
                ])
            });

            it('test.each with array', () => {
                const code = `test.each([1])("Test %s work", () => {
    expect(42).toBe(42)
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "Test .* work",
                        position: {
                            start: 0,
                            end: 65
                        },
                        type: "test",
                    }
                ])
            });

            it('test.each with template', () => {
                const code = `
test.each\`
    value
    \${1}
\`('test this $value hello', ({value}) => {
    console.log(value);
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "test this .* hello",
                        position: {
                            start: 1,
                            end: 100
                        },
                        type: "test",
                    }
                ])
            });

            it('describe.each with array', () => {
                const code = `describe.each([1])("Test %s work", () => {
    expect(42).toBe(42)
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "Test .* work",
                        type: "suite",
                        position: {
                            start: 0,
                            end: 69
                        },
                        children: [],
                    }
                ])
            });

            it('describe.each with template', () => {
                const code = `
describe.each\`
    value
    \${1}
\`('test this $value hello', ({value}) => {
    console.log(value);
});`;

                const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

                expect(root).toEqual<TestTreeNode[]>([
                    {
                        name: "test this .* hello",
                        type: "suite",
                        position: {
                            start: 1,
                            end: 104
                        },
                        children: []
                    }
                ])
            });
        });
    });

    it('should build complex test structure', () => {
        const code = `
describe('my describe', () => {
    describe('sub', () => {
        it('sub test 1', () => {
            expect(1 + 41).toBe(42);
        });
    });
    
     it('Should work', () => {
        expect(1 + 41).toBe(42);
    });
});

test("Test should work", () => {
    expect(42).toBe(42)
})

it.each([1])('test this %s', (s) => {
    console.log(s);
});

it.each\`
    value
    ${1}
\`('test this $va ccasacs', ({value}) => {
    console.log(value);
});

`;

        const root = TestTreeBuilder.build(ts, code, new AbortController().signal);

        expect(root).toEqual<TestTreeNode[]>([
            {
                name: "my describe",
                position: {
                    start: 1,
                    end: 230
                },
                type: "suite",
                children: [
                    {
                        name: "sub",
                        position: {
                            start: 37,
                            end: 149
                        },
                        type: "suite",
                        children: [
                            {
                                name: "sub test 1",
                                position: {
                                    start: 69,
                                    end: 141
                                },
                                type: "test"
                            }
                        ]
                    },
                    {
                        name: "Should work",
                        position: {
                            start: 161,
                            end: 226
                        },
                        type: "test"
                    }
                ]
            },
            {
                name: "Test should work",
                position: {
                    start: 233,
                    end: 292
                },
                type: "test"
            },
            {
                name: "test this .*",
                position: {
                    start: 294,
                    end: 354
                },
                type: "test"
            },
            {
                name: "test this .* ccasacs",
                position: {
                    start: 357,
                    end: 450
                },
                type: "test"
            }
        ])
    });
});
