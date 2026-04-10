declare module "expo-document-picker" {
  export type DocumentPickerAsset = {
    uri: string;
    mimeType?: string | null;
    name: string;
    size?: number;
  };

  export type DocumentPickerResult =
    | { canceled: true; assets: null }
    | { canceled: false; assets: DocumentPickerAsset[] };

  export function getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<DocumentPickerResult>;
}
