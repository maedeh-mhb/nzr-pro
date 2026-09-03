async function notifySitemapFailure(section, error) {
  const webhookUrl = process.env.SITEMAP_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const message = error instanceof Error ? error.message : String(error);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Sitemap generation failed for ${section}: ${message}`,
      type: "sitemap_generation_error",
      section,
      environment: process.env.NODE_ENV || "production",
    }),
  });

  if (!response.ok) {
    throw new Error(`Sitemap alert webhook returned ${response.status}`);
  }
}

module.exports = { notifySitemapFailure };
