import * as path from 'path';
import {CancellationToken} from "vscode";

export function flatMap<T, U>(
    items: readonly T[],
    map: (v: T) => U | readonly U[]
): U[] {
    const results: U[] = [];
    items.forEach(item => {
        const result = map(item);
        results.push(...(Array.isArray(result) ? result : [result]));
    });
    return results;
}

export function getVscodeTypescriptPath(appRoot: string) {
    return path.join(
        appRoot,
        'extensions',
        'node_modules',
        'typescript',
        'lib',
        'typescript.js'
    );
}

export function convertCancellationTokenToAbortSignal(token: CancellationToken): AbortSignal {
    const controller = new AbortController();
    token.onCancellationRequested(() => controller.abort());
    return controller.signal;
}
