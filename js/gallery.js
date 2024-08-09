class DynamicImageGalleryMP extends Application {
    constructor(options = {}) {
      super(options);
      this.imageFolders = ['miniMapNewTiles/frames', 'modules/minipaint/images/frames']; // List of image folders
      this.imagesPerPage = 20; // Number of images per page
      this.currentPage = 1; // Start on the first page
      this.allImages = []; // Initialize allImages as an empty array
    }
  
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: "Rings Browser",
        id: "dynamic-image-gallery",
        template: "modules/minipaint/templates/gallery.html", // Path to your template
        width: 800,
        height: 600,
        resizable: true,
      });
    }
  
    async getData() {
        this.allImages = []; // Reset images list
    
        // Load images from all folders
        for (const folder of this.imageFolders) {
          try {
            const response = await FilePicker.browse("data", folder);
            const images = response.files.map(file => ({
              src: `${folder}/${file.split('/').pop()}`,
              alt: file.split('/').pop()
            }));
            this.allImages = this.allImages.concat(images);
          } catch (error) {
            console.warn(`Error loading images from ${folder}:`, error);
          }
        }
    
        // Sort images alphabetically by name (optional)
        this.allImages.sort((a, b) => a.alt.localeCompare(b.alt));
    
        // Calculate pagination details
        const totalPages = Math.ceil(this.allImages.length / this.imagesPerPage);
        const start = (this.currentPage - 1) * this.imagesPerPage;
        const end = start + this.imagesPerPage;
        const images = this.allImages.slice(start, end);
    
        return {
          images,
          currentPage: this.currentPage,
          totalPages
        };
      }
  
    activateListeners(html) {
      super.activateListeners(html);
      html.find('.thumbnail').on('click', this._onThumbnailClick.bind(this));
      html.find('.pagination-previous').on('click', this._onPreviousPage.bind(this));
      html.find('.pagination-next').on('click', this._onNextPage.bind(this));
    }
  
    _onThumbnailClick(event) {
      const src = $(event.currentTarget).attr('data-src');
      this._loadImageAsLayer(src);
    }
  
    _loadImageAsLayer(src) {
      const iframe = document.getElementById('myFrame');
      const Layers = iframe.contentWindow.Layers;
  
      const image = new Image();
      image.src = src;
  
      image.onload = () => {
        const new_layer = {
          name: src.split('/').pop(),
          type: 'image',
          data: image,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          width_original: image.naturalWidth || image.width,
          height_original: image.naturalHeight || image.height,
        };
  
        Layers.insert(new_layer);
        ui.notifications.info(`Added ${new_layer.name} as a new layer.`);
      };
  
      image.onerror = () => {
        ui.notifications.error("Failed to load the image into miniPaint.");
      };
    }
  
    _onPreviousPage(event) {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    }
  
    _onNextPage(event) {
      if (this.currentPage < Math.ceil(this.allImages.length / this.imagesPerPage)) {
        this.currentPage++;
        this.render();
      }
    }
  }
  
  // Initialize and render the application
  const galleryMP = new DynamicImageGalleryMP();
  
  
  async function saveCanvasToFrames() {
    const iframe = document.getElementById('myFrame');
    const canvas = iframe.contentWindow.document.querySelector('#canvas_minipaint');
    const directoryPath = 'miniMapNewTiles/frames'; // Save location
  
    if (!canvas) {
      ui.notifications.error("Canvas not found.");
      return;
    }
  
    // Prompt for a new file name
    new Dialog({
      title: "Enter New Image Name",
      content: `<form>
                  <div class="form-group">
                    <label>New Image Name:</label>
                    <input type="text" id="new-image-name" placeholder="Enter image name (no extension)" />
                  </div>
                </form>`,
      buttons: {
        save: {
          label: "Save",
          callback: async html => {
            let input = html.find('#new-image-name').val().trim();
  
            // Validate input
            if (!input) {
              ui.notifications.error("You must enter a valid name.");
              return;
            }
  
            // Ensure no extension is added by the user
            if (input.includes('.')) {
              ui.notifications.error("Do not include an extension in the filename.");
              return;
            }
  
            const fileName = `${input}.png`;
  
            // Check if the file already exists
            const existingFiles = (await FilePicker.browse("data", directoryPath)).files;
            const existingFile = existingFiles.find(file => file.endsWith(fileName));
  
            if (existingFile) {
              // If the file exists, confirm overwrite
              new Dialog({
                title: "Overwrite File",
                content: `<p>A file named "${fileName}" already exists. Do you want to overwrite it?</p>`,
                buttons: {
                  yes: {
                    label: "Yes",
                    callback: async () => {
                      await saveBlobToFile(canvas, fileName, directoryPath);
                    }
                  },
                  no: {
                    label: "No"
                  }
                }
              }).render(true);
            } else {
              // Save the file if it doesn't exist
              await saveBlobToFile(canvas, fileName, directoryPath);
            }
          }
        },
        cancel: {
          label: "Cancel"
        }
      }
    }).render(true);
  }
  
  // Helper function to save the canvas blob to a file
  async function saveBlobToFile(canvas, fileName, directoryPath) {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        ui.notifications.error("Failed to create a Blob from the canvas.");
        return;
      }
  
      const file = new File([blob], fileName, { type: 'image/png' });
      const response = await FilePicker.upload("data", directoryPath, file, {});
  
      if (response.path) {
        ui.notifications.info(`Image "${fileName}" saved successfully to ${directoryPath}.`);
      } else {
        ui.notifications.error("Failed to upload the modified image.");
      }
    }, "image/png");
  }  
  