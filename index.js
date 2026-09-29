
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => {
  res.send("Shinsuke AI Bot is running!");
});

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.verify_token"] === VERIFY_TOKEN &&
    req.query["hub.mode"] === "subscribe"
  ) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const messages =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages || [];

    for (const msg of messages) {
      if (msg.type !== "text") continue;

      const sender = msg.from;
      const question = msg.text.body;

      const answer = await openai.responses.create({
        model: "gpt-5",
        input: question
      });

      const reply =
        answer.output_text || "Sorry, try again.";

      await fetch(
        `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: sender,
            type: "text",
            text: { body: reply.slice(0, 4000) }
          })
        }
      );
    }
  } catch (error) {
    console.error(error);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinsuke AI is online");
});
