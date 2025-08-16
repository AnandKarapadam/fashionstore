document.querySelectorAll(".delete-form").forEach((form) => {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    Swal.fire({
      title: "Are you sure?",
      text: "This product will be permentently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        form.submit();
      }
    });
  });
});

function validateOffer(form){
  const input = form.querySelector("input[name='offerPrice']");
  const offerPrice = parseFloat(input.value);
  const regularPrice = parseFloat(input.dataset.regularPrice);

   if (isNaN(offerPrice) || offerPrice <= 0) {
      Swal.fire({
        icon:"error",
        title:"OOPs!",
        text:"Please enter a valid Offer Price greater than 0."
      })
  
      return false;
    }

    if (offerPrice >= regularPrice) {
      Swal.fire({
        icon:"error",
        title:"OOPs!",
        text:"Offer Price must be less than Regular Price (₹" + regularPrice + ")."
      })
      return false;
    }

    return true;
}