# Peridot font files

Drop your Peridot `.woff2` files here, using these exact filenames:

```
Peridot-Regular.woff2     ← weight 400 (body text)
Peridot-Medium.woff2      ← weight 500 (subheads, buttons)
Peridot-SemiBold.woff2    ← weight 600 (small headings)
Peridot-Bold.woff2        ← weight 700 (display headings)
```

You only need `.woff2` — it's supported by every modern browser and is the smallest format. You can also drop in `.woff` versions next to them if you want to support very old browsers; you'd then update the `src:` lines in `app/globals.css` to include both formats.

If a weight is missing, the browser will synthesise it (less crisp) or fall back to **Inter / system-ui** until you add the file.

After dropping files in, just refresh the browser — no rebuild needed in dev mode.

## Licensing reminder
Peridot is a commercial font. Make sure you have a web licence covering the domain(s) you'll deploy to before going live.
