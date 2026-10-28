import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("MessageReactions", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Messages",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      emoji: {
        type: DataTypes.STRING,
        allowNull: false
      },
      senderId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });

    await queryInterface.addIndex("MessageReactions", ["messageId"], { name: "idx_message_reactions_messageId" });
    await queryInterface.addIndex("MessageReactions", ["emoji"], { name: "idx_message_reactions_emoji" });
    await queryInterface.addIndex("MessageReactions", ["senderId"], { name: "idx_message_reactions_senderId" });
    await queryInterface.addIndex("MessageReactions", ["messageId", "senderId"], { name: "uniq_message_reactions_message_sender", unique: true });
    await queryInterface.addIndex("MessageReactions", ["messageId", "emoji"], { name: "idx_message_reactions_message_emoji" });
  },

  down: async (queryInterface: QueryInterface) => {
    // dropTable se lleva índices y constraints juntos. Borrar primero los índices
    // falla en MySQL/MariaDB: la FK MessageReactions_ibfk_1 (messageId -> Messages)
    // se apoya en idx_message_reactions_messageId, que es el único índice sobre
    // messageId, y el motor no deja eliminarlo mientras la FK exista ->
    // "Cannot drop index 'idx_message_reactions_messageId': needed in a foreign
    // key constraint".
    await queryInterface.dropTable("MessageReactions");
  }
};
