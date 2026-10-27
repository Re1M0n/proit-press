import {
  AllowNull,
  AutoIncrement,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import ClientContact from "./ClientContact";
import Contact from "./Contact";

@Table({ tableName: "Clients" })
class Client extends Model<Client> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  /**
   * Abonado (true) o no abonado (false). Es el estado del cliente, no del
   * contacto: una ficha puede agrupar varios contactos.
   */
  @AllowNull(false)
  @Default(false)
  @Column
  isSubscriber: boolean;

  /** Notas libres: CUIT, tipo de abono y todo lo demás. */
  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Contact, () => ClientContact)
  contacts: Array<Contact & { ClientContact: ClientContact }>;

  @HasMany(() => ClientContact)
  clientContacts: ClientContact[];
}

export default Client;
