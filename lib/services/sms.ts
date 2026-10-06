interface SmsResult {
  success: boolean;
  error?: string;
  code?: string;
}

export async function sendSmsTemplate(
  phone: string,
  code: string,
  templateId: string | undefined,
  templateSettingName: string
): Promise<SmsResult> {
  const apiToken = process.env.SMS_API_TOKEN;
  const apiBaseUrl = process.env.SMS_API_BASE_URL || "https://s.api.ir/api/sw1/SmsOTP";
  const missingSettings = [
    !apiToken && "SMS_API_TOKEN",
    !templateId && templateSettingName,
  ].filter(Boolean);

  if (missingSettings.length > 0) {
    console.error(`SMS API configuration missing: ${missingSettings.join(", ")}`);
    return {
      success: false,
      error: "SMS service not configured",
      code: "SMS_NOT_CONFIGURED",
    };
  }

  try {
    const response = await fetch(apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        mobile: phone,
        code,
        template: templateId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SMS API HTTP error:", response.status, errorText);
      return { success: false, error: `SMS API returned status ${response.status}` };
    }

    let responseData: { success?: boolean; error?: string };
    try {
      responseData = await response.json();
    } catch (error) {
      console.error("SMS API response parse error:", error);
      return { success: false, error: "Invalid response from SMS API" };
    }

    if (responseData.success !== true) {
      console.error("SMS API returned failure:", responseData);
      return { success: false, error: responseData.error || "SMS sending failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("SMS API request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
