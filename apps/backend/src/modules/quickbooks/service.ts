import { MedusaService } from "@medusajs/framework/utils"

import QbConnection from "./models/qb-connection"
import QbSyncRecord from "./models/qb-sync-record"

export type QuickBooksOptions = {
  clientId?: string
  clientSecret?: string
  environment?: "sandbox" | "production"
  redirectUri?: string
  /** Secret used to encrypt stored OAuth tokens. */
  encryptionKey?: string
}

class QuickBooksModuleService extends MedusaService({ QbConnection, QbSyncRecord }) {
  protected readonly options_: QuickBooksOptions

  constructor(container: Record<string, unknown>, options: QuickBooksOptions = {}) {
    super(container, options)
    this.options_ = options
  }

  async getOptions(): Promise<QuickBooksOptions> {
    return this.options_
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
