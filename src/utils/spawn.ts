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
  const proc = Bun.spawn(cmd, {
    stdin: opt.stdin,
    stdout: opt.stdout,
    stderr: opt.stderr,
  });

  const stdoutPromise =
    opt.stdout === "pipe" ? new Response(proc.stdout).text() : undefined;
  
  const stderrPromise =
    opt.stderr === "pipe" ? new Response(proc.stderr).text() : undefined;
  
 const exitCodePromise = proc.exited;

  const [stdout, stderr, exitCode] = await Promise.all([
    stdoutPromise,
    stderrPromise,
    exitCodePromise,
  ]);

  if (exitCode !== 0) {
    throw new Error(errMsg ?? `Error caused with exit code ${exitCode}`);
  }

  return { stdout, stderr, exitCode };
}
