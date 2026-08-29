import path from "node:path";
import { homedir } from "node:os";

function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(homedir(), p.slice(1));
  }
  return path.resolve(p);
}

function getHomedir() {
  return homedir();
}

// Export all function 
export {
  expandPath,
  getHomedir,
}