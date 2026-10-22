import { readTrackToken, signTrackToken, TRACK_TOKEN_TTL_MS } from "../token"

describe("track-order token", () => {
  const now = Date.UTC(2026, 0, 1)

  it("grants the signed order until it expires", () => {
    const { token } = signTrackToken("order_1", "s3cret", now)
    expect(readTrackToken(token, "s3cret", now + 1000)).toBe("order_1")
    expect(readTrackToken(token, "s3cret", now + TRACK_TOKEN_TTL_MS + 1)).toBeNull()
  })

  it("rejects other secrets, edits and junk", () => {
    const { token } = signTrackToken("order_1", "s3cret", now)
    expect(readTrackToken(token, "other", now)).toBeNull()
    const [, sig] = token.split(".")
    const forged = Buffer.from(JSON.stringify({ o: "order_2", e: now + 9e9 })).toString("base64url")
    expect(readTrackToken(`${forged}.${sig}`, "s3cret", now)).toBeNull()
    expect(readTrackToken("", "s3cret", now)).toBeNull()
    expect(readTrackToken("a.b.c", "s3cret", now)).toBeNull()
  })
})
