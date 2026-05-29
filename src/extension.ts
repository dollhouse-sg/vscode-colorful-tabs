import * as vscode from 'vscode';

const STORAGE_KEY = 'colorTabs.markers';

const MARKERS = [
  { label: '🔴 Red',    emoji: '🔴' },
  { label: '🟠 Orange', emoji: '🟠' },
  { label: '🟡 Yellow', emoji: '🟡' },
  { label: '🟢 Green',  emoji: '🟢' },
  { label: '🔵 Blue',   emoji: '🔵' },
  { label: 'No Marker', emoji: '' },
];

class ColorTabsProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly _emitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._emitter.event;

  private markers: Map<string, string>;

  constructor(private readonly context: vscode.ExtensionContext) {
    const stored = context.workspaceState.get<Record<string, string>>(STORAGE_KEY, {});
    this.markers = new Map(Object.entries(stored));
  }

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const badge = this.markers.get(uri.toString());
    if (!badge) {
      return undefined;
    }
    return { badge };
  }

  async setMarker(uri: vscode.Uri, emoji: string): Promise<void> {
    if (emoji) {
      this.markers.set(uri.toString(), emoji);
    } else {
      this.markers.delete(uri.toString());
    }
    await this.save();
    this._emitter.fire(uri);
  }

  private async save(): Promise<void> {
    await this.context.workspaceState.update(STORAGE_KEY, Object.fromEntries(this.markers));
  }

  dispose(): void {
    this._emitter.dispose();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ColorTabsProvider(context);
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(provider));
  context.subscriptions.push(provider);

  context.subscriptions.push(
    vscode.commands.registerCommand('colorTabs.setMarker', async (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        return;
      }

      const pick = await vscode.window.showQuickPick(
        MARKERS.map(m => m.label),
        { placeHolder: 'Pick a colour or clear the marker' }
      );
      if (pick === undefined) {
        return;
      }

      const chosen = MARKERS.find(m => m.label === pick);
      if (!chosen) {
        return;
      }

      await provider.setMarker(target, chosen.emoji);
    })
  );
}

export function deactivate(): void {}
