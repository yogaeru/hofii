import { execa } from "execa";

type Options = "ignore" | "pipe" | "inherit";

interface SpawnOptions {
  cmd: string[];
  errMsg?: string;
  opt?: {
    stdin?: Exclude<Options, "pipe">;
    stdout?: Options;
    stderr?: Options;
  };
}

export async function spawn({
  cmd,
  errMsg,
  opt = {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
}: SpawnOptions) {
  try {
    const result = await execa(cmd[0]!, cmd.slice(1), {
      stdin: opt.stdin,
      stdout: opt.stdout,
      stderr: opt.stderr,
      reject: true,
    });
    return {
      stdout: opt.stdout === "pipe" ? result.stdout : undefined,
      stderr: opt.stderr === "pipe" ? result.stderr : undefined,
      exitCode: result.exitCode,
    };
  } catch (error) {
    if (error instanceof Error && errMsg) {
      throw new Error(`${errMsg}: ${error.message}`, { cause: error });
    }
    throw error;
  }
}
