document.addEventListener("DOMContentLoaded", function () {
  const imageInputs = document.querySelectorAll(".crop-image-input");
  let cropper;
  let currentInput = null;
  let currentPreview = null;
  let croppedConfirmed = false; // ✅ track if user confirmed crop
  const cropperModalEl = document.getElementById("cropperModal");
  const cropperModal = new bootstrap.Modal(cropperModalEl);

  // Attach change event
  imageInputs.forEach((input) => {
    input.addEventListener("change", openCropperModal);
  });

  function openCropperModal(event) {
    const file = event.target.files[0];
    if (!file) return;

    currentInput = event.target;
    currentPreview = currentInput.closest(".row").querySelector(".image-preview");

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
          autoCropArea: 1,
          responsive: true,
          movable: true,
          zoomable: true,
          scalable: true,
          rotatable: true,
          minContainerWidth: 400,
          minContainerHeight: 400,
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
      const fileName = currentInput.files[0]?.name || "cropped.jpg";
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

      croppedConfirmed = true;
      cropperModal.hide();
    });
  });

 
  cropperModalEl.addEventListener("hidden.bs.modal", function () {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    
    if (!croppedConfirmed && currentInput) {
      currentInput.value = "";
    }
    croppedConfirmed = false;
  });
});



document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".delete-image-btn").forEach(btn => {
    btn.addEventListener("click", async function () {
      const img = this.dataset.image;
      const productId = this.dataset.product; 

      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This image will be deleted",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!"
      });

      if (result.isConfirmed) {
        // Remove from UI
        const preview = this.closest(".image-preview");
        if (preview) {
          const imgEl = preview.querySelector("img");
          if (imgEl) imgEl.remove();
        }

        try {
          // Send DELETE request to server
          const response = await fetch(`/admin/products/${productId}/delete-image`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ image: img })
          });

          const data = await response.json();

          if (data.success) {
            Swal.fire("Deleted!", "Image has been deleted.", "success");
          } else {
            Swal.fire("Error!", data.message || "Failed to delete image.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error!", "Something went wrong.", "error");
        }
      }
    });
  });
});




function validateForm() {
  let isValid = true;
  document.querySelectorAll(".text-danger").forEach((text) => (text.innerHTML = ""));

  const name = document.getElementById("nameinput").value.trim();
  const desc = document.getElementById("description").value.trim();
  const brand = document.getElementById("brands").value;
  const category = document.getElementById("category").value;
  const color = document.getElementById("color").value;
  const actualPrice = document.querySelector("input[name='actualPrice']").value;
  const discountPrice = document.querySelector("input[name='discountPrice']").value;
  const quantity = document.querySelector("input[name='quantity']").value;

  const imageInputs = document.querySelectorAll(".crop-image-input");
  let newImageCount = 0;

  imageInputs.forEach((input) => {
    if (input.files.length > 0) {
      newImageCount++;
    }
  });

  // count existing previews that are still in DOM (not deleted)
  const existingImagesCount = document.querySelectorAll(".image-preview img").length;

  const totalImages = existingImagesCount + newImageCount;

  if (!name) {
    document.getElementById("nameerror").innerText = "Name is needed";
    isValid = false;
  }
  if (!desc) {
    document.getElementById("descriptionerror").innerText = "Description is needed";
    isValid = false;
  }
  if (!brand) {
    document.getElementById("branderror").innerText = "Select one brand";
    isValid = false;
  }
  if (!category) {
    document.getElementById("categoryerror").innerText = "Select one category";
    isValid = false;
  }
  if (!color) {
    document.getElementById("colorerror").innerText = "Color is needed";
    isValid = false;
  }
  if (!parseFloat(actualPrice) || parseFloat(actualPrice) <= 0) {
    document.getElementById("acpriceerror").innerText = "Enter a valid Actual Price!";
    isValid = false;
  }
  if (!parseFloat(discountPrice) || parseFloat(discountPrice) <= 0) {
    document.getElementById("dcpriceerror").innerText = "Enter a valid Discount Price!";
    isValid = false;
  } else if (parseFloat(discountPrice) >= parseFloat(actualPrice)) {
    document.getElementById("dcpriceerror").innerText = "Discount Price must be lesser than actual price";
    isValid = false;
  }

  if (!quantity || quantity < 0) {
    document.getElementById("quantityerror").innerText = "Enter a valid quantity!";
    isValid = false;
  }

  // ✅ Check minimum 3 images (existing + new)
  if (totalImages < 3) {
    document.getElementById("imageerror").innerText = "At least three images are required.";
    isValid = false;
  }

  if (!isValid) {
    const firstError = document.querySelector(".text-danger:not(:empty)");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth" });
  }

  return isValid;
}
