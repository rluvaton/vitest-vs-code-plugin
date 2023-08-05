import { describe, it, test, expect } from 'vitest';

describe('Test', () => {
    it('Should work', () => {
        expect(1 + 41).toBe(42);
    });
});

test("Test should work", () => {
    expect(42).toBe(42)
})

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
