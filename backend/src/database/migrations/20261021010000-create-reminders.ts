import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Reminders", {
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
      title: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      notes: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      dueAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("pending", "done"),
        allowNull: false,
        defaultValue: "pending"
      },
      recurrence: {
        type: DataTypes.ENUM("none", "daily", "weekly", "monthly"),
        allowNull: false,
        defaultValue: "none"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.addIndex("Reminders", ["status", "dueAt"], {
      name: "reminders_status_due_at"
    });
    await queryInterface.addIndex("Reminders", ["dueAt"], {
      name: "reminders_due_at"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("Reminders");
  }
};
