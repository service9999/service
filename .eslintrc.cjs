module.exports = {
  env: {
    node: true,
    es2021: true
  },
  plugins: ["import"],
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "import/no-unresolved": "error",
    "import/named": "error",
    "import/default": "error",
    "import/no-duplicates": "warn"
  }
};
