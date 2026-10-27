import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(
        "Clients",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          name: { type: DataTypes.STRING, allowNull: false },
          isSubscriber: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          notes: { type: DataTypes.TEXT, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        },
        { transaction }
      );

      await queryInterface.createTable(
        "ClientContacts",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          clientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Clients", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          contactId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        },
        { transaction }
      );

      await queryInterface.addIndex("ClientContacts", ["clientId", "contactId"], {
        unique: true,
        name: "client_contacts_client_contact_unique",
        transaction
      });

      await queryInterface.addIndex("ClientContacts", ["contactId"], {
        name: "client_contacts_contact",
        transaction
      });

      await queryInterface.addColumn(
        "Contacts",
        "contactType",
        {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "client"
        },
        { transaction }
      );

      await queryInterface.addIndex("Contacts", ["contactType"], {
        name: "contacts_contact_type",
        transaction
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("Contacts", "contacts_contact_type", {
        transaction
      });
      await queryInterface.removeColumn("Contacts", "contactType", { transaction });
      await queryInterface.dropTable("ClientContacts", { transaction });
      await queryInterface.dropTable("Clients", { transaction });
    });
  }
};
