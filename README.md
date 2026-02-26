# PhantomPersona

## Prerequisites

- Node.js v18 or later
- npm

## Install

```bash
cd web
npm install
```

## Development

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Troubleshooting

### `next.config.ts` not supported

If you see:

```
Error: Configuring Next.js via 'next.config.ts' is not supported.
```

Your version of Next.js doesn't support TypeScript config files. Upgrade Next.js:

```bash
npm install next@latest
```

Or rename the config file:

```bash
mv next.config.ts next.config.js
```