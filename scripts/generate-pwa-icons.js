const sharp = require("sharp");
const path = require("path");

async function main() {
  const source = path.join(__dirname, "../public/slbi-mark.svg");
  const target = path.join(__dirname, "../public/icons");

  // Generate sharp, mask-safe raster icons from the same evergreen SVG
  // used in the navigation and browser favicon. No old blue image reuse.
  for (const [size, scale, file] of [
    [192, 0.72, "pwa-192.png"],
    [512, 0.55, "pwa-512.png"],
  ]) {
    const mark = await sharp(source)
      .resize(Math.round(size * scale), Math.round(size * scale))
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: "#F6F3ED",
      },
    })
      .composite([{ input: mark, gravity: "centre" }])
      .png()
      .toFile(path.join(target, file));
  }

  console.log("Generated evergreen SL Business Index PWA icons");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
