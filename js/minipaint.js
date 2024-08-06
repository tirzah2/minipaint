//seCKsBzKNhggbcp2XPphkYDv
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

// Function to register the context menu for items
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
        await launchMiniPaintForItem(item, imgPath);
      }
    });
  });
}

// Function to launch miniPaint for editing an item's image
async function launchMiniPaintForItem(item, imgPath) {
  // Check if the image path is valid
  window.minipaintItem = item;
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

// Function to load the item's image into miniPaint as a new layer
async function loadItemTexture(textureSrc) {
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
    console.log("Image added to miniPaint as a new layer.");
  };

  image.onerror = () => {
    ui.notifications.error("Failed to load the image.");
  };
}

// Register the context menu option
registerMiniPaintContextMenu();

async function replaceItemTexture() {
  const iframe = document.getElementById('myFrame');
  const item = window.minipaintItem;

  if (!item) {
    ui.notifications.error("No item is currently being edited.");
    return;
  }

  // Get the original image path
  const originalImagePath = item.img;
  const directoryPath = originalImagePath.substring(0, originalImagePath.lastIndexOf('/'));

  // Convert the miniPaint canvas content to a Blob
  const iframeDoc = iframe.contentWindow.document;
  const canvas = iframeDoc.querySelector('#canvas_minipaint');

  if (!canvas) {
    ui.notifications.error("Canvas not found.");
    return;
  }

  canvas.toBlob(async (blob) => {
    if (!blob) {
      ui.notifications.error("Failed to create a Blob from the canvas.");
      return;
    }

    // Generate a random filename
    const randomFilename = generateRandomFilename() + ".png";

    // Create a File object from the Blob with the random filename
    const file = new File([blob], randomFilename, { type: blob.type });

    // Upload the image file to the same directory as the original item image
    const response = await FilePicker.upload("data", directoryPath, file, {});

    if (response.path) {
      // Update the item with the new image source
      await item.update({ img: response.path });
      ui.notifications.info("Item image replaced successfully.");
    } else {
      ui.notifications.error("Failed to upload the modified image.");
    }
  }, "image/png");
}

