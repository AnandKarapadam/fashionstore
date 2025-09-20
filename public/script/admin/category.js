function clearSearch() {
  document.querySelector('input[name="search"]').value = "";
  document.getElementById("searchForm").submit();
}


function handleFormSubmit(event) {
  event.preventDefault();

  const name = document.querySelector("input[name='name']").value.trim();
  const description = document.getElementById("descriptionId").value.trim();

  document.getElementById("name-error").innerText = "";
  document.getElementById("description-error").innerText = "";
   
  let isValid = true;

  if(!name){
    document.getElementById("name-error").innerText = "Please enter a category name";
    isValid = false;
  }else if(!/^[a-zA-Z\s]+$/.test(name)){
    document.getElementById("name-error").innerText = "Name should contain only letters and spaces";
    isValid = false;
  }

  if(!description){
    document.getElementById("description-error").innerText = "Please enter a description.";
    isValid = false;
  }

  if(!isValid) return false;


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