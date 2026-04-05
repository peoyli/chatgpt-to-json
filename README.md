# ChatGPT Shared Conversation Scraper

A Node.js script that extracts shared ChatGPT conversations with proper metadata, including message timestamps, and saves them to JSON format.

## Features

- **Extracts complete conversations** from shared ChatGPT links
- **Captures message timestamps** by matching UUIDs in the DOM with timestamps in the script content
- **Preserves code blocks** with proper formatting
- **Handles scrolling** to load all messages in long conversations
- **Outputs clean JSON** with structured metadata

## Requirements

- Node.js 14+
- Playwright (automatically installed via `npm install`)

## Installation

1. Clone or download the script
```bash
git clone https://github.com/peoyli/chatgpt-to-json.git
```

2. Install dependencies and Chromium (Playwright will be automatically installed):
```bash
# Install dependencies
npm install

# Install Chromium browser
npm run install-browsers
```

## Usage

```bash
node scrape.js <shared_chat_url>
```

Example:
```bash
node scrape.js https://chatgpt.com/share/12345678-1234-1234-1234-123456789012
```

## Output

The script generates a JSON file with the following structure:

```json
{
  "title": "Conversation Title",
  "url": "https://chatgpt.com/share/...",
  "exported_at": "2023-12-07T10:30:00.000Z",
  "message_count": 14,
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?",
      "message_id": "12345678-1234-1234-1234-123456789012",
      "index": 0,
      "timestamp": "2023-12-07T10:15:30.000Z",
      "timestamp_unix": 1701944130.123,
      "timestamp_source": "uuid-direct-match"
    }
  ]
}
```

## How It Works

1. **DOM Extraction**: Scrapes message content, roles, and UUIDs from the webpage
2. **Script Analysis**: Parses the React Router context to find timestamps
3. **UUID-Timestamp Matching**: Associates each message UUID with its corresponding timestamp
4. **Fallback Handling**: Uses synthetic timestamps when direct matching fails
5. **JSON Export**: Saves the structured data to a timestamped JSON file

## Notes

- The script runs in headless mode by default
- Timestamps are converted from Unix format to ISO format for readability
- Code blocks are preserved with Markdown-style formatting
- The original Unix timestamp is preserved in `timestamp_unix` field

## Development / Manual installation

For manual setup or development:

```bash
# Create project
mkdir chatgpt-to-json
cd chatgpt-to-json

# Initialize and install
npm init -y
npm install playwright
npx playwright install chromium

# Optional: System dependencies (Linux)
npx playwright install-deps
```

## License

MIT License - feel free to modify and distribute.
