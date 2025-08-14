module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'import'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	rules: {
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		'import/no-restricted-paths': [
			'error',
			{
				zones: [
					{
						target: './src/modules/*/(domain|infra)/**',
						from: './src/**',
						except: ['**/src/modules/*/api/**'],
						message: 'Import module internals via its api/ only',
					},
				],
			},
		],
	},
};


