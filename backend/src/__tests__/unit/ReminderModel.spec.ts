import sequelize from "../../database";
import Reminder from "../../models/Reminder";

describe("Reminder model registration", () => {
  it("registers nullable foreign keys with explicit Sequelize types", () => {
    expect(sequelize.models.Reminder).toBe(Reminder);
    expect(Reminder.rawAttributes.ticketId.type).toBeDefined();
    expect(Reminder.rawAttributes.contactId.type).toBeDefined();
    expect(Reminder.rawAttributes.notifiedAt.type).toBeDefined();
  });
});
