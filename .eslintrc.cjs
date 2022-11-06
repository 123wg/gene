/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
    root: true,
    // FIXME 去掉测试'@vue/eslint-config-prettier'
    extends: ['plugin:vue/vue3-essential', 'eslint:recommended', '@vue/eslint-config-typescript'],
    overrides: [
        {
            files: ['cypress/e2e/**.{cy,spec}.{js,ts,jsx,tsx}'],
            extends: ['plugin:cypress/recommended']
        }
    ],
    rules: {
        indent: ['error', 4],
        'vue/comment-directive': 0
    },
    parserOptions: {
        ecmaVersion: 'latest'
    }
}
