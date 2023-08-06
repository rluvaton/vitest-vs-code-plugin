import { describe, it, test, expect } from 'vitest';

describe('Test', () => {
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

it.each`
    value
    ${1}
`('test this $va ccasacs', ({value}) => {
    console.log(value);
});

// Should not have run vitest here
function run() {
    it('Should not show the run test here', () => {
        expect(42).toBe(42);
    });
}

const r = () => {
    it('Should not show the run test here', () => {
        expect(42).toBe(42);
    });
};
