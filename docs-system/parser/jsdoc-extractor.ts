import * as fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as doctrine from 'doctrine';

// Handle ESM/CJS interop for @babel/traverse
const traverse = (_traverse as any).default || _traverse;
import type {
  ParsedClass,
  ParsedMethod,
  ParsedProperty,
  ParsedParam,
  CodeExample,
} from './types';

/**
 * Extract JSDoc documentation from a JavaScript file
 */
export function extractFromFile(filePath: string): ParsedClass[] {
  const code = fs.readFileSync(filePath, 'utf-8');
  return extractFromCode(code, filePath);
}

/**
 * Extract JSDoc documentation from code string
 */
export function extractFromCode(code: string, filePath: string = ''): ParsedClass[] {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'classPrivateProperties'],
    errorRecovery: true,
  });

  const classes: ParsedClass[] = [];

  traverse(ast, {
    ClassDeclaration(path) {
      const classDoc = extractClassDoc(path, filePath);
      if (classDoc) {
        classes.push(classDoc);
      }
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration?.type === 'ClassDeclaration') {
        const classPath = path.get('declaration');
        const classDoc = extractClassDoc(classPath as any, filePath);
        if (classDoc) {
          classes.push(classDoc);
        }
      }
    },
  });

  return classes;
}

/**
 * Extract class documentation
 */
function extractClassDoc(path: any, filePath: string): ParsedClass | null {
  const node = path.node;
  const className = node.id?.name || 'Anonymous';

  // Get leading comments (JSDoc)
  const leadingComments = node.leadingComments || path.parent?.leadingComments;
  const jsdocComment = leadingComments?.find(
    (c: any) => c.type === 'CommentBlock' && c.value.startsWith('*')
  );

  let description = '';
  let category: string | undefined;
  let examples: CodeExample[] = [];

  if (jsdocComment) {
    const jsdoc = doctrine.parse(jsdocComment.value, {
      unwrap: true,
      sloppy: true,
      tags: ['param', 'returns', 'return', 'example', 'category', 'extends', 'private', 'internal'],
    });

    description = jsdoc.description || '';
    category = getTagValue(jsdoc, 'category');
    examples = extractExamples(jsdoc);
  }

  const classDoc: ParsedClass = {
    name: className,
    description,
    category,
    extends: node.superClass?.name,
    examples,
    properties: [],
    methods: [],
    sourceFile: filePath,
    line: node.loc?.start.line || 0,
  };

  // Extract class members
  node.body.body.forEach((member: any) => {
    if (member.type === 'ClassMethod') {
      const methodDoc = extractMethodDoc(member);
      if (methodDoc && !methodDoc.isPrivate) {
        if (member.kind === 'constructor') {
          classDoc.constructor = methodDoc;
        } else if (member.kind === 'get' || member.kind === 'set') {
          // Handle getters/setters as properties
          const existingProp = classDoc.properties.find(p => p.name === methodDoc.name);
          if (!existingProp) {
            classDoc.properties.push({
              name: methodDoc.name,
              type: methodDoc.returns?.type || 'any',
              description: methodDoc.description,
              readonly: member.kind === 'get',
              isPrivate: methodDoc.isPrivate,
              line: methodDoc.line,
            });
          }
        } else {
          classDoc.methods.push(methodDoc);
        }
      }
    } else if (member.type === 'ClassProperty') {
      const propDoc = extractPropertyDoc(member);
      if (propDoc && !propDoc.isPrivate) {
        classDoc.properties.push(propDoc);
      }
    }
  });

  return classDoc;
}

/**
 * Extract method documentation
 */
function extractMethodDoc(node: any): ParsedMethod | null {
  const methodName = node.key?.name || node.key?.value || '';

  // Skip private methods (starting with _)
  const isPrivate = methodName.startsWith('_');

  const leadingComments = node.leadingComments;
  const jsdocComment = leadingComments?.find(
    (c: any) => c.type === 'CommentBlock' && c.value.startsWith('*')
  );

  let description = '';
  let params: ParsedParam[] = [];
  let returns: { type: string; description: string } | undefined;
  let examples: CodeExample[] = [];
  let isInternal = false;

  if (jsdocComment) {
    const jsdoc = doctrine.parse(jsdocComment.value, {
      unwrap: true,
      sloppy: true,
    });

    description = jsdoc.description || '';
    params = extractParams(jsdoc);
    returns = extractReturns(jsdoc);
    examples = extractExamples(jsdoc);
    isInternal = hasTag(jsdoc, 'internal') || hasTag(jsdoc, 'private');
  }

  return {
    name: methodName,
    description,
    params,
    returns,
    examples,
    isAsync: node.async || false,
    isStatic: node.static || false,
    isPrivate: isPrivate || isInternal,
    line: node.loc?.start.line || 0,
  };
}

/**
 * Extract property documentation
 */
function extractPropertyDoc(node: any): ParsedProperty | null {
  const propName = node.key?.name || node.key?.value || '';

  // Skip private properties
  const isPrivate = propName.startsWith('_');

  const leadingComments = node.leadingComments;
  const jsdocComment = leadingComments?.find(
    (c: any) => c.type === 'CommentBlock' && c.value.startsWith('*')
  );

  let description = '';
  let type = 'any';
  let isReadonly = false;
  let isInternal = false;

  if (jsdocComment) {
    const jsdoc = doctrine.parse(jsdocComment.value, {
      unwrap: true,
      sloppy: true,
    });

    description = jsdoc.description || '';
    type = getTagValue(jsdoc, 'type') || 'any';
    isReadonly = hasTag(jsdoc, 'readonly');
    isInternal = hasTag(jsdoc, 'internal') || hasTag(jsdoc, 'private');
  }

  return {
    name: propName,
    type,
    description,
    readonly: isReadonly,
    isPrivate: isPrivate || isInternal,
    line: node.loc?.start.line || 0,
  };
}

/**
 * Extract parameters from JSDoc
 */
function extractParams(jsdoc: doctrine.Annotation): ParsedParam[] {
  return jsdoc.tags
    .filter(tag => tag.title === 'param')
    .map(tag => ({
      name: tag.name || '',
      type: typeToString(tag.type),
      description: tag.description || '',
      optional: tag.type?.type === 'OptionalType',
      default: tag.default,
    }));
}

/**
 * Extract return type from JSDoc
 */
function extractReturns(jsdoc: doctrine.Annotation): { type: string; description: string } | undefined {
  const returnTag = jsdoc.tags.find(tag => tag.title === 'returns' || tag.title === 'return');
  if (returnTag) {
    return {
      type: typeToString(returnTag.type),
      description: returnTag.description || '',
    };
  }
  return undefined;
}

/**
 * Extract code examples from JSDoc
 */
function extractExamples(jsdoc: doctrine.Annotation): CodeExample[] {
  return jsdoc.tags
    .filter(tag => tag.title === 'example')
    .map(tag => parseExample(tag.description || ''));
}

/**
 * Parse example string into CodeExample
 * Supports format:
 * @example <caption>Title</caption> [runnable] [deps: three, lodash]
 * ```js
 * code here
 * ```
 */
function parseExample(raw: string): CodeExample {
  let title: string | undefined;
  let code = raw;
  let language = 'javascript';
  let runnable = true;
  let dependencies: string[] | undefined;

  // Extract caption
  const captionMatch = raw.match(/<caption>(.*?)<\/caption>/i);
  if (captionMatch) {
    title = captionMatch[1].trim();
    code = raw.replace(captionMatch[0], '').trim();
  }

  // Check for [runnable=false]
  if (code.includes('[runnable=false]')) {
    runnable = false;
    code = code.replace('[runnable=false]', '').trim();
  }

  // Extract dependencies [deps: three, lodash]
  const depsMatch = code.match(/\[deps?:\s*([^\]]+)\]/i);
  if (depsMatch) {
    dependencies = depsMatch[1].split(',').map(d => d.trim());
    code = code.replace(depsMatch[0], '').trim();
  }

  // Extract code block
  const codeBlockMatch = code.match(/```(\w+)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    language = codeBlockMatch[1] || 'javascript';
    code = codeBlockMatch[2].trim();
  }

  return {
    title,
    code,
    language,
    runnable,
    dependencies,
  };
}

/**
 * Get tag value from JSDoc
 */
function getTagValue(jsdoc: doctrine.Annotation, tagName: string): string | undefined {
  const tag = jsdoc.tags.find(t => t.title === tagName);
  return tag?.description || (tag?.name ? tag.name : undefined);
}

/**
 * Check if JSDoc has a specific tag
 */
function hasTag(jsdoc: doctrine.Annotation, tagName: string): boolean {
  return jsdoc.tags.some(t => t.title === tagName);
}

/**
 * Convert doctrine type to string
 */
function typeToString(type: any): string {
  if (!type) return 'any';

  switch (type.type) {
    case 'NameExpression':
      return type.name;
    case 'OptionalType':
      return typeToString(type.expression);
    case 'UnionType':
      return type.elements.map(typeToString).join(' | ');
    case 'TypeApplication':
      return `${type.expression.name}<${type.applications.map(typeToString).join(', ')}>`;
    case 'ArrayType':
      return `${typeToString(type.elements[0])}[]`;
    case 'NullableType':
      return `${typeToString(type.expression)} | null`;
    case 'NonNullableType':
      return typeToString(type.expression);
    case 'AllLiteral':
      return 'any';
    case 'NullLiteral':
      return 'null';
    case 'UndefinedLiteral':
      return 'undefined';
    case 'VoidLiteral':
      return 'void';
    case 'RestType':
      return `...${typeToString(type.expression)}`;
    case 'RecordType':
      return 'Object';
    default:
      return 'any';
  }
}
