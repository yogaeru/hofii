import * as clack from "@clack/prompts";
import { runScan } from "#/core/detect";

export async function scanCommand() {
  clack.intro("🔍 Scanning system");

  const spinner = clack.spinner();
  spinner.start("Detecting environment...");

  const result = await runScan();

  spinner.stop("Environment detected");

  clack.note(
    [
      `OS               ${result.osName} (${result.osId})`,
      `Package Manager  ${result.packageManager}`,
      result.aurHelper ? `AUR Helper       ${result.aurHelper}` : null,
      `Flatpak          ${result.flatpak ? "Enabled" : "Disabled"}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "System Environment",
    {
      withGuide: true
    }
  );

  clack.outro("Scan completed");

  return result;
}
