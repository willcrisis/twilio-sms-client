# Twilio SMS Client

A simple browser-based interface for sending and receiving SMS messages via the Twilio API.

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Fill in your Twilio Account SID, Auth Token, From/To numbers, and send messages. Credentials are saved to localStorage across sessions.

## Receiving Incoming Messages

The dev server exposes a `POST /incoming` endpoint that accepts Twilio webhooks. You need a tunnel to make it reachable from the internet.

### Option A: ngrok

```bash
ngrok http 5173
```

Copy the forwarding URL (e.g. `https://abc123.ngrok-free.app`) and set your Twilio phone number's incoming message webhook to:

```
https://abc123.ngrok-free.app/incoming
```

> **Note:** The ngrok URL changes every time you restart it (unless you have a paid plan with a fixed domain). You'll need to update the Twilio webhook URL each time.

### Option B: Hookdeck

1. Install the CLI:

```bash
npm install -g hookdeck-cli
hookdeck login
```

2. Start listening:

```bash
hookdeck listen 5173 twilio-sms
```

When prompted for the destination path, enter `/incoming`.

3. Hookdeck prints a source URL like `https://hkdk.events/abc123`. Set your Twilio phone number's incoming message webhook to that URL.

> **Advantage:** The Hookdeck source URL is stable — you don't need to update Twilio when you restart the tunnel. You also get request logging and automatic retries at `https://dashboard.hookdeck.com`.

### Twilio Phone Number Configuration

Regardless of which tunnel you use, configure your Twilio phone number at [console.twilio.com](https://console.twilio.com):

1. Go to **Phone Numbers** > **Manage** > **Active Numbers**
2. Select your number
3. Under **Messaging** > **A message comes in**, set:
   - **Webhook**: your tunnel URL + `/incoming`
   - **HTTP Method**: `POST`
