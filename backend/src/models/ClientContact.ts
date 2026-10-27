import {
  AutoIncrement,
  Column,
  CreatedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Client from "./Client";
import Contact from "./Contact";

@Table({ tableName: "ClientContacts" })
class ClientContact extends Model<ClientContact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Client)
  @Column
  clientId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ClientContact;
