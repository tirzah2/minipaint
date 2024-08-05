Hooks.on('getSceneControlButtons', (controls) => {
  const tileControls = controls.find(control => control.name === 'tiles');
  const tokenControls = controls.find(control => control.name === 'token');
  
  // Add miniPaint button to Tile Controls
  if (tileControls) {
    tileControls.tools.push({
      name: "minipaint",
      title: "miniPaint",
      icon: "fas fa-paint-brush",
      visible: game.user.isGM,
      onClick: () => openMiniPaintWithAutoLoad(),
      button: true
    });
  }
  
  // Add miniPaint button to Token Controls
  if (tokenControls) {
    tokenControls.tools.push({
      name: "minipaint",
      title: "miniPaint",
      icon: "fas fa-paint-brush",
      visible: game.user.isGM,
      onClick: () => openMiniPaintWithAutoLoad(),
      button: true
    });
  }
});

// Function to open miniPaint and automatically load the selected tile or token
async function openMiniPaintWithAutoLoad() {
  const selectedTiles = canvas.tiles.controlled;
  const selectedTokens = canvas.tokens.controlled;

  await openMiniPaint();

  if (selectedTiles.length === 1 && selectedTokens.length === 0) {
    waitForMiniPaintToLoad(() => loadTile());
  } else if (selectedTokens.length === 1 && selectedTiles.length === 0) {
    waitForMiniPaintToLoad(() => loadToken());
  } else if (selectedTiles.length > 1 || selectedTokens.length > 1) {
    ui.notifications.warn("More than one item selected, opening empty miniPaint.");
  }
}

// Function to open the miniPaint application window
async function openMiniPaint() {
  const content = await renderTemplate("modules/minipaint/templates/minipaint.html");

  const dialogData = {
    title: "miniPaint",
    content: content,
    buttons: {},
    default: "close",
    close: () => {}
  };

  const dialogOptions = {
    width: 1000,
    height: 660,
    classes: ["dialog", "minpaint"]
  };

  const dialog = new Dialog(dialogData, dialogOptions);
  dialog.render(true);
}

// Utility function to wait until miniPaint is fully loaded
function waitForMiniPaintToLoad(callback) {
  const interval = setInterval(() => {
    const iframe = document.getElementById('myFrame');
    if (iframe && iframe.contentWindow && iframe.contentWindow.Layers) {
      clearInterval(interval);
      callback();
    }
  }, 100); // Check every 100ms
}


// Function to load the selected tile as a layer into miniPaint
async function loadTile() {
  const selectedTiles = canvas.tiles.controlled;

  if (selectedTiles.length !== 1) {
    ui.notifications.warn("Please select exactly one tile.");
    return;
  }

  const tile = selectedTiles[0];
  const tileSrc = tile.document.texture.src;  // Corrected property to get the tile image source

  if (!tileSrc) {
    ui.notifications.error("Tile image source not found.");
    return;
  }

  const image = new Image();
  image.src = tileSrc;

  image.onload = () => {
    const Layers = document.getElementById('myFrame').contentWindow.Layers;
    const name = image.src.replace(/^.*[\\\/]/, '');
    const new_layer = {
      name: name,
      type: 'image',
      data: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      width_original: image.naturalWidth || image.width,
      height_original: image.naturalHeight || image.height,
    };
    Layers.insert(new_layer);
  };

  image.onerror = () => {
    ui.notifications.error("Failed to load the tile image.");
  };
}
// Function to browse Foundry file picker and load the selected image as a layer
async function browseFoundry() {
  // Open the Foundry file picker
  const picker = new FilePicker({
    type: "image",
    callback: (path) => {
      if (!path) {
        ui.notifications.warn("No image selected.");
        return;
      }

      const image = new Image();
      image.src = path;

      image.onload = () => {
        const Layers = document.getElementById('myFrame').contentWindow.Layers;
        const name = image.src.replace(/^.*[\\\/]/, '');
        const new_layer = {
          name: name,
          type: 'image',
          data: image,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          width_original: image.naturalWidth || image.width,
          height_original: image.naturalHeight || image.height,
        };
        Layers.insert(new_layer);
        ui.notifications.info("Image loaded as a layer successfully.");
      };

      image.onerror = () => {
        ui.notifications.error("Failed to load the selected image.");
      };
    },
    top: 100,
    left: 100,
    button: "Browse"
  });

  picker.render(true);
}

// Function to replace the selected tile's image with the modified image from miniPaint
// Utility function to generate a random 10-character alphanumeric string
function generateRandomFilename() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function replaceTile() {
  const selectedTiles = canvas.tiles.controlled;

  if (selectedTiles.length !== 1) {
    ui.notifications.warn("Please select exactly one tile.");
    return;
  }

  const tile = selectedTiles[0];
  const originalPath = tile.document.texture.src;
  const directoryPath = originalPath.substring(0, originalPath.lastIndexOf("/"));

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the miniPaint canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    // Generate a random filename
    const randomFilename = generateRandomFilename() + ".png";

    // Create a File object from the Blob with the random filename
    const file = new File([blob], randomFilename, { type: blob.type });

    // Upload the image file to the same directory as the original tile image
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      // Update the tile with the new image source
      await tile.document.update({ "texture.src": response.path });

      //ui.notifications.info("Tile image replaced successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
}

async function loadToken() {
  const selectedTokens = canvas.tokens.controlled;

  if (selectedTokens.length !== 1) {
    ui.notifications.warn("Please select exactly one token.");
    return;
  }

  const token = selectedTokens[0];
  const tokenSrc = token.document.texture.src;

  if (!tokenSrc) {
    ui.notifications.error("Token image source not found.");
    return;
  }

  const image = new Image();
  image.src = tokenSrc;

  image.onload = () => {
    const Layers = document.getElementById('myFrame').contentWindow.Layers;
    const name = image.src.replace(/^.*[\\\/]/, '');
    const new_layer = {
      name: name,
      type: 'image',
      data: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      width_original: image.naturalWidth || image.width,
      height_original: image.naturalHeight || image.height,
    };
    Layers.insert(new_layer);
  };

  image.onerror = () => {
    ui.notifications.error("Failed to load the token image.");
  };
}
async function replaceToken() {
  const selectedTokens = canvas.tokens.controlled;

  if (selectedTokens.length !== 1) {
    ui.notifications.warn("Please select exactly one token.");
    return;
  }

  const token = selectedTokens[0];
  const originalPath = token.document.texture.src;
  const directoryPath = originalPath.substring(0, originalPath.lastIndexOf("/"));

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the miniPaint canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    // Generate a random filename
    const randomFilename = generateRandomFilename() + ".png";

    // Create a File object from the Blob with the random filename
    const file = new File([blob], randomFilename, { type: blob.type });

    // Upload the image file to the same directory as the original token image
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      // Update the token with the new image source
      await token.document.update({ "texture.src": response.path });

      ui.notifications.info("Token image replaced successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
}


async function showCanvasInImagePopout() {
  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the miniPaint canvas content to a Base64 data URL
  const dataURL = minipaintCanvas.toDataURL("image/png");

  // Create a file from the data URL
  const file = await urlToFile(dataURL, "temp.png");

  // Upload the file to Foundry's data directory to ensure it's accessible
  const response = await FilePicker.upload("data", "", file, {});

  if (response.path) {
    // Add a cache-busting query parameter to the image path
    const cacheBustedPath = `${response.path}?_=${Date.now()}`;

    // Create an ImagePopout to display the image
    new ImagePopout(cacheBustedPath, {
      title: "miniPaint Image",
      shareable: true
    }).render(true);

    ui.notifications.info("ImagePopout opened successfully.");
  } else {
    ui.notifications.error("Failed to upload the image.");
  }
}

// Utility function to convert a data URL to a File object
const urlToFile = async (url, filename) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type });
  return file;
};
