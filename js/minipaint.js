

Hooks.once('init', () => {
  game.settings.register('minipaint', 'stabilityAiApiKey', {
    name: "Stability AI API Key",
    hint: "Enter your Stability AI API key here. You can get your API key from https://platform.stability.ai/. Note that you have 50 free uses per month.",
    scope: 'client',
    config: true,
    type: String,
    default: "",
  });
});
let minipaintDoc;
Hooks.once('init', () => {
  game.settings.register('minipaint', 'removeBgApiKey', {
    name: 'Remove.bg API Key',
    hint: 'Enter your API key from remove.bg here. You can get it by signing up at https://www.remove.bg/. Note: You get 50 free uses per month.',
    scope: 'client', // This setting is stored per-client, so each user can have their own API key
    config: true,
    type: String,
    default: '',
  });
});
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

// Function to launch miniPaint for editing an actor's prototype token
Hooks.once("tidy5e-sheet.ready", (api) => {
  api.config.actorPortrait.registerMenuCommands([
    {
      label: "Edit Prototype Token",
      iconClass: "fas fa-paint-brush",
      tooltip: "Edit the prototype token texture with miniPaint",
      enabled: (params) => params.actor.type !== "vehicle",
      execute: (params) => {
        const token = foundry.utils.getProperty(params, "context.options.token");
        const minipaintDoc = token ? { actor: params.actor, token } : params.actor;
        window.minipaintDoc = minipaintDoc; // Set minipaintDoc globally
        launchMiniPaintForActor(minipaintDoc, 'prototypeToken');
      },
    },
    {
      label: "Edit Actor Image",
      iconClass: "fas fa-user-edit",
      tooltip: "Edit the actor's image with miniPaint",
      enabled: (params) => params.actor.type !== "vehicle",
      execute: (params) => {
        const actor = params.actor;
        window.minipaintDoc = actor; // Set minipaintDoc globally for actor image
        launchMiniPaintForActor(actor, 'img');
      },
    },
  ]);
});

// Function to launch miniPaint for editing an actor's prototype token or image
async function launchMiniPaintForActor(minipaintDoc, type) {
  window.minipaintItem = null;
  const textureSrc = type === 'prototypeToken' ? minipaintDoc.prototypeToken.texture.src : minipaintDoc.img;

  if (!textureSrc) {
    ui.notifications.error("Image source not found.");
    return;
  }
  window.tidyType = type;
  
  await openMiniPaint(); // Open miniPaint

  waitForMiniPaintToLoad(() => {
    loadActorTexture(textureSrc);
  //  highlightRelevantButton(type); // Highlight the relevant button
  });
}
// Function to generate a random filename
function generateRandomFilename() {
  return Math.random().toString(36).substring(2, 12);
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
// Function to open miniPaint and automatically load the selected tile or token
async function openMiniPaintWithAutoLoad() {
  window.minipaintItem = null;
  window.tidyType = null;
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
// Helper function to strip the cache-busting query string from a path
function stripCacheBusting(path) {
  if (!path) {
    return null;
  }
  return path.split('?')[0];
}
async function saveFoundry() {
  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Show a dialog to prompt the user for a filename
  const dialogContent = `
    <div>
      <label for="filename">Enter a filename (with extension, e.g., image.png):</label>
      <input type="text" id="filename" name="filename" value="image.png" style="width:100%" />
    </div>
  `;

  new Dialog({
    title: "Save Image to Foundry",
    content: dialogContent,
    buttons: {
      save: {
        label: "Save",
        callback: async (html) => {
          let fileName = html.find('input[name="filename"]').val();

          // Validate the file extension
          const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'gif', 'tiff'];
          let extension = fileName.split('.').pop().toLowerCase();

          if (!validExtensions.includes(extension)) {
            ui.notifications.error(`Invalid file extension. Please use one of the following: ${validExtensions.join(', ')}`);
            return;
          }

          // Set the directory to miniMapNewTiles
          const directoryPath = "miniMapNewTiles";

          // Ensure the directory exists
          try {
            await FilePicker.browse("data", directoryPath);
          } catch (error) {
            if (error.message.includes("does not exist")) {
              try {
                await FilePicker.createDirectory("data", directoryPath);
              } catch (creationError) {
                ui.notifications.error("Failed to create the miniMapNewTiles directory.");
                return;
              }
            } else {
              ui.notifications.error("Error accessing the miniMapNewTiles directory.");
              return;
            }
          }

          // Convert the miniPaint canvas content to a Blob
          minipaintCanvas.toBlob(async (blob) => {
            if (!blob) {
              ui.notifications.error("Failed to create a Blob from the canvas.");
              return;
            }

            // Create a File object from the Blob with the provided filename
            const file = new File([blob], fileName, { type: blob.type });

            // Upload the image file, overwriting if it already exists
            const response = await FilePicker.upload("data", directoryPath, file, {});

            if (response.path) {
              ui.notifications.info(`Image saved successfully as ${fileName} in ${directoryPath}.`);
            } else {
              ui.notifications.error("Failed to save the image to Foundry.");
            }
          }, "image/png");
        }
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "save"
  }).render(true);
}

async function replaceSelected() {
  const selectedTokens = canvas.tokens.controlled;
  const selectedTiles = canvas.tiles.controlled;
  let documentToUpdate, originalPath;

  if (selectedTokens.length === 1) {
    documentToUpdate = selectedTokens[0].document;
    originalPath = documentToUpdate.texture.src;

  } else if (selectedTiles.length === 1) {
    documentToUpdate = selectedTiles[0].document;
    originalPath = documentToUpdate.texture.src;

  } else {
    ui.notifications.warn("Please select exactly one token or tile.");
    return;
  }

  originalPath = originalPath ? stripCacheBusting(originalPath) : null;
  let directoryPath = originalPath ? originalPath.substring(0, originalPath.lastIndexOf("/")) : "miniMapNewTiles";
  let fileName = originalPath ? originalPath.substring(originalPath.lastIndexOf("/") + 1) : generateRandomFilename() + ".png";

  // Handle mystery-man.svg case for new tokens
  if (fileName === "mystery-man.svg") {
    fileName = generateRandomFilename() + ".png";
  }

  // Check if the directory is writable or accessible
  try {
    await FilePicker.browse("data", directoryPath);
  } catch (error) {
    console.warn("Directory is not writable, switching to miniMapNewTiles.");
    directoryPath = "miniMapNewTiles";

    try {
      await FilePicker.browse("data", directoryPath);
    } catch (error) {
      if (error.message.includes("does not exist")) {
        await FilePicker.createDirectory("data", directoryPath);
      } else {
        ui.notifications.error("Error accessing or creating the fallback directory.");
        return;
      }
    }
  }

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    const file = new File([blob], fileName, { type: 'image/png' });
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      const cacheBustedPath = `${stripCacheBusting(response.path)}?${Date.now()}`;
      await documentToUpdate.update({ "texture.src": cacheBustedPath });
      ui.notifications.info("Image replaced successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
}
// Function to replace actor texture with cache busting
async function replaceActorTexture(type) {
  const minipaintDoc = window.parent.minipaintDoc;

  if (!minipaintDoc) {
    ui.notifications.error("No actor document found.");
    return;
  }

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    let originalPath = type === 'prototypeToken'
      ? minipaintDoc.prototypeToken.texture.src
      : minipaintDoc.img;

    // Strip the cache-busting query string, if present
    if (originalPath) {
      originalPath = stripCacheBusting(originalPath);
    }

    let directoryPath = originalPath ? originalPath.substring(0, originalPath.lastIndexOf("/")) : null;
    let fileName = originalPath ? originalPath.substring(originalPath.lastIndexOf("/") + 1) : generateRandomFilename() + ".png";

    // If the original file is "mystery-man.svg", we rename it and convert it to PNG
    if (fileName === "mystery-man.svg") {
      fileName = generateRandomFilename() + ".png";
    }

    // Check if the directory is writable or accessible
    try {
      if (directoryPath) {
        await FilePicker.browse("data", directoryPath);
      } else {
        throw new Error("Original directory path is null.");
      }
    } catch (error) {
      console.warn("Directory is not writable, switching to miniMapNewTiles.");
      directoryPath = "miniMapNewTiles";

      try {
        await FilePicker.browse("data", directoryPath);
      } catch (error) {
        if (error.message.includes("does not exist")) {
          await FilePicker.createDirectory("data", directoryPath);
        } else {
          ui.notifications.error("Error accessing or creating the fallback directory.");
          return;
        }
      }
    }

    const file = new File([blob], fileName, { type: 'image/png' });
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      const cacheBustedPath = `${stripCacheBusting(response.path)}?${Date.now()}`;
      if (type === 'prototypeToken') {
        await minipaintDoc.update({ "prototypeToken.texture.src": cacheBustedPath });
      } else {
        await minipaintDoc.update({ "img": cacheBustedPath });
      }
      ui.notifications.info("Image updated successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
}


async function replaceItemTexture() {
  const iframe = document.getElementById('myFrame');
  const item = window.minipaintItem;

  if (!item) {
    ui.notifications.error("No item is currently being edited.");
    return;
  }

  let originalImagePath = stripCacheBusting(item.img);
  let directoryPath = originalImagePath ? originalImagePath.substring(0, originalImagePath.lastIndexOf('/')) : null;
  let fileName = originalImagePath ? originalImagePath.substring(originalImagePath.lastIndexOf("/") + 1) : generateRandomFilename() + ".png";

  // If the original file is an SVG, we rename it and convert it to PNG
  if (fileName.endsWith(".svg")) {
    fileName = generateRandomFilename() + ".png";
  }

  // Check if the directory is within the system or module directories
  if (directoryPath && (directoryPath.startsWith('systems/') || directoryPath.startsWith('modules/'))) {
    console.warn("Saving to a system or module directory is unsafe. Redirecting to miniMapNewTiles.");
    directoryPath = "miniMapNewTiles";
  }

  // Check if the directory is writable or accessible
  try {
    await FilePicker.browse("data", directoryPath);
  } catch (error) {
    console.warn("Directory is not writable, switching to miniMapNewTiles.");
    directoryPath = "miniMapNewTiles";

    try {
      await FilePicker.browse("data", directoryPath);
    } catch (error) {
      if (error.message.includes("does not exist")) {
        await FilePicker.createDirectory("data", directoryPath);
      } else {
        ui.notifications.error("Error accessing or creating the fallback directory.");
        return;
      }
    }
  }

  const canvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!canvas) {
    ui.notifications.error("Canvas not found.");
    return;
  }

  // If fromInv is true, prompt for a new file name
  if (window.fromInv) {
    new Dialog({
      title: "Enter New Image Name",
      content: `<form>
                  <div class="form-group">
                    <label>New Image Name:</label>
                    <input type="text" id="new-image-name" value="${item.name}" />
                  </div>
                </form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: async html => {
            const input = html.find('#new-image-name').val();
            if (!input) {
              ui.notifications.error("You must enter a valid name.");
              return;
            }

            fileName = `${input}.png`; // Assuming PNG, change if needed

            canvas.toBlob(async (blob) => {
              if (!blob) {
                ui.notifications.error("Failed to create a Blob from the canvas.");
                return;
              }

              const file = new File([blob], fileName, { type: 'image/png' });
              const response = await FilePicker.upload("data", directoryPath, file, {});

              if (response.path) {
                const cacheBustedPath = `${response.path}?${Date.now()}`;
                await item.update({ img: cacheBustedPath });
                ui.notifications.info("Item image replaced successfully.");
              } else {
                ui.notifications.error("Failed to upload the modified image.");
              }
            }, "image/png");
          }
        },
        cancel: {
          label: "Cancel"
        }
      }
    }).render(true);
  } else {
    // Regular behavior
    canvas.toBlob(async (blob) => {
      if (!blob) {
        ui.notifications.error("Failed to create a Blob from the canvas.");
        return;
      }

      const file = new File([blob], fileName, { type: 'image/png' });
      const response = await FilePicker.upload("data", directoryPath, file, {});

      if (response.path) {
        const cacheBustedPath = `${stripCacheBusting(response.path)}?${Date.now()}`;
        await item.update({ img: cacheBustedPath });
        ui.notifications.info("Item image replaced successfully.");
      } else {
        ui.notifications.error("Failed to upload the modified image.");
      }
    }, "image/png");
  }
}



function loadImageIntoMiniPaint(imageSrc) {
  // Strip the cache-busting query string, if present
  const cleanSrc = imageSrc.split('?')[0];
  
  // Add a cache-busting query string
  const cacheBustedSrc = `${cleanSrc}?${Date.now()}`;
  
  const image = new Image();
  image.src = cacheBustedSrc;

  image.onload = () => {
    const Layers = document.getElementById('myFrame').contentWindow.Layers;
    const name = cleanSrc.replace(/^.*[\\\/]/, ''); // Use cleanSrc to name the layer
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
    ui.notifications.error("Failed to load the image.");
  };
}

// Function to load the selected tile as a layer into miniPaint
async function loadSelected() {
  const selectedTokens = canvas.tokens.controlled;
  const selectedTiles = canvas.tiles.controlled;

  if (selectedTokens.length === 1) {
    const token = selectedTokens[0];
    const tokenSrc = token.document.texture.src;

    if (!tokenSrc) {
      ui.notifications.error("Token image source not found.");
      return;
    }

    loadImageIntoMiniPaint(tokenSrc);

  } else if (selectedTiles.length === 1) {
    const tile = selectedTiles[0];
    const tileSrc = tile.document.texture.src;

    if (!tileSrc) {
      ui.notifications.error("Tile image source not found.");
      return;
    }

    loadImageIntoMiniPaint(tileSrc);

  } else {
    ui.notifications.warn("Please select exactly one token or tile.");
  }
}

async function loadActorTexture(textureSrc) {
  
  loadImageIntoMiniPaint(textureSrc);
}
// Function to load the item texture as a layer into miniPaint
async function loadItemTexture(textureSrc) {
  loadImageIntoMiniPaint(textureSrc);
}
// Function to browse Foundry file picker and load the selected image as a layer
async function browseFoundry() {
  const picker = new FilePicker({
    type: "image",
    callback: (path) => {
      if (!path) {
        ui.notifications.warn("No image selected.");
        return;
      }

      loadImageIntoMiniPaint(path);
    },
    top: 100,
    left: 100,
    button: "Browse"
  });

  picker.render(true);
}
// Function to load the GIF as an ArrayBuffer
function loadGifAsArrayBuffer(gifUrl) {
  return fetch(gifUrl)
      .then(response => response.arrayBuffer())
      .then(buffer => new Uint8Array(buffer));
}

// Function to extract frames from the GIF, handling transparency and disposal
function extractFramesFromGif(gifArrayBuffer) {
  const gifReader = new GifReader(gifArrayBuffer);
  const extractedFrames = [];
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  tempCanvas.width = gifReader.width;
  tempCanvas.height = gifReader.height;

  const previousImageData = tempCtx.createImageData(gifReader.width, gifReader.height);

  for (let frameIndex = 0; frameIndex < gifReader.numFrames(); frameIndex++) {
      const frameInfo = gifReader.frameInfo(frameIndex);

      if (frameInfo.disposal === 2 || frameInfo.disposal === 3) {
          // Clear canvas if disposal method is 2 (restore to background color)
          // or 3 (restore to previous frame)
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      } else if (frameInfo.disposal === 1) {
          // Restore previous image data for disposal method 1 (do not dispose)
          tempCtx.putImageData(previousImageData, 0, 0);
      }

      const frameImageData = tempCtx.getImageData(0, 0, gifReader.width, gifReader.height);
      gifReader.decodeAndBlitFrameRGBA(frameIndex, frameImageData.data);
      tempCtx.putImageData(frameImageData, 0, 0);

      // Save the current image data for potential reuse
      tempCtx.drawImage(tempCanvas, 0, 0);
      previousImageData.data.set(frameImageData.data);

      // Store the frame as a data URL
      const frameDataUrl = tempCanvas.toDataURL();
      extractedFrames.push(frameDataUrl);
  }

  return extractedFrames;
}


// Function to add each frame as a new layer in MiniPaint
function addFramesAsLayersToMiniPaint(framesDataUrls) {
  const Layers = document.getElementById('myFrame').contentWindow.Layers;

  framesDataUrls.forEach((frameDataUrl, frameNumber) => {
      const img = new Image();
      img.src = frameDataUrl;

      img.onload = () => {
          const name = `GIF Frame ${frameNumber + 1}`;
          const new_layer = {
              name: name,
              type: 'image',
              data: img,
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
              width_original: img.naturalWidth || img.width,
              height_original: img.naturalHeight || img.height,
          };
          Layers.insert(new_layer);
      };

      img.onerror = () => {
          ui.notifications.error(`Failed to load frame ${frameNumber + 1} of the GIF.`);
      };
  });
}

// Function to open the FilePicker and load a GIF
async function browseAndOpenGifInMiniPaint() {
const picker = new FilePicker({
  type: "image",
  callback: (path) => {
    if (!path) {
      ui.notifications.warn("No image selected.");
      return;
    }

    // Load the selected GIF file into MiniPaint
    loadGifAsArrayBuffer(path).then(gifArrayBuffer => {
        const framesDataUrls = extractFramesFromGif(gifArrayBuffer);
        addFramesAsLayersToMiniPaint(framesDataUrls);
    });
  },
  top: 100,
  left: 100,
  button: "Browse"
});

picker.render(true);
}

// Function to be called when "Open GIF" menu item is clicked
function openGif() {
  browseAndOpenGifInMiniPaint();
}

// Usage example - remove hardcoded GIF URL and replace with dynamic file picker


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

  //  ui.notifications.info("ImagePopout opened successfully.");
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
async function removeBackgroundAndAddLayer() {
  // Step 1: Prepare the Image from the Canvas
  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Get the API key from settings
  const apiKey = game.settings.get('minipaint', 'removeBgApiKey');

  if (!apiKey) {
    ui.notifications.error("API key for remove.bg is not set. Please configure it in the module settings.");
    return;
  }

  // Convert the canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    try {
      // Step 2: Send the Image to the Remove.bg API
      const formData = new FormData();
      formData.append("size", "auto");
      formData.append("image_file", blob);

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      // Step 3: Receive the Processed Image
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      // Convert base64 string to an Image object
      const processedImage = new Image();
      processedImage.src = `data:image/png;base64,${base64String}`;

      // Step 4: Add the Image as a New Layer in miniPaint
      processedImage.onload = () => {
        const Layers = iframe.contentWindow.Layers;
        const new_layer = {
          name: "Removed Background Layer",
          type: 'image',
          data: processedImage,
          width: processedImage.naturalWidth || processedImage.width,
          height: processedImage.naturalHeight || processedImage.height,
          width_original: processedImage.naturalWidth || processedImage.width,
          height_original: processedImage.naturalHeight || processedImage.height,
        };
        Layers.insert(new_layer);

        ui.notifications.info("Background removed and new layer added successfully.");
      };

      // Step 5: Fetch the Account Info to Check Remaining Free API Calls
      const accountInfo = await fetch("https://api.remove.bg/v1.0/account", {
        method: "GET",
        headers: { "X-Api-Key": apiKey }
      });

      if (accountInfo.ok) {
        const accountData = await accountInfo.json();
        const remainingFreeCalls = accountData.data.attributes.api.free_calls;
        ui.notifications.warn(`You have ${remainingFreeCalls} free remove.bg uses left.`);
      } else {
        throw new Error("Failed to retrieve account info.");
      }

    } catch (error) {
      console.error("Error removing background or fetching account info:", error);
      ui.notifications.error("Failed to remove the background or fetch remaining uses. Check console for details.");
    }

  }, "image/png");
}
async function applySketchEffect() {
  const apiKey = game.settings.get('minipaint', 'stabilityAiApiKey');
  if (!apiKey) {
    ui.notifications.error("API key for Stability AI is not set. Please configure it in the module settings.");
    return;
  }

  let prompt = await new Promise((resolve) => {
    new Dialog({
      title: "Enter Prompt for Sketch Effect",
      content: `<div><label>Prompt:</label><input type="text" id="sketch-prompt" style="width: 100%;"></div>`,
      buttons: {
        ok: {
          label: "Apply",
          callback: (html) => resolve(html.find('#sketch-prompt').val())
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok",
    }).render(true);
  });

  if (!prompt) {
    ui.notifications.warn("Sketch effect cancelled.");
    return;
  }

  try {
    const iframe = document.getElementById('myFrame');
    const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

    if (!minipaintCanvas) {
      throw new Error("Could not find the miniPaint canvas.");
    }

    const blob = await new Promise(resolve => minipaintCanvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("Failed to create a Blob from the canvas.");
    }

    const formData = new FormData();
    formData.append("image", blob);
    formData.append("prompt", prompt);
    formData.append("control_strength", "0.7");
    formData.append("output_format", "png");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/control/sketch", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log("API Response Data:", responseData);

    // Check if the image is returned in the response
    if (responseData.image) {
      const base64String = responseData.image;
      
      // Convert the base64 string to an Image object
      const processedImage = new Image();
      processedImage.src = `data:image/png;base64,${base64String}`;

      processedImage.onload = () => {
        const Layers = iframe.contentWindow.Layers;
        const new_layer = {
          name: "Sketch Effect Layer",
          type: 'image',
          data: processedImage,
          width: processedImage.naturalWidth || processedImage.width,
          height: processedImage.naturalHeight || processedImage.height,
          width_original: processedImage.naturalWidth || processedImage.width,
          height_original: processedImage.naturalHeight || processedImage.height,
        };
        Layers.insert(new_layer);

        ui.notifications.info("Sketch effect applied and new layer added successfully.");
      };
    } else {
      throw new Error("No image returned by the API.");
    }

  } catch (error) {
    console.error("Error applying sketch effect:", error);
    ui.notifications.error("Failed to apply the sketch effect. Check console for details.");
  }
}
async function removeBackgroundUsingStabilityAI() {
  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    try {
      const apiKey = game.settings.get('minipaint', 'stabilityAiApiKey');

      if (!apiKey) {
        ui.notifications.error("API key for Stability AI is not set. Please configure it in the module settings.");
        return;
      }

      // Prepare the form data
      const formData = new FormData();
      formData.append("image", blob);
      formData.append("output_format", "png"); // You can change this to "webp" if needed

      // Send the request to the Stability AI API
      const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/remove-background", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (!responseData.image) {
        throw new Error("No image returned by the API.");
      }

      // Convert the base64 string to an Image object
      const processedImage = new Image();
      processedImage.src = `data:image/png;base64,${responseData.image}`;

      // Add the processed image as a new layer
      processedImage.onload = () => {
        const Layers = iframe.contentWindow.Layers;
        const new_layer = {
          name: "Removed Background Layer",
          type: 'image',
          data: processedImage,
          width: processedImage.naturalWidth || processedImage.width,
          height: processedImage.naturalHeight || processedImage.height,
          width_original: processedImage.naturalWidth || processedImage.width,
          height_original: processedImage.naturalHeight || processedImage.height,
        };
        Layers.insert(new_layer);

        ui.notifications.info("Background removed and new layer added successfully.");
      };

    } catch (error) {
      console.error("Error applying background removal effect:", error);
      ui.notifications.error("Failed to remove the background. Check console for details.");
    }
  }, "image/png");
}
async function searchAndReplace() {
  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  const { prompt, searchPrompt } = await new Promise((resolve) => {
    let formContent = `
      <div>
        <label for="promptInput" style="display: block; margin-bottom: 5px;">What do you want to create in the image?</label>
        <input type="text" id="promptInput" style="width: 100%; margin-bottom: 15px;" />
        <label for="searchPromptInput" style="display: block; margin-bottom: 5px;">What do you want to replace in the image?</label>
        <input type="text" id="searchPromptInput" style="width: 100%;" />
      </div>
    `;

    new Dialog({
      title: "Search and Replace",
      content: formContent,
      buttons: {
        yes: {
          label: "OK",
          callback: (html) => resolve({
            prompt: html.find('#promptInput').val(),
            searchPrompt: html.find('#searchPromptInput').val(),
          }),
        },
        no: {
          label: "Cancel",
          callback: () => resolve({ prompt: null, searchPrompt: null }),
        },
      },
      default: "yes",
    }).render(true);
  });

  if (!prompt || !searchPrompt) {
    ui.notifications.error("Prompt or search prompt cannot be empty.");
    return;
  }

  // Convert the canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    try {
      const apiKey = game.settings.get('minipaint', 'stabilityAiApiKey');

      if (!apiKey) {
        ui.notifications.error("API key for Stability AI is not set. Please configure it in the module settings.");
        return;
      }

      const formData = new FormData();
      formData.append("image", blob);
      formData.append("prompt", prompt);
      formData.append("search_prompt", searchPrompt);
      formData.append("output_format", "png"); // You can change this to "webp" if needed

      // Send the request to the Stability AI API
      const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/search-and-replace", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (!responseData.image) {
        throw new Error("No image returned by the API.");
      }

      // Convert the base64 string to an Image object
      const processedImage = new Image();
      processedImage.src = `data:image/png;base64,${responseData.image}`;

      // Add the processed image as a new layer
      processedImage.onload = () => {
        const Layers = iframe.contentWindow.Layers;
        const new_layer = {
          name: "Search and Replace Layer",
          type: 'image',
          data: processedImage,
          width: processedImage.naturalWidth || processedImage.width,
          height: processedImage.naturalHeight || processedImage.height,
          width_original: processedImage.naturalWidth || processedImage.width,
          height_original: processedImage.naturalHeight || processedImage.height,
        };
        Layers.insert(new_layer);

        ui.notifications.info("Search and Replace applied and new layer added successfully.");
      };

    } catch (error) {
      console.error("Error applying search and replace effect:", error);
      ui.notifications.error("Failed to apply the search and replace effect. Check console for details.");
    }
  }, "image/png");
}
function open_tokenframe() {
  // Access the miniPaint iframe and its FileOpen function
  var miniPaint = document.getElementById('myFrame').contentWindow;
  var miniPaint_FileOpen = miniPaint.FileOpen;

  // Fetch the JSON file
  window.fetch("modules/minipaint/images/tokenframe.json").then(function(response) {
      return response.json();
  }).then(function(json) {
      // Load the JSON data into miniPaint
      miniPaint_FileOpen.load_json(json, false);
      console.log("JSON file loaded successfully.");
  }).catch(function(ex) {
      alert('Sorry, image could not be loaded.');
      console.error("Error loading JSON file:", ex);
  });
}
function open_mask() {
  // Access the miniPaint iframe and its relevant functions
  var miniPaint = document.getElementById('myFrame').contentWindow;
  var miniPaint_FileOpen = miniPaint.FileOpen;
  var Layers = miniPaint.Layers;

  // Fetch the JSON file
  window.fetch("modules/minipaint/images/mask.json").then(function(response) {
      return response.json();
  }).then(function(json) {
      // Extract the layers from the JSON file
      var newLayers = json.layers || [];

      // Add each new layer to the existing layers in MiniPaint
      newLayers.forEach(function(layer) {
          // Ensure the layer data is compatible with MiniPaint's layer structure
          layer = {
              ...layer,
              x: layer.x || 0,
              y: layer.y || 0,
              width_original: layer.width,
              height_original: layer.height,
              visible: layer.visible !== false, // default to true if not specified
          };

          // Insert the new layer into MiniPaint
          Layers.insert(layer);
      });

      console.log("New layers added successfully from JSON.");
  }).catch(function(ex) {
      alert('Sorry, image could not be loaded.');
      console.error("Error loading JSON file:", ex);
  });
}

function openFrame1() {
  openFrame('modules/minipaint/images/ringsimple1.json');
}
function openFrame2() {
  openFrame('modules/minipaint/images/ringsimple2.json');
}
function openFrame3() {
  openFrame('modules/minipaint/images/ringsimple3.json');
}
function openFrame4() {
  openFrame('modules/minipaint/images/tokenhead.json');
}
// Generic function to open any frame JSON file
function openFrame(jsonPath) {
  // Access the miniPaint iframe and its FileOpen function
  var miniPaint = document.getElementById('myFrame').contentWindow;
  var miniPaint_FileOpen = miniPaint.FileOpen;

  // Fetch the JSON file
  window.fetch(jsonPath).then(function(response) {
      return response.json();
  }).then(function(json) {
      // Load the JSON data into miniPaint
      miniPaint_FileOpen.load_json(json, false);
      console.log("JSON file loaded successfully.");
  }).catch(function(ex) {
      alert('Sorry, image could not be loaded.');
      console.error("Error loading JSON file:", ex);
  });
}

// Function to add miniPaint option to the dnd5e item context menu in actor inventories
Hooks.on("dnd5e.getItemContextOptions", (item, options) => {
  createMiniPaintContextForInventory(item, options);
});

function createMiniPaintContextForInventory(item, options) {
  options.push({
    name: "miniPaint Edit",
    icon: '<i class="fas fa-paint-brush"></i>',
    callback: async () => {
      const imgPath = item.img;

      if (!imgPath) {
        ui.notifications.error("Item does not have an associated image.");
        return;
      }

      // Open miniPaint and load the image as a new layer
      await launchMiniPaintForItem(item, imgPath, true); // fromInv = true
    },
  });
}



// Function to register the context menu for items
// Function to register the context menu for items in the item directory
function registerMiniPaintContextMenu() {
  Hooks.on('getItemDirectoryEntryContext', (html, options) => {
    options.push({
      name: "miniPaint Edit",
      icon: '<i class="fas fa-paint-brush"></i>',
      condition: true,
      callback: async li => {
        const itemId = li.data("document-id");
        const item = game.items.get(itemId);

        if (!item) {
          ui.notifications.error("Could not find the item.");
          return;
        }

        const imgPath = item.img;

        if (!imgPath) {
          ui.notifications.error("Item does not have an associated image.");
          return;
        }

        // Open miniPaint and load the image as a new layer
        await launchMiniPaintForItem(item, imgPath, false); // fromInv = false
      }
    });
  });
}

// Function to launch miniPaint for editing an item's image

// Function to launch miniPaint for editing an item's image
async function launchMiniPaintForItem(item, imgPath, fromInv = false) {
  // Set global variables to track the current item and its source
  window.tidyType = null;
  window.minipaintItem = item;
  window.fromInv = fromInv; // Set the fromInv flag

  if (!imgPath) {
    ui.notifications.error("Image source not found.");
    return;
  }

  // Open miniPaint
  await openMiniPaint();

  // Wait until miniPaint is loaded and then load the image
  waitForMiniPaintToLoad(() => {
    loadItemTexture(imgPath);
  });
}


// Register the context menu option
registerMiniPaintContextMenu();

async function applyInpaintToken() {
  const apiKey = game.settings.get('minipaint', 'stabilityAiApiKey');

  if (!apiKey) {
    ui.notifications.error("API key for Stability AI is not set. Please configure it in the module settings.");
    return;
  }

  const prompt = await new Promise((resolve) => {
    new Dialog({
      title: "Inpaint Prompt",
      content: `
        <form>
          <div class="form-group">
            <label>Describe your character (it will create a front portrait zoomed in on the face)</label>
            <input type="text" name="prompt" placeholder="a female elf wizard wearing a golden blue dress, she has curly red hair" required>
          </div>
        </form>
      `,
      buttons: {
        ok: {
          label: "Apply",
          callback: (html) => resolve(html.find('input[name="prompt"]').val())
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok"
    }).render(true);
  });

  if (!prompt) {
    return;
  }

  // Prepend and append the required text to the user's prompt
  const fullPrompt = `the zoomed-in front face drawing portrait of ${prompt}, the head going over the token frame ring`;

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    try {
      // Prepare the FormData
      const formData = new FormData();
      formData.append("image", blob); // Image to be inpainted
      formData.append("prompt", fullPrompt); // Inpainting prompt with added text

      const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/inpaint", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (responseData.image) {
        const processedImage = new Image();
        processedImage.src = `data:image/png;base64,${responseData.image}`;

        processedImage.onload = () => {
          const Layers = iframe.contentWindow.Layers;
          const new_layer = {
            name: "Inpainted Layer",
            type: 'image',
            data: processedImage,
            width: processedImage.naturalWidth || processedImage.width,
            height: processedImage.naturalHeight || processedImage.height,
            width_original: processedImage.naturalWidth || processedImage.width,
            height_original: processedImage.naturalHeight || processedImage.height,
          };
          Layers.insert(new_layer);
          ui.notifications.info("Inpainting applied and new layer added successfully.");
        };
      } else {
        throw new Error("No image returned by the API.");
      }
    } catch (error) {
      console.error("Error applying inpaint effect:", error);
      ui.notifications.error("Failed to apply the inpaint effect. Check console for details.");
    }

  }, "image/png"); // Ensure the image is in PNG format
}

async function applyInpaintRing() {
  const apiKey = game.settings.get('minipaint', 'stabilityAiApiKey');

  if (!apiKey) {
    ui.notifications.error("API key for Stability AI is not set. Please configure it in the module settings.");
    return;
  }

  const prompt = await new Promise((resolve) => {
    new Dialog({
      title: "Inpaint Prompt",
      content: `
        <form>
          <div class="form-group">
            <label>Describe your token ring</label>
            <input type="text" name="prompt" placeholder="red roses intertwined around vines" required>
          </div>
        </form>
      `,
      buttons: {
        ok: {
          label: "Apply",
          callback: (html) => resolve(html.find('input[name="prompt"]').val())
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok"
    }).render(true);
  });

  if (!prompt) {
    return;
  }

  // Prepend and append the required text to the user's prompt
  const fullPrompt = `a round token ring for roleplaying vtt game representing ${prompt}`;

  const iframe = document.getElementById('myFrame');
  const minipaintCanvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');

  if (!minipaintCanvas) {
    ui.notifications.error("Could not find the miniPaint canvas.");
    return;
  }

  // Convert the canvas content to a Blob
  minipaintCanvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    try {
      // Prepare the FormData
      const formData = new FormData();
      formData.append("image", blob); // Image to be inpainted
      formData.append("prompt", fullPrompt); // Inpainting prompt with added text

      const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/inpaint", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (responseData.image) {
        const processedImage = new Image();
        processedImage.src = `data:image/png;base64,${responseData.image}`;

        processedImage.onload = () => {
          const Layers = iframe.contentWindow.Layers;
          const new_layer = {
            name: "Inpainted Layer",
            type: 'image',
            data: processedImage,
            width: processedImage.naturalWidth || processedImage.width,
            height: processedImage.naturalHeight || processedImage.height,
            width_original: processedImage.naturalWidth || processedImage.width,
            height_original: processedImage.naturalHeight || processedImage.height,
          };
          Layers.insert(new_layer);
          ui.notifications.info("Inpainting applied and new layer added successfully.");
        };
      } else {
        throw new Error("No image returned by the API.");
      }
    } catch (error) {
      console.error("Error applying inpaint effect:", error);
      ui.notifications.error("Failed to apply the inpaint effect. Check console for details.");
    }

  }, "image/png"); // Ensure the image is in PNG format
}

async function saveAnimation() {
  const iframe = document.getElementById('myFrame');
  
  if (!iframe) {
      console.error("Could not find the iframe with ID 'myFrame'.");
      return;
  }

  const miniPaintWindow = iframe.contentWindow;
  
  if (!miniPaintWindow) {
      console.error("Could not access the iframe content window.");
      return;
  }

  const Layers = miniPaintWindow.Layers;
  if (!Layers) {
      console.error("Could not access Layers object from the iframe.");
      return;
  }

  const allLayers = Layers.get_layers();

  if (allLayers.length === 0) {
      ui.notifications.warn("No layers to save.");
      return;
  }

  // Simulate clicking the "Reset zoom level" button
  const resetZoomButton = miniPaintWindow.document.getElementById('zoom_100');
  if (resetZoomButton) {
      resetZoomButton.click();
  } else {
      console.error("Could not find the zoom reset button.");
      return;
  }

  // Wait a short moment to ensure the zoom reset completes
  await new Promise(resolve => setTimeout(resolve, 500));

  // Retrieve delay value from the input field
  let delay = 150; // default delay

  const delayInput = miniPaintWindow.document.querySelector('input[type="number"][aria-labelledby="attribute_label_delay"]');
  if (delayInput && delayInput.value) {
      delay = parseInt(delayInput.value);
      if (isNaN(delay) || delay < 1 || delay > 999) {
          delay = 150; // Fallback to default if the value is out of range
      }
  }

  // Create a GIF encoder
  const gif = new GIF({
      workers: 4,
      quality: 15,
      workerScript: 'modules/minipaint/js/gif.worker.js',
      dither: 'Atkinson-serpentine',
      debug: true
  });

  const canvas = Layers.canvas;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  for (let i = allLayers.length - 1; i >= 0; i--) {
      const layer = allLayers[i];

      // Create an offscreen canvas to capture the layer's content
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvasWidth;
      offscreenCanvas.height = canvasHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');

      // Clear the offscreen canvas
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

      // Use the render_object function to draw the layer
      Layers.render_object(offscreenCtx, layer);
      gif.addFrame(offscreenCanvas, { delay: delay, copy: true });
  }

  // Render the GIF and save it to Foundry
  gif.on('finished', async function (blob) {
      // Prompt for filename
      const dialogContent = `
          <div>
              <label for="filename">Enter a filename (with extension, e.g., animation.gif):</label>
              <input type="text" id="filename" name="filename" value="animation.gif" style="width:100%" />
          </div>
      `;

      new Dialog({
          title: "Save Animated GIF to Foundry",
          content: dialogContent,
          buttons: {
              save: {
                  label: "Save",
                  callback: async (html) => {
                      let fileName = html.find('input[name="filename"]').val();

                      // Validate the file extension
                      const validExtensions = ['gif'];
                      let extension = fileName.split('.').pop().toLowerCase();

                      if (!validExtensions.includes(extension)) {
                          ui.notifications.error('Invalid file extension. Please use .gif');
                          return;
                      }

                      // Set the directory to miniMapNewTiles
                      const directoryPath = "miniMapNewTiles";

                      // Ensure the directory exists
                      try {
                          await FilePicker.browse("data", directoryPath);
                      } catch (error) {
                          if (error.message.includes("does not exist")) {
                              try {
                                  await FilePicker.createDirectory("data", directoryPath);
                              } catch (creationError) {
                                  ui.notifications.error("Failed to create the miniMapNewTiles directory.");
                                  return;
                              }
                          } else {
                              ui.notifications.error("Error accessing the miniMapNewTiles directory.");
                              return;
                          }
                      }

                      // Create a File object from the Blob with the provided filename
                      const file = new File([blob], fileName, { type: 'image/gif' });

                      // Upload the GIF file, overwriting if it already exists
                      const response = await FilePicker.upload("data", directoryPath, file, {});

                      if (response.path) {
                          ui.notifications.info(`Animation saved successfully as ${fileName} in ${directoryPath}.`);
                      } else {
                          ui.notifications.error("Failed to save the GIF to Foundry.");
                      }
                  }
              },
              cancel: {
                  label: "Cancel"
              }
          },
          default: "save"
      }).render(true);
  });

  gif.render();
}

