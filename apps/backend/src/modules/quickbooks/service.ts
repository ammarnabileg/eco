import { MedusaService } from "@medusajs/framework/utils"

import { readIntegration, settingsKey } from "../integrations/store"
import QbConnection from "./models/qb-connection"
import QbSyncRecord from "./models/qb-sync-record"
import QbWebhookEvent from "./models/qb-webhook-event"

export type QuickBooksOptions = {
  clientId?: string
  clientSecret?: string
  environment?: "sandbox" | "production"
  redirectUri?: string
  /** Secret used to encrypt stored OAuth tokens. */
  encryptionKey?: string
  /** Verifier token of the app's webhook (Intuit dashboard > Webhooks). */
  webhookVerifier?: string
}

class QuickBooksModuleService extends MedusaService({ QbConnection, QbSyncRecord, QbWebhookEvent }) {
  protected readonly options_: QuickBooksOptions
  private readonly pg_: Parameters<typeof readIntegration>[0]

  constructor(container: Record<string, unknown>, options: QuickBooksOptions = {}) {
    super(container, options)
    this.options_ = options
    this.pg_ = container.__pg_connection__ as Parameters<typeof readIntegration>[0]
  }

  /**
   * App keys from the admin's integrations settings (or the environment).
   * Switched off or incomplete there means "not configured".
   */
  async getOptions(): Promise<QuickBooksOptions> {
    const settings = await readIntegration(this.pg_, "quickbooks")
    const v = settings.values
    return {
      ...this.options_,
      clientId: settings.active ? (v.client_id as string) : undefined,
      clientSecret: settings.active ? (v.client_secret as string) : undefined,
      environment: v.environment === "production" ? "production" : "sandbox",
      encryptionKey: this.options_.encryptionKey || settingsKey(),
      webhookVerifier: (v.webhook_verifier as string | undefined) || undefined,
    }
  }

  async getConnection() {
    const [row] = await this.listQbConnections({}, { take: 1 })
    return row ?? null
  }

  async findRecord(entity: string, localId: string) {
    const [row] = await this.listQbSyncRecords({ entity: entity as never, local_id: localId }, { take: 1 })
    return row ?? null
  }
}

export default QuickBooksModuleService
