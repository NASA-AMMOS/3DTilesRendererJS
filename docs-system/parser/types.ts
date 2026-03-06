/**
 * Parsed class documentation
 */
export interface ParsedClass {
  name: string;
  description: string;
  category?: string;
  extends?: string;
  examples: CodeExample[];
  constructor?: ParsedMethod;
  properties: ParsedProperty[];
  methods: ParsedMethod[];
  sourceFile: string;
  line: number;
}

/**
 * Parsed method documentation
 */
export interface ParsedMethod {
  name: string;
  description: string;
  params: ParsedParam[];
  returns?: {
    type: string;
    description: string;
  };
  examples: CodeExample[];
  isAsync: boolean;
  isStatic: boolean;
  isPrivate: boolean;
  line: number;
}

/**
 * Parsed property documentation
 */
export interface ParsedProperty {
  name: string;
  type: string;
  description: string;
  readonly: boolean;
  isPrivate: boolean;
  default?: string;
  line: number;
}

/**
 * Parsed parameter documentation
 */
export interface ParsedParam {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  default?: string;
}

/**
 * Code example from JSDoc
 */
export interface CodeExample {
  title?: string;
  code: string;
  language: string;
  runnable: boolean;
  dependencies?: string[];
}

/**
 * Build configuration
 */
export interface BuildConfig {
  sourcePatterns: string[];
  examplesDir: string;
  outputDir: string;
}

/**
 * Example file metadata
 */
export interface ExampleFile {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  dependencies: string[];
  sourceFile: string;
}

/**
 * API documentation output
 */
export interface APIDocumentation {
  version: string;
  generatedAt: string;
  classes: ParsedClass[];
}

/**
 * Examples documentation output
 */
export interface ExamplesDocumentation {
  version: string;
  generatedAt: string;
  examples: ExampleFile[];
}
