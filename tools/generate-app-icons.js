#!/usr/bin/env node
'use strict';

// All platform artwork derives from the approved vector master. Launchers on
// iOS and Android apply their own masks; desktop/web assets retain the tile.
const { mkdirSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { generateMacIcon, loadSharp } = require('./generate-mac-icon');

const ROOT = join(__dirname, '..');
const SOURCE = 'src/assets/super-tasks/logo.svg';
const svg = readFileSync(join(ROOT, SOURCE), 'utf8');
const color = svg.match(/<rect[^>]+fill="([^"]+)"/)[1];
const path = svg.match(/<path[^>]+d="([^"]+)"/)[1];
const mark = (fill) => `<path fill="${fill}" d="${path}"/>`;
const wrap = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="${viewBox}">${body}</svg>\n`;
const glyph = (fill) => wrap('184 186 880 880', mark(fill));
const fullBleed = wrap(
  '81 81 1092 1092',
  `<rect x="81" y="81" width="1092" height="1092" fill="${color}"/>${mark('#fff')}`,
);
const write = (file, data) => {
  const output = join(ROOT, file);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, data);
};

const buildIco = (entries) => {
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ pixels, data }, index) => {
    const position = 6 + index * 16;
    header[position] = pixels === 256 ? 0 : pixels;
    header[position + 1] = pixels === 256 ? 0 : pixels;
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(data.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...entries.map(({ data }) => data)]);
};

async function generateAppIcons() {
  const sharp = loadSharp();
  const png = async (source, pixels, opaque = false) => {
    let image = sharp(Buffer.from(source)).resize(pixels, pixels);
    image = opaque
      ? image.flatten({ background: color }).removeAlpha()
      : image.ensureAlpha();
    return image.toColorspace('srgb').png().toBuffer();
  };
  const render = async (file, pixels, source = svg, opaque = false) =>
    write(file, await png(source, pixels, opaque));

  write('build/icon-mac.svg', svg);
  await render('build/icon.png', 512);
  await render('build/512x512.png', 512);
  await render('build/super-tasks.png', 512);
  for (const file of readdirSync(join(ROOT, 'build/icons'))) {
    const match = file.match(/^(sq)?(\d+)x\2\.png$/);
    if (match)
      await render(
        `build/icons/${file}`,
        Number(match[2]),
        match[1] ? fullBleed : svg,
        Boolean(match[1]),
      );
  }
  await render('src/assets/super-tasks/logo.png', 512);
  for (const pixels of [72, 96, 128, 144, 192, 512]) {
    await render(`src/assets/icons/icon-${pixels}x${pixels}.png`, pixels);
  }
  for (const pixels of [16, 32, 192]) {
    await render(`src/assets/icons/favicon-${pixels}x${pixels}.png`, pixels);
  }
  await render('src/assets/icons/apple-touch-icon.png', 180, fullBleed, true);
  await render('src/assets/icons/mstile-150x150.png', 150);
  await render('electron/assets/icons/icon_256x256.png', 256);
  write('electron/assets/icons/ico-circled.svg', svg);
  for (const [file, fill] of [
    ['src/assets/icons/sp.svg', 'currentColor'],
    ['src/assets/icons/sp-white.svg', '#fff'],
    ['src/assets/icons/safari-pinned-tab.svg', '#000'],
    ['electron/assets/icons/ico.svg', '#000'],
    ['electron/assets/icons/ico-white.svg', '#fff'],
  ])
    write(file, glyph(fill));

  const icoEntries = [];
  for (const pixels of [16, 24, 32, 48, 64, 128, 256]) {
    icoEntries.push({ pixels, data: await png(svg, pixels) });
  }
  write('build/icon.ico', buildIco(icoEntries));
  write('src/favicon.ico', buildIco(icoEntries.filter(({ pixels }) => pixels <= 48)));

  // Keep Windows Store tiles and splash images at their required canvas sizes.
  for (const file of readdirSync(join(ROOT, 'build/appx'))) {
    if (!file.endsWith('.png')) continue;
    const { width, height } = await sharp(join(ROOT, 'build/appx', file)).metadata();
    const artwork = file.startsWith('BadgeLogo') ? glyph('#fff') : svg;
    const data = await sharp(Buffer.from(artwork))
      .resize(width, height, { fit: 'contain', background: '#00000000' })
      .ensureAlpha()
      .png()
      .toBuffer();
    write(`build/appx/${file}`, data);
  }

  // Template tray images must remain monochrome so the OS can invert them.
  for (const [suffix, fill] of [
    ['l', '#000'],
    ['d', '#fff'],
  ]) {
    for (const [scale, pixels] of [
      ['', 24],
      ['@2x', 48],
    ]) {
      await render(
        `electron/assets/icons/tray-ico-${suffix}${scale}.png`,
        pixels,
        glyph(fill),
      );
      await render(
        `electron/assets/icons/indicator/stopped-${suffix}${scale}.png`,
        pixels,
        glyph(fill),
      );
    }
  }

  const res = 'android/app/src/main/res';
  for (const [density, pixels, notificationPixels] of [
    ['mdpi', 48, 24],
    ['hdpi', 72, undefined],
    ['xhdpi', 96, 48],
    ['xxhdpi', 144, 72],
    ['xxxhdpi', 192, undefined],
  ]) {
    await render(`${res}/mipmap-${density}/ic_launcher.png`, pixels);
    await render(`${res}/mipmap-${density}/ic_launcher_round.png`, pixels);
    if (notificationPixels)
      await render(
        `${res}/drawable-${density}/ic_stat_sp.png`,
        notificationPixels,
        glyph('#fff'),
      );
  }
  await render('android/app/src/main/ic_launcher-playstore.png', 512, fullBleed, true);
  await render('fastlane/metadata/android/en-US/images/icon.png', 512, fullBleed, true);
  write(
    `${res}/values/ic_launcher_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">${color}</color>\n</resources>\n`,
  );
  write(
    `${res}/drawable/ic_launcher_foreground.xml`,
    `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n  <group android:translateX="16.56" android:translateY="16.44" android:scaleX="0.06" android:scaleY="0.06">\n    <path android:fillColor="#ffffff" android:pathData="${path}"/>\n  </group>\n</vector>\n`,
  );
  write(
    `${res}/drawable-anydpi-v24/ic_stat_sp.xml`,
    `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="880" android:viewportHeight="880" android:tint="#FFFFFF">\n  <group android:translateX="-184" android:translateY="-186">\n    <path android:fillColor="#ffffff" android:pathData="${path}"/>\n  </group>\n</vector>\n`,
  );

  const splash = await sharp({
    create: { width: 2732, height: 2732, channels: 3, background: '#fff' },
  })
    .composite([{ input: await png(svg, 360), gravity: 'centre' }])
    .png()
    .toBuffer();
  for (const suffix of ['', '-1', '-2']) {
    write(
      `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${suffix}.png`,
      splash,
    );
  }

  await generateMacIcon();
  execFileSync(process.execPath, [join(__dirname, 'generate-ios-icon.js')], {
    stdio: 'inherit',
  });
  console.log(`Generated app icons from ${SOURCE} (${color}).`);
}

generateAppIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
