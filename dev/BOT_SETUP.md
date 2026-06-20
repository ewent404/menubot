# BigBunny Telegram Bot Setup

1. In BotFather, revoke the token that was pasted in chat and create a new token.
2. Copy `.env.example` to `.env`.
3. Put the new token in `TELEGRAM_BOT_TOKEN`.
4. Start the bot:

```bash
npm run bot
```

The website opens `@BigbunnyHomeBrakeBot` and copies a full order message for the customer to send.

To forward customer messages to your own Telegram account, message the bot once, get your chat id from the bot logs or Telegram API, then put it in `OWNER_CHAT_ID`.

## Telegram Mini App

For the bot to open the menu directly inside Telegram:

1. Deploy the menu website to a public HTTPS URL.
2. Put that URL in `.env` as `MINI_APP_URL`.
3. Restart the bot with `npm run bot`.

When `MINI_APP_URL` is set, the bot configures its Telegram menu button as **Open Menu** and also shows an **Open Menu** keyboard button in chat. Orders sent from the Mini App are received by the bot and forwarded to `OWNER_CHAT_ID`.

## Vercel Hosting

Use Vercel for the Mini App website and webhook.

1. Create a Vercel project from this `dev` folder.
2. Add these environment variables in Vercel:

```bash
TELEGRAM_BOT_TOKEN=your_new_botfather_token
OWNER_CHAT_ID=836689434
MINI_APP_URL=https://your-vercel-domain.vercel.app
```

3. Deploy the project.
4. Add the same `MINI_APP_URL` to local `.env`.
5. Register the Telegram webhook and Mini App menu button:

```bash
npm run bot:setup-webhook
```

After that, customers can open `@BigbunnyHomeBrakeBot`, tap **Open Menu**, place an order inside Telegram, and the order will forward to `OWNER_CHAT_ID`.

For production, regenerate the bot token in BotFather before adding it to Vercel.
