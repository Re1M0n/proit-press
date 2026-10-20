import fs from "fs";
import path from "path";

export interface ChromiumProcessInfo {
  pid: number;
  parentPid: number;
  uid: number;
  startTime: string;
  command: string;
  userDataDir: string | undefined;
}

export interface ChromiumProcessInspector {
  listByUserDataDir: (profilePath: string) => Promise<ChromiumProcessInfo[]>;
  inspect: (pid: number) => Promise<ChromiumProcessInfo | undefined>;
  hasLivePressTicketOwner: (pid: number) => Promise<boolean>;
  signal: (pid: number, signal: "SIGTERM" | "SIGKILL") => void;
  waitForExit: (pid: number, timeoutMs: number) => Promise<boolean>;
}

const isBrowserRoot = (command: string): boolean => {
  const args = command.split(/\s+/);
  const executable = path.basename(args[0] || "");
  const isChrome = ["chrome", "chromium", "chromium-browser"].includes(
    executable
  );
  const processType = args.find(arg => arg.startsWith("--type="));
  return isChrome && (!processType || processType === "--type=browser");
};

const sameProcess = (
  expected: ChromiumProcessInfo,
  actual: ChromiumProcessInfo | undefined,
  expectedUserDataDir: string,
  expectedUid: number
): actual is ChromiumProcessInfo =>
  Boolean(
    actual &&
      actual.pid === expected.pid &&
      actual.startTime === expected.startTime &&
      actual.uid === expectedUid &&
      actual.userDataDir === expectedUserDataDir &&
      actual.command === expected.command
  );

export const cleanupOrphanChromium = async (
  expectedUserDataDir: string,
  expectedUid: number,
  inspector: ChromiumProcessInspector
): Promise<"clean" | "terminated" | "ambiguous"> => {
  const candidates = await inspector.listByUserDataDir(expectedUserDataDir);
  if (candidates.length === 0) {
    return "clean";
  }
  if (candidates.length !== 1) {
    return "ambiguous";
  }

  const candidate = candidates[0];
  if (
    candidate.uid !== expectedUid ||
    candidate.userDataDir !== expectedUserDataDir ||
    !isBrowserRoot(candidate.command)
  ) {
    return "ambiguous";
  }

  const beforeSignal = await inspector.inspect(candidate.pid);
  if (
    !sameProcess(candidate, beforeSignal, expectedUserDataDir, expectedUid) ||
    (await inspector.hasLivePressTicketOwner(candidate.pid))
  ) {
    return "ambiguous";
  }

  inspector.signal(candidate.pid, "SIGTERM");
  if (await inspector.waitForExit(candidate.pid, 5000)) {
    return "terminated";
  }

  const beforeKill = await inspector.inspect(candidate.pid);
  if (
    !sameProcess(candidate, beforeKill, expectedUserDataDir, expectedUid) ||
    (await inspector.hasLivePressTicketOwner(candidate.pid))
  ) {
    return "ambiguous";
  }

  inspector.signal(candidate.pid, "SIGKILL");
  return (await inspector.waitForExit(candidate.pid, 1000))
    ? "terminated"
    : "ambiguous";
};

const parseProcessStartTime = (stat: string): string | undefined => {
  const closingParen = stat.lastIndexOf(")");
  if (closingParen < 0) {
    return undefined;
  }

  const fieldsAfterCommand = stat
    .slice(closingParen + 1)
    .trim()
    .split(/\s+/);
  return fieldsAfterCommand[19];
};

const parseUserDataDir = (args: string[]): string | undefined => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--user-data-dir") {
      return args[index + 1];
    }
    if (arg.startsWith("--user-data-dir=")) {
      return arg.slice("--user-data-dir=".length);
    }
  }

  // Chrome can rewrite argv[0] to the full command line; support that format too.
  const command = args.join(" ");
  const match = command.match(
    /(?:^|\s)--user-data-dir=(?:"([^"]+)"|'([^']+)'|([^\s]+))/
  );
  return match?.[1] || match?.[2] || match?.[3];
};

const readProcInfo = (
  pid: number,
  expectedUid?: number
): ChromiumProcessInfo | undefined => {
  try {
    const procPath = `/proc/${pid}`;
    const status = fs.readFileSync(path.join(procPath, "status"), "utf8");
    const uidMatch = status.match(/^Uid:\s+(\d+)/m);
    if (!uidMatch) {
      throw new Error(`No se pudo verificar el UID del proceso ${pid}`);
    }
    const [, uidValue] = uidMatch;
    const uid = Number(uidValue);
    if (expectedUid !== undefined && uid !== expectedUid) {
      return undefined;
    }

    const rawCommand = fs.readFileSync(path.join(procPath, "cmdline"), "utf8");
    const args = rawCommand.split("\0").filter(Boolean);
    const command = args.join(" ");
    const stat = fs.readFileSync(path.join(procPath, "stat"), "utf8");
    const parentMatch = stat.match(/\)\s+\S+\s+(\d+)\s/);
    const startTime = parseProcessStartTime(stat);
    if (!parentMatch || !startTime) {
      throw new Error(`No se pudo verificar la identidad del proceso ${pid}`);
    }

    return {
      pid,
      parentPid: Number(parentMatch[1]),
      uid,
      startTime,
      command,
      userDataDir: parseUserDataDir(args)
    };
  } catch (error) {
    // The process can exit between listing /proc and reading its metadata.
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT" || code === "ESRCH") {
      return undefined;
    }
    throw error;
  }
};

const isBrowserRootInfo = (info: ChromiumProcessInfo): boolean =>
  info.userDataDir !== undefined && isBrowserRoot(info.command);

export const createLinuxChromiumProcessInspector = (
  backendDirectory = process.cwd(),
  serviceUid = process.getuid()
): ChromiumProcessInspector => {
  if (process.platform !== "linux") {
    throw new Error("Chromium orphan inspection is supported only on Linux");
  }

  const backendEntryPoint = path.join(backendDirectory, "dist", "server.js");

  return {
    listByUserDataDir: async profilePath => {
      const matches: ChromiumProcessInfo[] = [];
      fs.readdirSync("/proc")
        .filter(entry => /^\d+$/.test(entry))
        .forEach(entry => {
          const info = readProcInfo(Number(entry), serviceUid);
          if (
            info &&
            info.userDataDir === profilePath &&
            isBrowserRootInfo(info)
          ) {
            matches.push(info);
          }
        });
      return matches;
    },
    inspect: async pid => readProcInfo(pid, serviceUid),
    hasLivePressTicketOwner: async pid => {
      const visit = async (
        processId: number,
        visited: Set<number>
      ): Promise<boolean> => {
        const info = readProcInfo(processId, serviceUid);
        if (!info || info.parentPid <= 1 || visited.has(info.parentPid)) {
          return false;
        }

        visited.add(info.parentPid);
        const parent = readProcInfo(info.parentPid, serviceUid);
        if (!parent) {
          return false;
        }

        const args = parent.command.split(/\s+/);
        const executable = path.basename(args[0] || "");
        const isNode = executable === "node" || executable.startsWith("node-");
        let parentWorkingDirectory = "";
        try {
          parentWorkingDirectory = fs.readlinkSync(`/proc/${parent.pid}/cwd`);
        } catch {
          parentWorkingDirectory = "";
        }
        if (
          isNode &&
          (args.includes(backendEntryPoint) ||
            (args.includes("dist/server.js") &&
              parentWorkingDirectory === backendDirectory))
        ) {
          return true;
        }

        return visit(parent.pid, visited);
      };

      return visit(pid, new Set<number>([pid]));
    },
    signal: (pid, signal) => {
      process.kill(pid, signal);
    },
    waitForExit: async (pid, timeoutMs) => {
      const waitUntil = async (deadline: number): Promise<boolean> => {
        if (!fs.existsSync(`/proc/${pid}`)) {
          return true;
        }
        readProcInfo(pid, serviceUid);
        if (Date.now() >= deadline) {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return waitUntil(deadline);
      };

      return waitUntil(Date.now() + timeoutMs);
    }
  };
};
