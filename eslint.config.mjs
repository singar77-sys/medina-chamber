import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

/*
 * eslint-config-next already registers the jsx-a11y plugin but only enables 6
 * rules. We bring in the full `recommended` rule set (34 rules) as a
 * rules-only block — re-registering the plugin would throw
 * "Cannot redefine plugin".
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,

      /*
       * Honour the leading-underscore convention this codebase already uses for
       * deliberately-unused bindings — mock signatures that must match a real
       * one (`(_db, _input) => …` all over the route tests), graphics
       * components that take `_props` they ignore, and destructured values kept
       * only to drop them from a rest spread.
       *
       * Without this the rule reports ~40 of those as debt, which trains people
       * to ignore its output — and there is no way to say "this argument exists
       * for the signature" other than deleting a name the reader wants. This
       * narrows the rule to what it is actually for: genuinely dead bindings,
       * which stay reported.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
