{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["@testing-library/jest-dom"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  },
  "testMatch": ["**/__tests__/**/*.test.tsx", "**/__tests__/**/*.test.ts"],
  "collectCoverageFrom": [
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!**/node_modules/**"
  ]
}
