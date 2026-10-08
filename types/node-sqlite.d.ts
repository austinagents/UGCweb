declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean });
    prepare(sql: string): {
      get(...parameters: unknown[]): unknown;
      all(...parameters: unknown[]): unknown[];
    };
    close(): void;
  }
}
