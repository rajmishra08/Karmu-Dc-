
const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const API_VERSION = process.env.GRAPH_API_VERSION;

app.get("/", (req, res) => {
  res.status(200).send("Karmu DC Messenger Bot is online");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

function getReply(text) {
  const command = text.trim().toLowerCase();

  const replies = {
    "!help": "Commands:\n!help\n!menu\n!info\n!ping",
    "!menu": "===== KARMU DC BOT =====\n!help - Commands\n!info - Bot info\n!ping - Check status",
    "!info": "Karmu DC Messenger Bot\nVersion: 1.0.0",
    "!ping": "Pong! Bot is online."
  };

  return replies[command] ||
    "Unknown command. Type !help to see commands.";
}

app.post("/webhook", (req, res) => {
  // Acknowledge Meta's webhook quickly.
  res.sendStatus(200);

  if (req.body.object !== "page") return;

  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {
      if (event.message?.is_echo) continue;
      if (!event.message?.text || !event.sender?.id) continue;

      const text = event.message.text.trim();

      // Process only bot commands.
      if (!text.startsWith("!")) continue;

      sendReply(event.sender.id, getReply(text))
        .catch(error => {
          console.error("Reply failed:", error.message);
        });
    }
  }
});

async function sendReply(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN || !API_VERSION) {
    throw new Error("Messenger environment variables are missing");
  }

  const url =
    `https://graph.facebook.com/${API_VERSION}/me/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Karmu DC bot server started");
});
        
