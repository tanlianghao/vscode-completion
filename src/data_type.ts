export interface CompletionDataItemModel {
  instanceLabel: string;
  description: string;
  previewImageUrl: string;
  demoCode?: string;
}

export interface CompletionDataParentModel {
  label: string;
  commandKey: string;
  children: CompletionDataItemModel[];
}
