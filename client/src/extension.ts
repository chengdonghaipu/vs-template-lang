import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { VgLanguageClient } from './client';
import * as vscode from 'vscode';

let client: VgLanguageClient;
export function activate(context: ExtensionContext) {
	client = new VgLanguageClient(context);

	// const disposable =
  //     vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
  //       if (!e.affectsConfiguration('vg')) {
  //         return;
  //       }
  //       await client.stop();
  //       await client.start();
  //     });
  // context.subscriptions.push(client, disposable);

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
