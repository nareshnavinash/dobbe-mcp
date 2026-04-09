import * as fs from "node:fs";
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

/**
 * Detect frameworks at the given project path.
 */
export function detectFrameworks(projectPath: string): Framework[] {
  const detected: Framework[] = [];

  for (const sig of SIGNATURES) {
    // Check for signature files
    for (const file of sig.files) {
      if (fs.existsSync(path.join(projectPath, file))) {
        detected.push(sig.framework);
        break;
      }
    }

    // Check package manifests for signature packages
    if (!detected.includes(sig.framework) && sig.packages.length > 0) {
      if (checkPackageJson(projectPath, sig.packages) ||
          checkRequirements(projectPath, sig.packages) ||
          checkPyproject(projectPath, sig.packages)) {
        detected.push(sig.framework);
      }
    }
  }

  return detected;
}

function checkPackageJson(projectPath: string, packages: string[]): boolean {
  const pkgPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };
    return packages.some((p) => p in allDeps);
  } catch {
    return false;
  }
}

function checkRequirements(projectPath: string, packages: string[]): boolean {
  const reqPath = path.join(projectPath, "requirements.txt");
  if (!fs.existsSync(reqPath)) return false;

  try {
    const content = fs.readFileSync(reqPath, "utf-8").toLowerCase();
    return packages.some((p) => content.includes(p.toLowerCase()));
  } catch {
    return false;
  }
}

function checkPyproject(projectPath: string, packages: string[]): boolean {
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (!fs.existsSync(pyprojectPath)) return false;

  try {
    const content = fs.readFileSync(pyprojectPath, "utf-8").toLowerCase();
    return packages.some((p) => content.includes(p.toLowerCase()));
  } catch {
    return false;
  }
}
