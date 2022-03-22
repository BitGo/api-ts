export type Config = {
  virtualFiles: { [name: string]: string };
  index: string;
  tsConfig: string;
  name: string; // TODO: Read this from annotation
  includeInternal: boolean;
};
