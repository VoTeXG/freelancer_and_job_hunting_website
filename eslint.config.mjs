import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Global rules
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
  'next/no-img-element': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@heroicons/react', message: 'Use LazyIcon instead of importing from @heroicons/react.' },
            { name: '@heroicons/react/24/outline', message: 'Use LazyIcon instead of importing icons directly.' },
            { name: '@heroicons/react/24/solid', message: 'Use LazyIcon instead of importing icons directly.' },
          ],
          patterns: [
            { group: ['@heroicons/react/**'], message: 'Use LazyIcon instead of importing icons directly.' },
          ],
        },
      ],
    },
  },
  // Allow LazyIcon to import heroicons
  {
    files: ['src/components/ui/LazyIcon.tsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
