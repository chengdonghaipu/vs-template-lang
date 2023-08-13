import * as lsp from 'vscode-languageserver/node';
import { getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver';

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const htmlLanguageService = getLanguageService();

export class Service {
    private readonly connection: lsp.Connection;

    constructor() {
        this.connection = lsp.createConnection(lsp.ProposedFeatures.all);
        this.addProtocolHandlers(this.connection);
        documents.listen(this.connection);
    }

    private addProtocolHandlers(conn: lsp.Connection) {
        conn.onInitialize(p => this.onInitialize(p));
        conn.onHover(p => this.onHover(p));
        // 这个处理函数提供了初始补全项列表
        conn.onCompletion(p => this.onCompletion(p));
        // 这个函数为补全列表的选中项提供了更多信息
        // conn.onCompletionResolve(p => this.onCompletionResolve(p));
    }

    private onInitialize(_: lsp.InitializeParams): lsp.InitializeResult {
        const result: lsp.InitializeResult = {
            capabilities: {
                // 增量式文本文档同步
                textDocumentSync: lsp.TextDocumentSyncKind.Incremental,
                // 告诉客户端该服务器支持代码完成。
                completionProvider: {
                    resolveProvider: true,
                    /**
                     * 是指代码补全触发字符（trigger characters）的列表。
                     * 这些字符指的是在你在编辑器中输入代码时，
                     * 如果输入了其中一个字符，编辑器会发起代码补全请求
                     */
                    triggerCharacters: ['<', '.', '*', '[', '(', '$', '|']
                },
                hoverProvider: true,
                workspace: {
                    workspaceFolders: { supported: true },
                },
            }
        };

        return result
    }

    private onCompletion(params: lsp.CompletionParams): lsp.CompletionList | null {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }
    
        return htmlLanguageService.doComplete(
            document,
            params.position,
            htmlLanguageService.parseHTMLDocument(document)
        );
    }

    private onHover(params: lsp.TextDocumentPositionParams): lsp.Hover|null {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }
    
        return htmlLanguageService.doHover(
            document,
            params.position,
            htmlLanguageService.parseHTMLDocument(document)  
        );
    }

    listen(): void {
        this.connection.listen();
    }
}