document.addEventListener("DOMContentLoaded", function () {
  const imageInputs = document.querySelectorAll(".crop-image-input");
  let cropper;
  let currentInput = null;
  let currentPreview = null;
  const cropperModal = new bootstrap.Modal(
    document.getElementById("cropperModal")
  );

  imageInputs.forEach((input) => {
    console.log("Binding input:", input); // ✅ Debug
    input.addEventListener("change", openCropperModal);
  });

  function openCropperModal(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log("File selected:", file.name); // ✅ Should log now

    currentInput = event.target;
    currentPreview = currentInput
      .closest(".row")
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

        setTimeout(() => {
          console.log("Showing modal..."); // ✅ Check
          cropperModal.show();
        }, 100);
      };
    };

    reader.readAsDataURL(file);
  }

  document
    .getElementById("cropImageBtn")
    .addEventListener("click", function () {
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

        cropperModal.hide();
        cropper.destroy();
        cropper = null;
      });
    });
});

function validateForm() {
  let isValid = true;
  document
    .querySelectorAll(".text-danger")
    .forEach((text) => (text.innerHTML = ""));

  const name = document.getElementById("nameinput").value.trim();
  const desc = document.getElementById("description").value.trim();
  const brand = document.getElementById("brands").value;
  const category = document.getElementById("category").value;
  const color = document.getElementById("color").value;
  const actualPrice = document.querySelector("input[name='actualPrice']").value;
  const discountPrice = document.querySelector(
    "input[name='discountPrice']"
  ).value;
  const quantity = document.querySelector("input[name='quantity']").value;

  const imageInputs = document.querySelectorAll(".crop-image-input");
  
  let imageCount = 0;

  imageInputs.forEach((input) => {
    if (input.files.length > 0) {
      
      imageCount++;
    }
  });

  if (!name) {
    document.getElementById("nameerror").innerText = "Name is needed";
    isValid = false;
  }
  if (!desc) {
    document.getElementById("descriptionerror").innerText =
      "Description is needed";
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
    document.getElementById("acpriceerror").innerText =
      "Enter a valid Actual Price!";
    isValid = false;
  }
  if (!parseFloat(discountPrice) || parseFloat(discountPrice) <= 0) {
    document.getElementById("dcpriceerror").innerText =
      "Enter a valid Discount Price!";
    isValid = false;
  } else if (parseFloat(discountPrice)>= parseFloat(actualPrice)) {
    document.getElementById("dcpriceerror").innerText =
      "Discount Price must be lesser than actual price";
    isValid = false;
  }

  if (!quantity || quantity <0) {
    document.getElementById("quantityerror").innerText =
      "Enter a valid quantity!";
    isValid = false;
  }
  
  // if (imageCount < 3) {
  //   document.getElementById("imageerror").innerText =
  //     "At least three image is required.";
  //   isValid = false;
  // }

  if (!isValid) {
    const firstError = document.querySelector(".text-danger:not(:empty)");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth" });
  }

  return isValid;
}
