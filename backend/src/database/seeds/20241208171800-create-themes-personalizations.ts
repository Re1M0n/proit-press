import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.bulkInsert(
      "Personalizations",
      [
        {
          theme: "light",
          company: "ProIT CRM",
          url: "https://github.com/Re1M0n/proit-press",
          primaryColor: "#059669",
          secondaryColor: "#A7F3D0",
          backgroundDefault: "#FFFFFF",
          backgroundPaper: "#F7F7F7",
          toolbarColor: "#059669",
          toolbarIconColor: "#FFFFFF",
          menuItens: "#FFFFFF",
          sub: "#F7F7F7",
          textPrimary: "#000000",
          textSecondary: "#333333",
          divide: "#E0E0E0",
          favico: null,
          logo: null,
          logoTicket: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          theme: "dark",
          primaryColor: "#34D399",
          secondaryColor: "#6EE7B7",
          backgroundDefault: "#2E2E3A",
          backgroundPaper: "#383850",
          toolbarColor: "#34D399",
          toolbarIconColor: "#FFFFFF",
          menuItens: "#181D22",
          sub: "#383850",
          textPrimary: "#FFFFFF",
          textSecondary: "#CCCCCC",
          divide: "#2E2E3A",
          favico: null,
          logo: null,
          logoTicket: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Personalizations", {});
  }
};
