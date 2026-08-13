import Contact from "../models/Contact";
import CacheService from "../services/CacheService";
import CacheHelper from "./CacheHelper";
import { logger } from "../utils/logger";

interface ContactCacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

class ContactCacheHelper extends CacheHelper {
  protected readonly DEFAULT_TTL = 600;
  private readonly CACHE_PREFIX = "contact:";

  private getCacheKey(identifier: string | number): string {
    return `${this.CACHE_PREFIX}${identifier}`;
  }

  async getContactById(
    contactId: number,
    options: ContactCacheOptions = {}
  ): Promise<Contact | null> {
    const cacheKey = this.getCacheKey(contactId);
    return this.getOrSet(cacheKey, () => Contact.findByPk(contactId), options);
  }

  async getContactByNumber(
    number: string,
    options: ContactCacheOptions = {}
  ): Promise<Contact | null> {
    const cacheKey = this.getCacheKey(`number:${number}`);
    const contact = await this.getOrSet(
      cacheKey,
      () => Contact.findOne({ where: { number } }),
      options
    );

    if (contact) {
      CacheService.set(this.getCacheKey(contact.id), contact, this.DEFAULT_TTL);
      logger.debug(`Contact with number ${number} cached`);
    }

    return contact;
  }

  invalidateContact(contactId: number): void {
    this.delKey(this.getCacheKey(contactId));
  }

  invalidateContactByNumber(number: string): void {
    this.delKey(this.getCacheKey(`number:${number}`));
  }

  invalidateAll(): void {
    this.delKeysMatching(key => key.startsWith(this.CACHE_PREFIX));
  }

  async warmupCache(contactIds: number[]): Promise<void> {
    logger.info(`Warming up cache for ${contactIds.length} contacts`);

    const contacts = await Contact.findAll({
      where: { id: contactIds }
    });

    contacts.forEach(contact => {
      CacheService.set(this.getCacheKey(contact.id), contact, this.DEFAULT_TTL);
      if (contact.number) {
        CacheService.set(
          this.getCacheKey(`number:${contact.number}`),
          contact,
          this.DEFAULT_TTL
        );
      }
    });

    logger.info(`Cache warmed up with ${contacts.length} contacts`);
  }

  getCacheStats() {
    return this.getStats(key => key.startsWith(this.CACHE_PREFIX));
  }
}

export default new ContactCacheHelper();
