import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createYocoWebhook() {
  const token = process.env.YOCO_SECRET_KEY;

  if (!token) {
    throw new Error("YOCO_SECRET_KEY is not set");
  }

  const endpoint = "https://payments.yoco.com/api/webhooks";

   const payload = {
    name: "Funkful Payment Webhook",
    url: "https://funkful.co.za/api/webhooks/yoco",
  };

  console.log(`Creating Yoco webhook via ${endpoint}`);
  console.log("Webhook URL:", payload.url);

  console.log(`Creating Yoco webhook via ${endpoint}`);

  const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("Yoco webhook creation failed:");
    console.error(data);
    process.exit(1);
  }

  console.log("Yoco webhook created successfully:");
  console.log(JSON.stringify(data, null, 2));
}

createYocoWebhook().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

