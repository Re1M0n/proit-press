import {
  AllowNull,
  AutoIncrement,
  BelongsToMany,
  Column,
  CreatedAt,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt
} from "sequelize-typescript";
import ContactCustomField from "./ContactCustomField";
import ContactTag from "./ContactTag";
import Tag from "./Tag";
import Ticket from "./Ticket";

@Table
class Contact extends Model<Contact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @AllowNull(true)
  @Unique
  @Column
  number: string;

  @AllowNull(true)
  @Default("")
  @Column
  address: string;

  @AllowNull(true)
  @Default("")
  @Column
  email: string;

  @AllowNull(true)
  @Column
  birthdate: Date;

  @AllowNull(true)
  @Default("")
  @Column
  gender: string;

  @AllowNull(true)
  @Default("")
  @Column
  status: string;

  @AllowNull(true)
  @Column
  lastContactAt: Date;

  @AllowNull(true)
  @Column
  whatsappId: number;

  @AllowNull(true)
  @Default("")
  @Column
  country: string;

  @AllowNull(true)
  @Default("")
  @Column
  zip: string;

  @AllowNull(true)
  @Default("")
  @Column
  addressNumber: string;

  @AllowNull(true)
  @Default("")
  @Column
  addressComplement: string;

  @AllowNull(true)
  @Default("")
  @Column
  neighborhood: string;

  @AllowNull(true)
  @Default("")
  @Column
  city: string;

  @AllowNull(true)
  @Default("")
  @Column
  state: string;

  @AllowNull(true)
  @Default("")
  @Column
  cpf: string;

  @Column
  profilePicUrl: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @Default(false)
  @Column
  nameManuallyEdited: boolean;

  /**
   * Como o sistema trata as mensagens recebidas deste contato:
   * "normal"  -> fluxo completo (cria/atualiza ticket, conta como não lida)
   * "silent"  -> recebe e guarda no histórico, mas sem contador de não lidas
   * "ignore"  -> descarta a mensagem (não cria ticket e não grava no histórico)
   */
  @AllowNull(false)
  @Default("normal")
  @Column
  messageHandling: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @Column
  messengerId: string;

  @Column
  instagramId: string;

  @Column
  telegramId: string;

  @Column
  webchatId: string;

  @BelongsToMany(() => Tag, () => ContactTag)
  tags: Array<Tag & { ContactTag: ContactTag }>;

  @HasMany(() => ContactCustomField)
  extraInfo: ContactCustomField[];
}

export default Contact;
