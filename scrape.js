const fs = require("fs");
const { chromium } = require("playwright");

const URL = process.argv[2];
if (!URL) {
  console.error("Usage: node scrape.js <shared_chat_url>");
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Opening:", URL);
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // Scroll fully
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  await page.waitForSelector('[data-message-author-role]');

  // --- PASS 1: Extract messages + UUIDs from DOM
  const messages = await page.$$eval(
    '[data-message-author-role]',
    nodes =>
      nodes.map((node, index) => {
        const role = node.getAttribute("data-message-author-role");

        const clone = node.cloneNode(true);
        clone.querySelectorAll("button, svg, img").forEach(el => el.remove());

        clone.querySelectorAll("pre").forEach(pre => {
          pre.innerText = "\n```\n" + pre.innerText.trim() + "\n```\n";
        });

        const content = clone.innerText.trim();

        const container = node.closest("[data-message-id]");
        const messageId = container
          ? container.getAttribute("data-message-id")
          : null;

        return {
          role: role === "assistant" ? "assistant" : "user",
          content,
          message_id: messageId,
          index
        };
      }).filter(m => m.content.length > 0)
  );

  console.log(`📊 DOM messages found: ${messages.length}`);

  // --- PASS 2: Get raw script blob
  const rawScript = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script"))
      .map(s => s.textContent)
      .join("\n")
  );

  // --- PASS 3: For each UUID, find timestamp AFTER it
  const timestampRegex = /,(\d+\.\d+),/g;

const mapping = {};

for (const msg of messages) {
  if (!msg.message_id) continue;

  const id = msg.message_id;
  const idx = rawScript.indexOf(id);

  if (idx === -1) continue;

  // 🔥 bigger window + bidirectional
  //const start = Math.max(0, idx - 2000);
  const start = idx
  const end = Math.min(rawScript.length, idx + 2000);
  const slice = rawScript.slice(start, end);

  // 🔥 more flexible timestamp regex
  const tsRegex = /(\d{10}\.\d+)/g;

  let match;
  let bestTs = null;
  let bestDistance = Infinity;

  while ((match = tsRegex.exec(slice)) !== null) {
    const ts = parseFloat(match[1]);

    if (ts < 1600000000 || ts > 2000000000) continue;

    const absolutePos = start + match.index;
    const distance = Math.abs(absolutePos - idx);

    // 🔥 pick closest timestamp to UUID
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTs = ts;
    }
  }

  if (bestTs) {
    mapping[id] = bestTs;
  }
}
  console.log(`📊 UUIDs with timestamps: ${Object.keys(mapping).length}`);

  // --- PASS 4: Attach timestamps
  const finalMessages = messages.map(msg => {
    const ts = mapping[msg.message_id];

    return {
      ...msg,
      timestamp: ts
        ? new Date(ts * 1000).toISOString()
        : `T+${msg.index}`,
      timestamp_unix: ts || null,
      timestamp_source: ts ? "uuid-direct-match" : "fallback"
    };
  });

  // --- Title
  let title = await page.title();
  if (title.startsWith("ChatGPT - ")) {
    title = title.replace("ChatGPT - ", "").trim();
  }
  console.log("Detected title:", title);

  const output = {
    title,
    url: URL,
    exported_at: new Date().toISOString(),
    message_count: finalMessages.length,
    messages: finalMessages
  };

  const filename = `chat_${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));

  console.log(`✅ Saved ${finalMessages.length} messages to ${filename}`);

  const mappedCount = finalMessages.filter(m => m.timestamp_source !== "fallback").length;
  console.log(`📊 Successfully mapped timestamps: ${mappedCount}/${finalMessages.length}`);

  await browser.close();
})();
