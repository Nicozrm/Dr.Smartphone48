import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      // Build-Artefakte des Cloudflare-Adapters – generierter Code.
      ".open-next/**",
      ".wrangler/**",
      ".static-build-park/**",
    ],
  },
];

export default eslintConfig;
