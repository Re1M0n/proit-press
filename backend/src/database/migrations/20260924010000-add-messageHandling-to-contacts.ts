import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "messageHandling", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "normal"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "messageHandling");
  }
};
