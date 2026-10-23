const migration = require("../../database/migrations/20261021020000-remove-android-push-support");

const buildQueryInterface = () => ({
  showAllTables: jest.fn(),
  describeTable: jest.fn(),
  dropTable: jest.fn().mockResolvedValue(undefined),
  removeColumn: jest.fn().mockResolvedValue(undefined),
  addColumn: jest.fn().mockResolvedValue(undefined),
  createTable: jest.fn().mockResolvedValue(undefined)
});

describe("retirada de esquema push Android", () => {
  it("elimina la tabla de tokens y la preferencia de usuario", async () => {
    const queryInterface = buildQueryInterface();
    queryInterface.showAllTables.mockResolvedValue(["PushTokens", "Users"]);
    queryInterface.describeTable.mockResolvedValue({
      id: { type: "INTEGER" },
      mobileNotificationsEnabled: { type: "BOOLEAN" }
    });

    await migration.up(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith("PushTokens");
    expect(queryInterface.removeColumn).toHaveBeenCalledWith(
      "Users",
      "mobileNotificationsEnabled"
    );
  });

  it("revierte recreando el esquema vacío", async () => {
    const queryInterface = buildQueryInterface();
    queryInterface.showAllTables.mockResolvedValue([]);
    queryInterface.describeTable.mockResolvedValue({ id: { type: "INTEGER" } });

    await migration.down(queryInterface);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "Users",
      "mobileNotificationsEnabled",
      expect.objectContaining({ allowNull: false, defaultValue: false })
    );
    expect(queryInterface.createTable).toHaveBeenCalledWith(
      "PushTokens",
      expect.objectContaining({
        token: expect.objectContaining({ unique: true }),
        userId: expect.objectContaining({ allowNull: false })
      })
    );
  });
});
