import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import mdcs from 'eslint-config-mdcs';

export default [
	// files to ignore
	{
		name: 'files to ignore',
		ignores: [
			'**/node_modules/**',
			'**/build/**',
		],
	},

	// recommended
	js.configs.recommended,

	// ts recommended
	...tseslint.configs.recommended.map( config => ( {
		...config,
		files: [ '**/*.ts', '**/*.tsx' ],
	} ) ),

	// base rules
	{
		name: 'base rules',
		files: [ '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx' ],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			...mdcs.rules,
			'no-mixed-spaces-and-tabs': 'error',
			quotes: [ 'error', 'single' ],
			'sort-imports': [ 'error', {
				ignoreCase: true,
				ignoreDeclarationSort: true,
				ignoreMemberSort: true,
				memberSyntaxSortOrder: [ 'none', 'all', 'multiple', 'single' ],
				allowSeparatedGroups: false,
			} ],
			'no-unused-vars': [ 'error', {
				vars: 'all',
				args: 'none',
			} ],
		},
	},

	// ts rule overrides
	{
		name: 'ts rule overrides',
		files: [ '**/*.ts', '**/*.tsx' ],
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [ 'error', { args: 'none' } ],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
		},
	},

	// react
	{
		name: 'react rules',
		files: [ '**/*.js', '**/*.jsx', '**/*.tsx' ],
		plugins: {
			react,
			'react-hooks': reactHooks,
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			...react.configs.recommended.rules,
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/no-unknown-property': 'off',
			'react/jsx-curly-spacing': [ 'error', { when: 'always' } ],
		},
	},

	// vitest
	{
		name: 'vitest rules',
		files: [ '**/*.test.js', '**/*.test.ts', '**/*.test.tsx', '**/*.test.jsx' ],
		plugins: {
			vitest,
		},
		languageOptions: {
			globals: {
				...vitest.environments.env.globals,
			},
		},
		rules: {
			...vitest.configs.recommended.rules,
			'vitest/valid-describe-callback': 0,
		},
	},
];
