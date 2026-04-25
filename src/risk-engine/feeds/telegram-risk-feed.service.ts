import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatUnknownError } from '../../common/format-unknown-error';

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;

interface TelegramChannelPost {
  readonly chat: { readonly id: number };
  readonly text?: string;
  readonly caption?: string;
}

interface TelegramGetUpdatesResponse {
  readonly ok: boolean;
  readonly result?: ReadonlyArray<{
    readonly update_id: number;
    readonly channel_post?: TelegramChannelPost;
  }>;
  readonly description?: string;
}

/**
 * Collects addresses mentioned in Telegram **channel** posts received by your bot.
 * Add the bot to risk-alert channels; poll `getUpdates` and merge parsed `0x…` addresses.
 *
 * @see https://core.telegram.org/bots/api#getupdates
 */
@Injectable()
export class TelegramRiskFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramRiskFeedService.name);
  private readonly flagged = new Set<string>();
  private lastUpdateId = 0;
  private pollHandle?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.loadStaticAddresses();
  }

  onModuleInit(): void {
    const token = this.configService.get<string | undefined>(
      'telegramBotToken',
    );
    const intervalMs =
      this.configService.get<number>('telegramPollIntervalMs') ?? 0;
    if (token && intervalMs > 0) {
      void this.pollTelegram();
      this.pollHandle = setInterval(() => {
        void this.pollTelegram();
      }, intervalMs);
    } else if (token && intervalMs <= 0) {
      this.logger.log(
        'TELEGRAM_BOT_TOKEN set but TELEGRAM_POLL_INTERVAL_MS is 0 — Telegram polling disabled',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  /** Lowercased EVM addresses flagged via Telegram or static env. */
  getFlaggedAddresses(): ReadonlySet<string> {
    return this.flagged;
  }

  private loadStaticAddresses(): void {
    const list = this.configService.get<readonly string[]>(
      'telegramRiskStaticAddresses',
    );
    for (const raw of list ?? []) {
      const a = raw.trim().toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(a)) {
        this.flagged.add(a);
      }
    }
  }

  private async pollTelegram(): Promise<void> {
    const token = this.configService.get<string | undefined>(
      'telegramBotToken',
    );
    if (!token) {
      return;
    }
    const allowed =
      this.configService.get<ReadonlySet<number>>('telegramAlertChatIds') ??
      new Set<number>();

    const url = new URL(
      `https://api.telegram.org/bot${token}/getUpdates`,
    );
    url.searchParams.set('offset', String(this.lastUpdateId + 1));
    url.searchParams.set('timeout', '0');
    url.searchParams.set(
      'allowed_updates',
      JSON.stringify(['channel_post']),
    );

    try {
      const res = await fetch(url.toString());
      const body = (await res.json()) as TelegramGetUpdatesResponse;
      if (!body.ok || !body.result) {
        this.logger.warn(
          `Telegram getUpdates failed: ${body.description ?? res.status}`,
        );
        return;
      }

      for (const u of body.result) {
        if (u.update_id > this.lastUpdateId) {
          this.lastUpdateId = u.update_id;
        }
        this.ingestChannelPost(u.channel_post, allowed);
      }
    } catch (e: unknown) {
      this.logger.warn(`Telegram poll error: ${formatUnknownError(e)}`);
    }
  }

  private ingestChannelPost(
    post: TelegramChannelPost | undefined,
    allowed: ReadonlySet<number>,
  ): void {
    if (!post) {
      return;
    }
    if (allowed && allowed.size > 0 && !allowed.has(post.chat.id)) {
      return;
    }
    const text = `${post.text ?? ''}\n${post.caption ?? ''}`;
    for (const m of text.matchAll(ADDRESS_REGEX)) {
      this.flagged.add(m[0].toLowerCase());
    }
  }
}
