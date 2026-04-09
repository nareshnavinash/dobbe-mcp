import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Detect which frameworks are in use at a given project path.
 * Used to enhance pipeline instructions with framework-specific guidance.
 */

export type Framework =
  | "django"
  | "angular"
  | "react"
  | "nextjs"
  | "nodejs"
  | "express"
  | "flask"
  | "fastapi"
  | "spring"
  | "rails";

interface FrameworkSignature {
  framework: Framework;
  /** Files whose presence indicates the framework. */
  files: string[];
  /** Package names in manifests that indicate the framework. */
  packages: string[];
}

const SIGNATURES: FrameworkSignature[] = [
  { framework: "django", files: ["manage.py"], packages: ["django", "Django"] },
  { framework: "angular", files: ["angular.json"], packages: ["@angular/core"] },
  { framework: "react", files: [], packages: ["react", "react-dom"] },
  { framework: "nextjs", files: ["next.config.js", "next.config.mjs", "next.config.ts"], packages: ["next"] },
  { framework: "express", files: [], packages: ["express"] },
  { framework: "flask", files: [], packages: ["flask", "Flask"] },
  { framework: "fastapi", files: [], packages: ["fastapi", "FastAPI"] },
  { framework: "rails", files: ["Gemfile"], packages: ["rails"] },
  { framework: "spring", files: ["pom.xml"], packages: ["spring-boot"] },
  { framework: "nodejs", files: ["package.json"], packages: [] },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect frameworks at the given project path.
 */
export async function detectFrameworks(projectPath: string): Promise<Framework[]> {
  const detected: Framework[] = [];

  for (const sig of SIGNATURES) {
    // Check for signature files
    let found = false;
    for (const file of sig.files) {
      if (await fileExists(path.join(projectPath, file))) {
        detected.push(sig.framework);
        found = true;
        break;
      }
    }

    // Check package manifests for signature packages
    if (!found && sig.packages.length > 0) {
      if (await checkPackageJson(projectPath, sig.packages) ||
          await checkRequirements(projectPath, sig.packages) ||
          await checkPyproject(projectPath, sig.packages)) {
        detected.push(sig.framework);
      }
    }
  }

  return detected;
}

async function checkPackageJson(projectPath: string, packages: string[]): Promise<boolean> {
  const pkgPath = path.join(projectPath, "package.json");
  if (!(await fileExists(pkgPath))) return false;

  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    const allDeps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };
    return packages.some((p) => p in allDeps);
  } catch {
    return false;
  }
}

async function checkRequirements(projectPath: string, packages: string[]): Promise<boolean> {
  const reqPath = path.join(projectPath, "requirements.txt");
  if (!(await fileExists(reqPath))) return false;

  try {
    const lines = (await fs.readFile(reqPath, "utf-8")).toLowerCase().split("\n");
    return packages.some((p) => {
      const lp = p.toLowerCase();
      // Match package at start of line, ignoring comments and version specifiers
      return lines.some((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) return false;
        return trimmed === lp || trimmed.startsWith(lp + "=") || trimmed.startsWith(lp + "[") ||
               trimmed.startsWith(lp + ">") || trimmed.startsWith(lp + "<") || trimmed.startsWith(lp + "!");
      });
    });
  } catch {
    return false;
  }
}

async function checkPyproject(projectPath: string, packages: string[]): Promise<boolean> {
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (!(await fileExists(pyprojectPath))) return false;

  try {
    const content = (await fs.readFile(pyprojectPath, "utf-8")).toLowerCase();
    return packages.some((p) => content.includes(p.toLowerCase()));
  } catch {
    return false;
  }
}
