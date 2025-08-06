const Order = require("../../models/orderSchema");




const loadOrderPage = async (req,res)=>{
    try {
          const demoOrders = [
    {
      _id: "ORD123456",
      userId: {
        name: "Anand KV",
        email: "anand@example.com"
      },
      createdAt: new Date(),
      totalAmount: 2999,
      status: "Pending"
    },
    {
      _id: "ORD654321",
      userId: {
        name: "Rahul Sharma",
        email: "rahul@example.com"
      },
      createdAt: new Date(),
      totalAmount: 4999,
      status: "Shipped"
    }
  ];
        res.render("admin/order",{search:"",orders:demoOrders,currentPage:1,totalPages:1});
    } catch (error) {
        console.error("Error:",error.message);
    }
}


module.exports = {
    loadOrderPage
}