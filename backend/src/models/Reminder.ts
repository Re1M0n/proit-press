import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import User from "./User";

export type ReminderStatus = "pending" | "done";
export type ReminderRecurrence = "none" | "daily" | "weekly" | "monthly";

@Table
class Reminder extends Model<Reminder> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: number;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  })
  user: User;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  title: string;

  @AllowNull(true)
  @Column(DataType.STRING(150))
  notes: string | null;

  @AllowNull(false)
  @Column(DataType.DATE)
  dueAt: Date;

  @Default("pending")
  @AllowNull(false)
  @Column(DataType.ENUM("pending", "done"))
  status: ReminderStatus;

  @Default("none")
  @AllowNull(false)
  @Column(DataType.ENUM("none", "daily", "weekly", "monthly"))
  recurrence: ReminderRecurrence;

  @ForeignKey(() => Ticket)
  @AllowNull(true)
  @Column
  ticketId: number | null;

  @BelongsTo(() => Ticket, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  })
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @AllowNull(true)
  @Column
  contactId: number | null;

  @BelongsTo(() => Contact, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  })
  contact: Contact;

  @AllowNull(true)
  @Column(DataType.DATE)
  notifiedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Reminder;
