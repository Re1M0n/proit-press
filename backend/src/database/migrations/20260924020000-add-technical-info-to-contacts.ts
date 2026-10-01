import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "technicalHardware", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Contacts", "technicalOperatingSystem", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Contacts", "technicalApplications", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "technicalApplications");
    await queryInterface.removeColumn("Contacts", "technicalOperatingSystem");
    await queryInterface.removeColumn("Contacts", "technicalHardware");
  }
};
