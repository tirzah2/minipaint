//seCKsBzKNhggbcp2XPphkYDv

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
  const textureSrc = type === 'prototypeToken' ? minipaintDoc.prototypeToken.texture.src : minipaintDoc.img;

  if (!textureSrc) {
    ui.notifications.error("Image source not found.");
    return;
  }

  await openMiniPaint(); // Open miniPaint

  waitForMiniPaintToLoad(() => {
    loadActorTexture(textureSrc);
    highlightRelevantButton(type); // Highlight the relevant button
  });
}

// Function to highlight the relevant button
function highlightRelevantButton(type) {
  const iframe = document.getElementById('myFrame');
  if (iframe && iframe.contentWindow) {
    const iframeDocument = iframe.contentWindow.document;
    const saveProtoButton = iframeDocument.querySelector('#main_menu_save_proto');
    const saveAIMGButton = iframeDocument.querySelector('#main_menu_save_actor_image');

    // Reset styles
    if (saveProtoButton) saveProtoButton.style.backgroundColor = '';
    if (saveAIMGButton) saveAIMGButton.style.backgroundColor = '';

    // Apply the specific style
    if (type === 'prototypeToken' && saveProtoButton) {
      saveProtoButton.style.backgroundColor = 'darkgreen'; // Adjust color as needed
    } else if (type === 'img' && saveAIMGButton) {
      saveAIMGButton.style.backgroundColor = 'darkgreen'; // Adjust color as needed
    }
  }
}

// Function to load the actor's prototype token or image into miniPaint
async function loadActorTexture(textureSrc) {
  const image = new Image();
  image.src = textureSrc;

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
    ui.notifications.error("Failed to load the image.");
  };
}

// Function to save the modified image back to the actor's prototype token or actor image
async function replaceActorTexture(type) {
  // Use the global minipaintDoc variable
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

    const directoryPath = type === 'prototypeToken'
      ? minipaintDoc.prototypeToken.texture.src.substring(0, minipaintDoc.prototypeToken.texture.src.lastIndexOf("/"))
      : minipaintDoc.img.substring(0, minipaintDoc.img.lastIndexOf("/"));
      
    const randomFilename = generateRandomFilename() + ".png";

    const file = new File([blob], randomFilename, { type: blob.type });
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      if (type === 'prototypeToken') {
        await minipaintDoc.update({ "prototypeToken.texture.src": response.path });
      } else {
        await minipaintDoc.update({ "img": response.path });
      }
     // ui.notifications.info("Image updated successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
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
       // ui.notifications.info("Image loaded as a layer successfully.");
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

    //  ui.notifications.info("Token image replaced successfully.");
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

