import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "whatsappId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "whatsappId");
  }
};
