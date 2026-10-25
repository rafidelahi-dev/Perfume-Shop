import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      // turn off specific rules you don’t like
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",

      // new React Compiler rules from eslint-config-next 16: advice for now, not blockers
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",

      // optional: if you want to be more chill while finishing MVP
      // "@typescript-eslint/no-explicit-any": "off",
      // "@typescript-eslint/no-unused-expressions": "off",
    },
  },
];

export default eslintConfig;
