export interface Health {
  status: string;
  version: string;
}

export interface EnigmaApi {
  health(): Promise<Health>;
}
