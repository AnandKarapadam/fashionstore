document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll(".update-status-form").forEach(form=>{
        form.addEventListener("submit",async(e)=>{
            e.preventDefault();
            const orderItemId = form.getAttribute("data-item-id");
            const orderId = form.getAttribute("data-order-id");
            const status = form.querySelector("select[name='status']").value;
            try {
                
                const res = await fetch(`/admin/orders/order-details/${orderId}/update-status`,{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({orderItemId,status}),
                })

                const data = await res.json();

                if(data.success){
                   Swal.fire({
                    icon:"success",
                    title:"Status changed successfully",
                    text:data.message||"Status changed!",
                    showConfirmButton:false
                   }).then(()=>location.reload());
                }
                else{
                    Swal.fire({
                        icon:"error",
                        title:"Error occured!",
                        text:data.message||"Cannot change Status",
                        showConfirmButton:false
                    })
                }

            } catch (error) {
                console.log("Error:",error.message);
                Swal.fire({
                    icon:"error",
                    title:"Error",
                    text:"Internal Server Error"
                })
            }
        })
    })
})