export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Descriptions are in Italian and may start with a proper noun (Nuxt, Redis, ...).
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
