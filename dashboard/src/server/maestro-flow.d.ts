declare module 'maestro-flow' {
  export interface ManifestEntry {
    path: string;
    type: 'file' | 'dir';
  }

  export interface Manifest {
    id: string;
    version: string;
    scope: 'global' | 'project';
    targetPath: string;
    installedAt: string;
    entries: ManifestEntry[];
    hookLevel?: string;
    selectedComponentIds?: string[];
  }

  export interface ComponentDef {
    id: string;
    label: string;
    description: string;
    sourcePath: string;
    target: (mode: 'global' | 'project', projectPath: string) => string;
    alwaysGlobal: boolean;
    inject?: boolean;
    section?: string;
  }

  export const paths: {
    home: string;
    config: string;
    specs: string;
    extensions: string;
    data: string;
    logs: string;
    cliHistory: string;
    skillConfig: string;
    project(root: string): {
      root: string;
      workflow: string;
      templates: string;
    };
    ensure(...dirs: string[]): void;
  };

  export const COMPONENT_DEFS: ComponentDef[];

  export function createManifest(
    scope: 'global' | 'project',
    targetPath: string,
    opts?: { hookLevel?: string; selectedComponentIds?: string[] },
  ): Manifest;

  export function addFile(manifest: Manifest, filePath: string): void;
  export function addDir(manifest: Manifest, dirPath: string): void;
  export function saveManifest(manifest: Manifest): string;
  export function findManifest(scope: 'global' | 'project', targetPath: string): Manifest | null;
  export function getAllManifests(): Manifest[];
  export function deleteManifest(manifest: Manifest): void;
  export function cleanManifestFiles(
    manifest: Manifest,
    opts?: { skipContentManaged?: boolean },
  ): { removed: number; skipped: number };

  export function migrateAndInject(...args: any[]): any;
  export function injectDocFile(...args: any[]): any;
  export function removeContent(...args: any[]): any;
  export function removeAllSections(...args: any[]): any;
  export function hasSection(...args: any[]): boolean;
  export function hasAnyMarkers(...args: any[]): boolean;

  export type MigrateAction = 'created' | 'updated' | 'migrated' | 'injected';

  export interface MigrateResult {
    action: MigrateAction;
    content: string;
    warning?: string;
  }
}
