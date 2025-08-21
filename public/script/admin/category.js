function clearSearch() {
  document.querySelector('input[name="search"]').value = "";
  document.getElementById("searchForm").submit();
}


function handleFormSubmit(event) {
  event.preventDefault();
  if (!validateForm()) {
    return;
  }
  const name = document.getElementsByName("name")[0].value;
  const description = document.getElementById("descriptionId").value;
  if (name && description) {
    
    fetch("/admin/category/add", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, description }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error);
          });
        }
        return res.json();
      })
      .then((data) => {
        location.reload();
      })
      .catch((err) => {
        if (err.message === "Category already Exists") {
          Swal.fire({
            icon: "error",
            title: "Oops",
            text: "Category already exists",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops",
            text: "An error occured while adding  the category",
          });
        }
      });
  }
}

function validateForm() {
  clearErrorMessage();
  const name = document.getElementsByName("name")[0].value.trim();
  const description = document.getElementById("descriptionId").value.trim();

  let isValid = true;

  if (name === "") {
    displayErrorMessage("name-error", "Please enter a name");
    isValid = false;
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    displayErrorMessage(
      "name-error",
      "Category name should contain only alphabetic characters"
    );
    isValid = false;
  }
  if (description === "") {
    displayErrorMessage("description-error", "Please enter a description");
    isValid = false;
  }
  return isValid;
}
function displayErrorMessage(elementId, message) {
  var errorElement = document.getElementById(elementId);
  errorElement.innerText = message;
  errorElement.style.display = "block";
}

function clearErrorMessage() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
    element.style.display = "none";
  });
}


function confirmDelete(event) {
  event.preventDefault();

  Swal.fire({
    title: "Are you sure?",
    text: "This brand will be permently deleted!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it",
  }).then((result) => {
    if (result.isConfirmed) {
      event.target.submit();
    }
  });
}