# Private asset injection

The public repository intentionally contains **no private art binaries**.

For local / Android crossover builds, copy a private pack into:

```text
public/private-assets/stardream/
├─ dream-arena.png
├─ ember-frame-00-hover.png
├─ ember-frame-01-charge.png
├─ ember-frame-02-dash.png
├─ ember-frame-03-slash.png
├─ ember-frame-04-dance.png
├─ ember-frame-05-judgment.png
├─ ember-frame-06-wingburst.png
├─ ember-frame-07-finisher.png
├─ vfx-ember-slash-atlas.png
├─ vfx-ember-impact-atlas.png
└─ vfx-ember-magic-atlas.png
```

That directory is ignored by git.

Launch the Phaser preview with private art enabled using:

```text
phaser.html?private=1
```

If the private pack is absent or incomplete, the battle scene falls back to the public placeholder art instead of requiring the assets.

For the future Android build, the private pack should be injected **before** the Vite/Capacitor build, so the resulting APK contains the art while the public GitHub repository still does not.
