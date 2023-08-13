import { ExtensionContext, commands, window, Position, Selection } from 'vscode';
import { VgLanguageClient } from './client';

let client: VgLanguageClient;
export function activate(context: ExtensionContext) {
	client = new VgLanguageClient(context);

	client.start().then();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
