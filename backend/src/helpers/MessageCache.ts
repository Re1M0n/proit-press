import Message from "../models/Message";
import CacheService from "../services/CacheService";
import CacheHelper from "./CacheHelper";
import { logger } from "../utils/logger";

interface MessageCacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

class MessageCacheHelper extends CacheHelper {
  protected readonly DEFAULT_TTL = 300;
  private readonly CACHE_PREFIX = "message:";
  private readonly TICKET_MESSAGES_PREFIX = "ticket_messages:";
  private readonly TICKET_MESSAGES_TTL = 180;

  private getCacheKey(identifier: string | number): string {
    return `${this.CACHE_PREFIX}${identifier}`;
  }

  private getTicketMessagesCacheKey(ticketId: number): string {
    return `${this.TICKET_MESSAGES_PREFIX}${ticketId}`;
  }

  async getMessageById(
    messageId: string,
    options: MessageCacheOptions = {}
  ): Promise<Message | null> {
    const cacheKey = this.getCacheKey(messageId);
    return this.getOrSet(cacheKey, () => Message.findByPk(messageId), options);
  }

  cacheTicketMessages(ticketId: number, messages: Message[]): void {
    const cacheKey = this.getTicketMessagesCacheKey(ticketId);
    CacheService.set(cacheKey, messages, this.TICKET_MESSAGES_TTL);

    messages.forEach(message => {
      CacheService.set(
        this.getCacheKey(message.id),
        message,
        this.DEFAULT_TTL
      );
    });

    logger.debug(`Cached ${messages.length} messages for ticket ${ticketId}`);
  }

  getTicketMessagesFromCache(ticketId: number): Message[] | undefined {
    const cacheKey = this.getTicketMessagesCacheKey(ticketId);
    const cached = CacheService.get<Message[]>(cacheKey);

    if (cached) {
      logger.debug(`Retrieved ${cached.length} messages for ticket ${ticketId} from cache`);
    }

    return cached;
  }

  invalidateMessage(messageId: string): void {
    this.delKey(this.getCacheKey(messageId));
  }

  invalidateTicketMessages(ticketId: number): void {
    this.delKey(this.getTicketMessagesCacheKey(ticketId));
  }

  invalidateAll(): void {
    this.delKeysMatching(
      key => key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.TICKET_MESSAGES_PREFIX)
    );
  }

  getCacheStats() {
    return this.getStats(
      key => key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.TICKET_MESSAGES_PREFIX)
    );
  }
}

export default new MessageCacheHelper();
