import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Caminho raiz do Next.js (onde está o next.config.js)
  dir: "./",
});

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
};

export default createJestConfig(config);
