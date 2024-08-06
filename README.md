### Overview

miniPaint is a powerful, browser-based image editor that now integrates seamlessly with FoundryVTT, allowing Game Masters to edit and manage images directly within the FoundryVTT environment. This integration brings the full power of miniPaint’s tools to your tabletop RPG experience.

# New
- Now works also with tokens and items
- If you have a token or a tile selected while opening minipaint, it will be automatically imported
- Added support for tidy5e
- You can now remove backgrounds from an image. It uses remove.bg free api (50 uses a month with free account, check minipaint module settings to input the api key) It removes background from the whole canvas image, not from single layers. So think about your editing workflow before remove the background, my young Padawan.


https://github.com/user-attachments/assets/6c363532-0aa8-4993-811d-ac96fd5e18a6



https://github.com/user-attachments/assets/73187221-9ee1-4848-a9d1-493b9532e8a4


https://github.com/user-attachments/assets/dc846868-4126-4693-ba18-4163611b38c8


## miniPaint Integration with FoundryVTT
<img width="747" alt="chrome_odb6rm33EZ" src="https://github.com/user-attachments/assets/ca51c196-5c53-4087-8ebe-f73db9b3f141">
<img width="174" alt="chrome_LJAOXSXQPm" src="https://github.com/user-attachments/assets/619d4994-fce4-4a28-bc04-67552cf40ed5">




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

#### Loading Selected Tile as Layer

Select a tile in FoundryVTT and click the **Load Tile** button within miniPaint to bring the tile’s image into miniPaint for editing, you can import as many as you want (one by one).

#### Browsing Images

Click the **Browse Foundry** button to open the FoundryVTT file picker. Select an image, and it will be loaded into miniPaint as a new layer.

#### Replacing a Tile Image

After editing an image in miniPaint, use the **Replace Tile** button to overwrite the selected tile's image with the updated version, ensuring the latest changes are reflected in your game. The old image is not lost, a new image will be created.

#### Displaying an Image to Players

Once you have edited an image, you can use the **Show in ImagePopout** function to display the image to all players. This feature ensures that everyone sees the updated content.

---

## Full Feature List

- **Files**: Open images, directories, URLs, data URLs, drag and drop, save in multiple formats (PNG, JPG, BMP, WEBP, animated GIF, TIFF, JSON for layers data), and print.
- **Edit**: Undo, cut, copy, paste, selection tools, and paste from clipboard.
- **Image**: Provides detailed information, EXIF data, trim, zoom, resize (Hermite resample), rotate, flip, color corrections, auto-adjust colors, grid, histogram, and negative effects.
- **Layers**: Multiple layers support, differences, merge, flatten, and transparency support.
  <img width="752" alt="chrome_Fh5Aab3lvY" src="https://github.com/user-attachments/assets/44ba99e5-e2cd-4eae-a735-cf243c8751f4">

- **Effects**: Includes Black and White, various blurs (box, Gaussian, stack, zoom), Bulge/Pinch, Denoise, Desaturate, Dither, Dot Screen, Edge, Emboss, Enrich, Gamma, Grains, GrayScale, Heatmap, JPG Compression, Mosaic, Oil, Sepia, Sharpen, Solarize, Tilt Shift, Vignette, Vibrance, Vintage, Blueprint, Night Vision, Pencil, and Instagram Filters.
<img width="751" alt="chrome_dv8OS1viIN" src="https://github.com/user-attachments/assets/8de22c0b-1749-4720-b5fb-db3a51bb1ddc">

- **Tools**: Offers a wide array of tools including pencil, brush, magic wand, erase, fill, color picker, text, crop, blur, sharpen, desaturate, clone, borders, sprites, key-points, color zoom, replace color, restore alpha, and content fill.
- **Help**: Provides keyboard shortcuts and translations to enhance the user experience.

Licence
https://github.com/tirzah2/minipaint/blob/main/Minipaint%20licence
