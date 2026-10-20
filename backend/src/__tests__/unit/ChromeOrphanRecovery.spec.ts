import {
  cleanupOrphanChromium,
  ChromiumProcessInfo,
  ChromiumProcessInspector
} from "../../libs/ChromeOrphanRecovery";

const processInfo = (
  overrides: Partial<ChromiumProcessInfo> = {}
): ChromiumProcessInfo => ({
  pid: 812,
  parentPid: 1,
  uid: 1001,
  startTime: "123456",
  command: "/opt/google/chrome/chrome --user-data-dir=/srv/session-4",
  userDataDir: "/srv/session-4",
  ...overrides
});

const inspectorFor = (
  process: ChromiumProcessInfo | undefined,
  overrides: Partial<ChromiumProcessInspector> = {}
): ChromiumProcessInspector => ({
  listByUserDataDir: jest.fn(async () => (process ? [process] : [])),
  inspect: jest.fn(async () => process),
  hasLivePressTicketOwner: jest.fn(async () => false),
  signal: jest.fn(),
  waitForExit: jest.fn(async () => true),
  ...overrides
});

describe("cleanupOrphanChromium", () => {
  it("no hace nada si no hay Chromium con ese perfil", async () => {
    const inspector = inspectorFor(undefined);

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("clean");
    expect(inspector.signal).not.toHaveBeenCalled();
  });

  it("no termina un proceso cuyo propietario Press-Ticket sigue vivo", async () => {
    const inspector = inspectorFor(processInfo(), {
      hasLivePressTicketOwner: jest.fn(async () => true)
    });

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("ambiguous");
    expect(inspector.signal).not.toHaveBeenCalled();
  });

  it("termina con SIGTERM el proceso huérfano exacto del usuario de servicio", async () => {
    const process = processInfo();
    const inspector = inspectorFor(process);

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("terminated");
    expect(inspector.signal).toHaveBeenCalledTimes(1);
    expect(inspector.signal).toHaveBeenCalledWith(812, "SIGTERM");
  });

  it("no escala a SIGKILL si el PID ahora apunta a otro proceso", async () => {
    const original = processInfo();
    const reusedPid = processInfo({
      startTime: "999999",
      userDataDir: "/srv/other-session",
      command: "/opt/google/chrome/chrome --user-data-dir=/srv/other-session"
    });
    const inspect = jest
      .fn()
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(reusedPid);
    const inspector = inspectorFor(original, {
      inspect,
      waitForExit: jest.fn(async () => false)
    });

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("ambiguous");
    expect(inspector.signal).toHaveBeenCalledTimes(1);
    expect(inspector.signal).toHaveBeenCalledWith(812, "SIGTERM");
  });

  it("escala a SIGKILL solo después de verificar nuevamente el mismo proceso", async () => {
    const process = processInfo();
    const inspect = jest
      .fn()
      .mockResolvedValueOnce(process)
      .mockResolvedValueOnce(process);
    const waitForExit = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const inspector = inspectorFor(process, { inspect, waitForExit });

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("terminated");
    expect(inspector.signal).toHaveBeenNthCalledWith(1, 812, "SIGTERM");
    expect(inspector.signal).toHaveBeenNthCalledWith(2, 812, "SIGKILL");
  });

  it("no termina un renderer aunque comparta el perfil", async () => {
    const inspector = inspectorFor(
      processInfo({
        command:
          "/opt/google/chrome/chrome --type=renderer --user-data-dir=/srv/session-4"
      })
    );

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("ambiguous");
    expect(inspector.signal).not.toHaveBeenCalled();
  });

  it("rechaza una coincidencia de perfil cuyo UID no sea el esperado", async () => {
    const inspector = inspectorFor(processInfo({ uid: 2002 }));

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).resolves.toBe("ambiguous");
    expect(inspector.signal).not.toHaveBeenCalled();
  });

  it("falla cerrado si no puede inventariar los procesos", async () => {
    const inspector = inspectorFor(undefined, {
      listByUserDataDir: jest.fn().mockRejectedValue(new Error("EACCES"))
    });

    await expect(
      cleanupOrphanChromium("/srv/session-4", 1001, inspector)
    ).rejects.toThrow("EACCES");
    expect(inspector.signal).not.toHaveBeenCalled();
  });
});
