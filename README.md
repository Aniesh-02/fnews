# FNEWS

FNEWS is a mobile-first latest-news web app. Search any topic, refresh the feed, and open each story at the original publisher.

## Setup

1. Copy `.env.example` to `.env`.
2. Add your API key.
3. Start the app:

```bash
npm start
```

Open `http://localhost:3000`.

## Publish Online With Vercel

Use this when you want the app to run as a normal public web app.

1. Push this folder to a GitHub repository.
2. Go to Vercel and import that repository.
3. Keep the default project settings.
4. Add these environment variables in Vercel:

```bash
NEWS_PROVIDER=newsapi
NEWSAPI_KEY=your_newsapi_key_here
NEWS_LANGUAGE=en
NEWS_COUNTRY=us
```

5. Deploy.

Vercel will give you a public `https://...vercel.app` URL. The frontend runs as the FNEWS web app, and `/api/news` runs as a secure serverless function so your API key is not exposed in the browser.

## Publish Online With Render

The easiest option for this app is Render.

1. Push this folder to a GitHub repository.
2. Go to Render and create a new Web Service from that repository.
3. Render will read `render.yaml`.
4. Add this environment variable in Render:

```bash
NEWSAPI_KEY=your_newsapi_key_here
```

5. Deploy.

Render will give you a public `https://...onrender.com` URL that works from any device with internet.

## Providers

Set `NEWS_PROVIDER` in `.env`.

- `newsapi` uses `NEWSAPI_KEY` and searches the NewsAPI everything endpoint.
- `gnews` uses `GNEWS_KEY` and searches the GNews search endpoint.

## Options

- `NEWS_LANGUAGE=en`
- `NEWS_COUNTRY=us`
- `PORT=3000`

The app auto-refreshes every minute and also has a manual refresh button.
