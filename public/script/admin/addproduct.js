  
function validateForm() {
  let isValid = true;

  document.querySelectorAll(".text-danger").forEach(el => el.innerText = "");

  const name = document.getElementById("productName").value.trim();
  const desc = document.getElementById("productDescription").value.trim();
  const brand = document.getElementById("brands").value;
  const category = document.getElementById("category").value;
  const actualPrice = document.querySelector('input[name="actualPrice"]').value;
  const discountPrice = document.querySelector("input[name='discountPrice']").value;
  const color = document.getElementById("color").value;

  const mediumQty = parseInt(document.getElementById("mediumQty").value)||0;
  const largeQty = parseInt(document.getElementById("largeQty").value)||0;
  const xlQty = parseInt(document.getElementById("xlQty").value)||0;

  const imageInputs = document.querySelectorAll(".crop-image-input");
  let imageCount = 0;
  imageInputs.forEach(input => { if(input.files.length > 0) imageCount++; });

  if (!name) { document.getElementById("nameError").innerText = "Product name is required"; isValid = false; }
  if (!desc) { document.getElementById("descError").innerText = "Product description is required"; isValid = false; }
  if (!brand) { document.getElementById("brandError").innerText = "Please select a brand"; isValid = false; }
  if (!category) { document.getElementById("categoryError").innerText = "Please select a category"; isValid = false; }
  if (!color) { document.getElementById("colorerror").innerText = "Enter a color"; isValid = false; }
  if (!parseFloat(actualPrice) || actualPrice <= 0) { document.getElementById("acPriceError").innerText = "Enter a valid Actual Price"; isValid = false; }
  if (!parseFloat(discountPrice) || discountPrice <= 0) { document.getElementById("dcPriceError").innerText = "Enter a valid Discount Price"; isValid = false; }
  else if (parseFloat(discountPrice) >= parseFloat(actualPrice)) { document.getElementById("dcPriceError").innerText = "Discount Price must be less than Actual Price"; isValid = false; }

  if (mediumQty==0 && largeQty==0 && xlQty==0) { document.getElementById("quantityError").innerText = "At least one size quantity required"; isValid = false; }


  if (imageCount < 3) { document.getElementById("imageError").innerText = "At least 3 images required"; isValid = false; }

  if (!isValid) {
    const firstError = document.querySelector(".text-danger:not(:empty)");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth" });
    return false; 
  }

  return true; 
}



  let cropper;
  let currentInput = null;
  let currentPreview = null;
  const cropperModal = new bootstrap.Modal(
    document.getElementById("cropperModal")
  );

  document.querySelectorAll(".crop-image-input").forEach((input) => {
    input.addEventListener("change", openCropperModal);
  });

  function openCropperModal(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedExtensions = ["jpeg","jpg","png","webp","gif","bmp","tiff"];
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.split('.').pop();

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"];

    
    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExt)) {
      
      event.target.value = "";

      
      Swal.fire({
        icon: "error",
        title: "Invalid file type",
        text: "Please upload a valid image (JPG, PNG, WebP, GIF, BMP, TIFF).",
      });
      return; 
    }

    currentInput = event.target;
    currentPreview = currentInput
      .closest(".image-box")
      .querySelector(".image-preview");

    const reader = new FileReader();
    reader.onload = function (e) {
      const image = document.getElementById("cropper-image");
      image.src = e.target.result;

      image.onload = function () {
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
          aspectRatio: NaN,
          dragMode: "move",
          viewMode: 0,
          cropBoxResizable: true,
          cropBoxMovable: true,
          left: 0,
          top: 0,
          responsive: true,
          autoCropArea: 1,
          rotatable: true,
          scalable: true,
          movable: true,
          zoomable: true,
          minContainerWidth: 400,
          minContainerHeight: 400,
          minCanvasWidth: 300,
          minCanvasHeight: 300,
        });

        cropperModal.show();
      };
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("cropImageBtn").addEventListener("click", function () {
    if (!cropper || !currentInput || !currentPreview) return;

    const canvas = cropper.getCroppedCanvas();

    canvas.toBlob((blob) => {
      const ext = blob.type.split("/")[1] || "jpg";
      const fileName = `cropped-${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      currentInput.files = dataTransfer.files;

      const previewImg = document.createElement("img");
      previewImg.src = URL.createObjectURL(blob);
      previewImg.style.width = "100%";
      previewImg.style.height = "100%";
      previewImg.style.objectFit = "cover";

      currentPreview.innerHTML = "";
      currentPreview.appendChild(previewImg);

      cropperModal.hide();
      cropper.destroy();
      cropper = null;
    });
  });
