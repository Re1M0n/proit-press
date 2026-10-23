import { DataTypes, QueryInterface } from "sequelize";

const tableExists = async (
  queryInterface: QueryInterface,
  tableName: string
): Promise<boolean> => {
  const tables = await queryInterface.showAllTables();
  return tables.some(table => {
    const name = String(table).split(".").pop();
    return name?.toLowerCase() === tableName.toLowerCase();
  });
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, "PushTokens")) {
      await queryInterface.dropTable("PushTokens");
    }

    const userColumns = (await queryInterface.describeTable(
      "Users"
    )) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(userColumns, "mobileNotificationsEnabled")) {
      await queryInterface.removeColumn("Users", "mobileNotificationsEnabled");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const userColumns = (await queryInterface.describeTable(
      "Users"
    )) as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(userColumns, "mobileNotificationsEnabled")) {
      await queryInterface.addColumn("Users", "mobileNotificationsEnabled", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!(await tableExists(queryInterface, "PushTokens"))) {
      await queryInterface.createTable("PushTokens", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        token: {
          type: DataTypes.STRING(512),
          allowNull: false,
          unique: true
        },
        platform: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "android"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });
    }
  }
};
