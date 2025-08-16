document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll(".update-status-form").forEach(form=>{
        form.addEventListener("submit",async(e)=>{
            e.preventDefault();
            const orderId = form.getAttribute("data-order-id");
            const status = form.querySelector("select[name='status']").value;

            try {
                
                const res = await fetch("/admin/orders/update-status",{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                    },
                    body:JSON.stringify({orderId,status})
                })

                const data = await res.json();

                if(data.success){
                    Swal.fire({
                        icon:"success",
                        title:"Status Updated",
                        text:`Order Status changed to "${status}"`,
                        showConfirmButton:false,
                        timer:1500
                    })
                }else{
                    Swal.fire({
                        icon:"error",
                        title:"Updation Failed",
                        text:"Could not update order Status"
                    })
                }


            } catch (error) {
                console.log("Error:",error.message);
                Swal.fire({
                 icon: "error",
                 title: "Error",
                  text: "Something went wrong while updating the order."
               });
            }
        })
    })
})