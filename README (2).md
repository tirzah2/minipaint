
## miniPaint Integration with FoundryVTT

![miniPaint](https://raw.githubusercontent.com/viliusle/miniPaint/master/images/preview.gif)
*Generated using miniPaint*

### Overview

miniPaint is a powerful, browser-based image editor that now integrates seamlessly with FoundryVTT, allowing Game Masters to edit and manage images directly within the FoundryVTT environment. This integration brings the full power of miniPaint’s tools to your tabletop RPG experience.

### Change Log
- **[miniPaint Releases](https://github.com/viliusle/miniPaint/releases)**

### Browser Support

- Chrome
- Firefox
- Opera
- Edge
- Safari

---

## FoundryVTT Integration Features

### Custom Functions

The following custom functions have been implemented to enhance your FoundryVTT experience:

- **`openMiniPaint()`**
  - Opens the miniPaint application window within FoundryVTT, allowing you to edit images on the fly.
  
- **`loadTile()`**
  - Loads the currently selected tile in FoundryVTT into miniPaint as a new layer. Ideal for quick edits or enhancements to your game’s assets.

- **`browseFoundry()`**
  - Opens the FoundryVTT file picker, allowing you to browse and select an image. This image is then loaded into miniPaint as a new layer.

- **`replaceTile()`**
  - Replaces the currently selected tile's image with the edited image from miniPaint, overwriting the original while ensuring that the latest version is displayed using a cache-busting mechanism.

- **`showCanvasInImagePopout()`**
  - Captures the canvas content from miniPaint, uploads it to FoundryVTT’s data directory, and then displays it using FoundryVTT’s `ImagePopout` class, ensuring all players see the updated image.

---

### How to Use

#### Opening miniPaint

To open miniPaint within FoundryVTT, use the **Paintbrush** icon located in the Tile Controls. This will launch the miniPaint application window where you can start editing images.

#### Loading a Tile

Select a tile in FoundryVTT and click the **Load Tile** button within miniPaint to bring the tile’s image into miniPaint for editing.

#### Browsing Images

Click the **Browse Foundry** button to open the FoundryVTT file picker. Select an image, and it will be loaded into miniPaint as a new layer.

#### Replacing a Tile Image

After editing an image in miniPaint, use the **Replace Tile** button to overwrite the selected tile's image with the updated version, ensuring the latest changes are reflected in your game.

#### Displaying an Image to Players

Once you have edited an image, you can use the **Show in ImagePopout** function to display the image to all players. This feature ensures that everyone sees the updated content.

---

## Full Feature List

- **Files**: Open images, directories, URLs, data URLs, drag and drop, save in multiple formats (PNG, JPG, BMP, WEBP, animated GIF, TIFF, JSON for layers data), and print.
- **Edit**: Undo, cut, copy, paste, selection tools, and paste from clipboard.
- **Image**: Provides detailed information, EXIF data, trim, zoom, resize (Hermite resample), rotate, flip, color corrections, auto-adjust colors, grid, histogram, and negative effects.
- **Layers**: Multiple layers support, differences, merge, flatten, and transparency support.
- **Effects**: Includes Black and White, various blurs (box, Gaussian, stack, zoom), Bulge/Pinch, Denoise, Desaturate, Dither, Dot Screen, Edge, Emboss, Enrich, Gamma, Grains, GrayScale, Heatmap, JPG Compression, Mosaic, Oil, Sepia, Sharpen, Solarize, Tilt Shift, Vignette, Vibrance, Vintage, Blueprint, Night Vision, Pencil, and Instagram Filters.
- **Tools**: Offers a wide array of tools including pencil, brush, magic wand, erase, fill, color picker, text, crop, blur, sharpen, desaturate, clone, borders, sprites, key-points, color zoom, replace color, restore alpha, and content fill.
- **Help**: Provides keyboard shortcuts and translations to enhance the user experience.
