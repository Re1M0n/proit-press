import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) =>
    queryInterface.addColumn("Users", "mobileNotificationsEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }),

  down: (queryInterface: QueryInterface) =>
    queryInterface.removeColumn("Users", "mobileNotificationsEnabled")
};
