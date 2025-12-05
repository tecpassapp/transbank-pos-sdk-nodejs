import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts', 'examples/**/*.ts', '*.ts'],
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'indent': 'off',
			'@stylistic/indent': ['error', 'tab', { SwitchCase: 1 }],
			'no-tabs': 'off',
			'@typescript-eslint/no-unsafe-declaration-merging': 'off',
		},
	},
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'tests/**',
			'examples/**/*.js',
		],
	}
);
