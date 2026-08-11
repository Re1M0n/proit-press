import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Messages", "remoteJid", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Messages", "remoteJid");
  }
};
