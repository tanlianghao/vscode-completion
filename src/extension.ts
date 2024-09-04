import * as vscode from "vscode";
import * as fs from "fs";
import type { CompletionDataParentModel, CompletionDataItemModel } from "./data_type";
import path from "path";

const completionCommand = "extension.xdragonCompletion";
const completionTriggerCharacter = "@";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("xp-completion");
  const configPath = config.get("configPath", "");
  const workspackFolders = vscode.workspace.workspaceFolders;

  if (workspackFolders) {
    const workspaceRootPath = workspackFolders[0].uri.fsPath;
    const fullPath = path.join(workspaceRootPath, configPath);

    try {
      const configFileContent = fs.readFileSync(fullPath, "utf-8");
      const paramsJson: CompletionDataParentModel[] = JSON.parse(configFileContent);
      const parentProvider = new CustomerCompletionProvider(paramsJson);
      const parentDisposable = vscode.languages.registerCompletionItemProvider(
        "dart",
        parentProvider,
        completionTriggerCharacter
      );
      let currentKeys: string | null;

      const childDisposable = vscode.languages.registerCompletionItemProvider("dart", {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          if (currentKeys) {
            let currentItems = getCurrentItemByKeys(currentKeys, paramsJson);
            let resultCompletions = currentItems.map((item) => {
              const completionItem = new vscode.CompletionItem(`${currentKeys}-${item.instanceLabel}`);
              completionItem.insertText = new vscode.SnippetString(item.demoCode ?? "");

              let markdownContent = new vscode.MarkdownString();
              markdownContent.appendMarkdown(`<img src="${item.previewImageUrl}"  width="200" />`);

              completionItem.documentation = markdownContent;
              completionItem.documentation.supportHtml = true;
              completionItem.detail = item.description;
              return completionItem;
            });

            if (currentKeys) {
              currentKeys = null;
            }
            return resultCompletions;
          }
          return [];
        },
      });

      const command = vscode.commands.registerCommand(completionCommand, (envParams: string) => {
        currentKeys = envParams;
        vscode.commands.executeCommand("editor.action.triggerSuggest");
      });

      context.subscriptions.push(parentDisposable, childDisposable, command);
    } catch (error) {
      vscode.window.showErrorMessage("读取配置文件失败");
    }
  } else {
    vscode.window.showErrorMessage("未找到工作区");
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('您的扩展"vscode-plugin-demo"已被释放！');
}

class CustomerCompletionProvider implements vscode.CompletionItemProvider {
  constructor(params: CompletionDataParentModel[]) {
    this.completionData = params;
  }

  completionData: CompletionDataParentModel[];

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    if (context.triggerCharacter !== completionTriggerCharacter) {
      return [];
    }

    let completionArray = this.completionData.map((item: CompletionDataParentModel) => {
      const completion = new vscode.CompletionItem(item.label);
      completion.command = { title: "触发二级补全", command: completionCommand, arguments: [item.label] };
      const start = new vscode.Position(position.line, position.character - 1); // 假设触发字符是一个字符
      const range = new vscode.Range(start, position);

      completion.additionalTextEdits = [vscode.TextEdit.replace(range, "")];
      return completion;
    });

    return completionArray;
  }
}

function getCurrentItemByKeys(commandKey: string, paramsJson: CompletionDataParentModel[]): CompletionDataItemModel[] {
  let currentChildList: CompletionDataItemModel[] = [];
  for (let i = 0; i < paramsJson.length; i++) {
    const item = paramsJson[i];
    if (item.label === commandKey) {
      currentChildList = item.children;
      break;
    }
  }
  return currentChildList;
}
