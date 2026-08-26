export const PRIVATE_ASSET_FLAG = 'private'

export const stardreamAssetBase = './private-assets/stardream'

export const emberFrames = [
  'ember-frame-00-hover.png',
  'ember-frame-01-charge.png',
  'ember-frame-02-dash.png',
  'ember-frame-03-slash.png',
  'ember-frame-04-dance.png',
  'ember-frame-05-judgment.png',
  'ember-frame-06-wingburst.png',
  'ember-frame-07-finisher.png',
] as const

export const emberFrameKeys = emberFrames.map((_, index) => `private-ember-frame-${index}`)

export const emberFrameMotion = [
  { dx: 0, dy: 0, rotation: 0, scale: 1 },
  { dx: 14, dy: -8, rotation: -0.03, scale: 1.01 },
  { dx: 28, dy: -12, rotation: -0.05, scale: 1.02 },
  { dx: 38, dy: -5, rotation: 0.02, scale: 1.02 },
  { dx: 25, dy: 8, rotation: 0.03, scale: 1.01 },
  { dx: 12, dy: -16, rotation: -0.02, scale: 1.03 },
  { dx: 4, dy: -6, rotation: 0, scale: 1.02 },
  { dx: 34, dy: -10, rotation: 0.02, scale: 1.04 },
] as const

export const emberComboOrder = [1, 2, 3, 4, 5, 6, 3, 2, 4, 5, 3, 6] as const

export const privateVfx = {
  slash: 'vfx-ember-slash-atlas.png',
  impact: 'vfx-ember-impact-atlas.png',
  magic: 'vfx-ember-magic-atlas.png',
} as const

export const privateArena = 'dream-arena.png'

export const atlasRects = {
  slash: [
    [21, 12, 633, 208], [42, 196, 814, 223], [593, 654, 634, 166], [676, 15, 534, 206],
    [759, 836, 467, 193], [189, 838, 547, 167], [708, 456, 522, 168], [74, 638, 402, 195],
    [351, 405, 349, 235], [905, 234, 323, 219], [18, 1000, 360, 222], [12, 422, 318, 225],
    [309, 1071, 340, 137], [675, 1022, 222, 224], [915, 1049, 320, 184],
  ],
  impact: [
    [307, 940, 415, 299], [332, 305, 327, 323], [7, 327, 325, 295], [658, 343, 293, 278],
    [642, 639, 304, 281], [974, 341, 266, 255], [14, 48, 307, 256], [341, 640, 289, 291],
    [650, 3, 268, 291], [968, 942, 274, 245], [22, 655, 277, 259], [942, 710, 298, 168],
    [961, 29, 269, 249], [355, 14, 268, 280],
  ],
  magic: [
    [427, 855, 436, 393], [648, 13, 308, 315], [21, 13, 306, 291], [895, 930, 341, 267],
    [990, 3, 251, 322], [10, 901, 388, 325], [348, 325, 301, 290], [8, 588, 283, 287],
    [638, 612, 303, 256], [371, 4, 254, 317], [669, 347, 267, 243], [953, 609, 291, 276],
  ],
} as const

export function privateAssetModeEnabled() {
  return new URLSearchParams(window.location.search).get(PRIVATE_ASSET_FLAG) === '1'
}

export function privateAssetUrl(file: string) {
  return `${stardreamAssetBase}/${file}`
}
