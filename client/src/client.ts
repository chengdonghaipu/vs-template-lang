import * as vscode from 'vscode';
import * as path from 'path';
import * as lsp from 'vscode-languageclient/node';
import { isInsideInlineTemplateRegion } from './embedded_support';

export class VgLanguageClient implements vscode.Disposable {
  private client: lsp.LanguageClient | null = null;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly virtualDocumentContents = new Map<string, string>();
  private readonly outputChannel: vscode.OutputChannel;
  private readonly name = 'vg Language Service';
  private readonly clientOptions: lsp.LanguageClientOptions;

  constructor(private readonly context: vscode.ExtensionContext) {
    vscode.workspace.registerTextDocumentContentProvider('vg-embedded-content', {
      provideTextDocumentContent: uri => {
        return this.virtualDocumentContents.get(uri.toString());
      }
    });

    this.outputChannel = vscode.window.createOutputChannel(this.name);

    this.clientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'html' },
        { scheme: 'file', language: 'typescript' },
      ],
      middleware: {
        // 悬停
        provideHover: async (
            document: vscode.TextDocument, position: vscode.Position,
            token: vscode.CancellationToken, next: lsp.ProvideHoverSignature) => {
          if (!(await this.isInVgProject(document)) ||
              !isInsideInlineTemplateRegion(document, position)) {
            return;
          }

          // const angularResultsPromise = next(document, position, token);

          // Include results for inline HTML via virtual document and native html providers.
          if (document.languageId === 'typescript') {
            const vdocUri = this.createVirtualHtmlDoc(document);
            const htmlProviderResultsPromise = vscode.commands.executeCommand<vscode.Hover[]>(
                'vscode.executeHoverProvider', vdocUri, position);
            const htmlProviderCompletions = await htmlProviderResultsPromise;
            return htmlProviderCompletions?.[0];
          }

          return;
        },
        // 自动完成
        provideCompletionItem: async (
          document: vscode.TextDocument, position: vscode.Position,
          context: vscode.CompletionContext, token: vscode.CancellationToken,
          next: lsp.ProvideCompletionItemsSignature) => {
          // 确保在template中
          if (!(await this.isInVgProject(document)) ||
            !isInsideInlineTemplateRegion(document, position)) {
            return next(document, position, context, token);
          }

          if (document.languageId === 'typescript') {
            const vdocUri = this.createVirtualHtmlDoc(document);
            const htmlProviderCompletionsPromise =
              vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider', vdocUri, position,
                context.triggerCharacter);
            const htmlProviderCompletions = await htmlProviderCompletionsPromise;

            return htmlProviderCompletions?.items ?? []
          }

          return [];
        },
      }
    }
  }

  private createVirtualHtmlDoc(document: vscode.TextDocument): vscode.Uri {
    // 真实文件路径
    const originalUri = document.uri.toString();
    const vdocUri = vscode.Uri.file(encodeURIComponent(originalUri) + '.html')
      // authority: 'html' 用于标识这个虚拟文档的内容类型
      .with({ scheme: 'vg-embedded-content', authority: 'html' });
    // 将虚拟 HTML 文档的 URI 作为键，将原始文档的文本内容作为值
    this.virtualDocumentContents.set(vdocUri.toString(), document.getText());
    // 返回创建的虚拟 HTML 文档的 URI
    return vdocUri;
  }

  private async isInVgProject(doc: vscode.TextDocument): Promise<boolean> {
    return true
  }

  async stop(): Promise<void> {
    if (this.client === null) {
      return;
    }
    await this.client.stop();
    this.outputChannel.clear();
    this.dispose();
    this.client = null;
    this.virtualDocumentContents.clear();
  }

  async start(): Promise<void> {
    if (this.client !== null) {
      throw new Error(`An existing client is running. Call stop() first.`);
    }

    const serverModule = this.context.asAbsolutePath(
      path.join('server', 'out', 'server.js')
    );

    const serverOptions: lsp.ServerOptions = {
      run: { module: serverModule, transport: lsp.TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: lsp.TransportKind.ipc,
      }
    };

    this.client = new lsp.LanguageClient(
      'vg',
      this.name,
      serverOptions,
      this.clientOptions
    );

    this.disposables.push(this.client.start());
  }

  dispose() {
    for (let d = this.disposables.pop(); d !== undefined; d = this.disposables.pop()) {
      d.dispose();
    }
  }
}

