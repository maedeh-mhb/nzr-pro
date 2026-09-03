const { notifySitemapFailure } = require("../sitemapAlert");

describe("notifySitemapFailure", () => {
  const originalWebhook = process.env.SITEMAP_ALERT_WEBHOOK_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalWebhook === undefined) delete process.env.SITEMAP_ALERT_WEBHOOK_URL;
    else process.env.SITEMAP_ALERT_WEBHOOK_URL = originalWebhook;
    global.fetch = originalFetch;
  });

  it("does nothing when alerts are not configured", async () => {
    delete process.env.SITEMAP_ALERT_WEBHOOK_URL;
    global.fetch = jest.fn();

    await notifySitemapFailure("products", new Error("database unavailable"));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts structured failure details when configured", async () => {
    process.env.SITEMAP_ALERT_WEBHOOK_URL = "https://alerts.example.test/webhook";
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await notifySitemapFailure("articles", new Error("query failed"));

    expect(global.fetch).toHaveBeenCalledWith(
      process.env.SITEMAP_ALERT_WEBHOOK_URL,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        type: "sitemap_generation_error",
        section: "articles",
        text: expect.stringContaining("query failed"),
      })
    );
  });

  it("rejects failed webhook responses", async () => {
    process.env.SITEMAP_ALERT_WEBHOOK_URL = "https://alerts.example.test/webhook";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(notifySitemapFailure("products", "query failed")).rejects.toThrow("503");
  });
});
