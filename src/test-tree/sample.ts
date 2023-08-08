import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import * as typescript from 'typescript';
import { TestTreeBuilder } from './build';
import { TestTreeNode } from './types';
import { executeTest } from '../run';
import { convertCancellationTokenToAbortSignal } from '../utils';

const textDecoder = new TextDecoder('utf-8');

export type MarkdownTestData = TestFile | TestHeading | TestCase;

export const testData = new WeakMap<vscode.TestItem, TestFile | TestCase>();

export const getContentFromFilesystem = async (uri: vscode.Uri): Promise<{ content: string, document?: vscode.TextDocument }> => {
  try {
    const [rawContent, document] = await Promise.all([
      vscode.workspace.fs.readFile(uri),
      vscode.workspace.openTextDocument(uri)
    ]);
    const content = textDecoder.decode(rawContent);

    return {
      content,
      document
    }
  } catch (e) {
    console.warn(`Error providing tests for ${uri.fsPath}`, e);
    return {
      content: '',
      document: undefined
    };
  }
};

export class TestFile {
  public didResolve = false;

  public async updateFromDisk(controller: vscode.TestController, item: vscode.TestItem) {
    try {
      const { document, content } = await getContentFromFilesystem(item.uri!);
      item.error = undefined;

      // TODO - remove the !
      this.updateFromContents(controller, document!, content, item);
    } catch (e) {
      item.error = (e as Error).stack;
    }
  }

  /**
   * Parses the tests from the input text, and updates the tests contained
   * by this file to be those from the text,
   */
  public updateFromContents(controller: vscode.TestController, document: vscode.TextDocument, content: string, item: vscode.TestItem) {
    this.didResolve = true;

    const nodes = TestTreeBuilder.build(typescript, content, new AbortController().signal);
    this.travel(controller, item.uri!, document, nodes, item);
  }

  travel(controller: vscode.TestController, testUri: vscode.Uri, document: vscode.TextDocument, nodes: TestTreeNode[], parent: vscode.TestItem) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // TODO - use path instead for unique id
      const id = `${testUri.path}/${node.name}`;
      const testItem = controller.createTestItem(id, node.name, testUri);

      testItem.range = new vscode.Range(document.positionAt(node.position.start), document.positionAt(node.position.end))

      testData.set(testItem, new TestCase(node));
      switch (node.type) {
        case 'test': { }
          break;
        case 'suite':
          this.travel(controller, testUri, document, node.children, testItem);
          break;
      }

      parent.children.add(testItem);
    }
  }
}

export class TestHeading {
  constructor(public generation: number) { }
}

export class TestCase {
  private node: TestTreeNode;

  constructor(node: TestTreeNode) {
    this.node = node;
  }

  async run(item: vscode.TestItem, options: vscode.TestRun, isDebug: boolean): Promise<void> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const result = await executeTest(item.uri!.path, this.node.name, convertCancellationTokenToAbortSignal(options.token));
    options.started(item);

    // According to the docs, we should replace \n with \r\n
    result.stdout?.on('data', data => {
      options.appendOutput(convertLFToCRLF(data.toString()));
    });

    result.stderr?.on('data', data => {
      options.appendOutput(convertLFToCRLF(data.toString()));
    });

    try {
      await result.finishPromise;
      const duration = Date.now() - start;
      options.passed(item, duration);
    } catch (e) {
      console.log('error', e);
      const duration = Date.now() - start;
      options.failed(item, (e as any).message, duration);
    }
  }
}

function convertLFToCRLF(str: string) {
  return str.replace(/(?<!\r)\n/g, '\r\n');
}