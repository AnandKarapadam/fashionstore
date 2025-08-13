const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const User = require("../../models/walletSchema");

const loadOrderPage = async (req,res)=>{
    try {
         
      let {search="",status="",page=1,sort=""} = req.query;
      page = parseInt(page);

      let limit = 4;
      let skip = (page-1)*limit;
      
      const query = {};

      if(search){
        const users = await User.find({
          $or:[
            {name:{$regex:search,$options:"i"}},
            {email:{$regex:search,$options:"i"}}
          ]
        });

        const userIds = users.map(u=>u._id);

        query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { userId: { $in: userIds } }
      ];

      }

      if(status){
        query["orderedItems.status"] = status;
      }

      const totalOrders = await Order.countDocuments(query);

      let sortOption = {createdOn:-1};

      if(sort=="newest") sortOption = {createdOn:-1};
      if(sort=="oldest") sortOption = {createdOn:1};
      if(sort=="amountHigh") sortOption = {totalPrice:-1};
      if(sort==="amountLow") sortOption = {totalPrice:1};

      const orders = await Order.find(query).populate("userId","name email").sort(sortOption).skip(skip).limit(limit);

      const totalPages = Math.ceil(totalOrders/limit);
      
      
      
        res.render("admin/order",{
          orders,
          search,
          status,
          currentPage:page,
          totalPages,
          sort
        });
    } catch (error) {
        console.error("Error:",error.message);
    }
}

const updateOverallStatus = async(req,res)=>{
  try {

    const {orderId,status,order_id} = req.body;

    const order = await Order.findOneAndUpdate({orderId:orderId},{$set:{overAllStatus:status}},{new:true});

    if(order){
     return res.json({success:true,message:"Status changed success fully"})
    }
    else{
      res.json({success:false});
    }
    
  } catch (error) {
    console.log(error.message);
    res.json({success:false});
  }
}

const loadOrderDetailsPage = async(req,res)=>{
  try {


    const orderId = req.params.orderId;
    let {search="",sort="",page=1,status=""} = req.query;
    page=parseInt(page);
    const limit = 5;
    const skip = (page-1)*limit;

    const order = await Order.findOne({orderId:orderId}).populate("orderedItems.product","productName").populate("address");

    if(!order){
     return console.log("Error in finding order");
    }
    
    const searchRegex = new RegExp(search,"i");

    let productDetails = order.orderedItems
    .filter(item=>
    (!search||searchRegex.test(item.orderItemId)&&item.product)
    ).map(item=>{
      const price = item.product.salePrice||item.product.price;

      return{
        orderItemId:item.orderItemId,
        productName:item.product.productName,
        productId:item.product._id,
        quantity:item.quantity,
        price,
        totalPrice:price*item.quantity,
        status:item.status,
        paymentMethod:order.paymentMethod,
        returnReason: item.returnReason,
        orderId: order.orderId,
        orderDate: order.createOn,
        user: order.userId,
        address: order.address
      }
    })

    if(status){
      productDetails = productDetails.filter(
        item=>item.status.toLowerCase()===status.toLowerCase()
      )
    }

    switch (sort){
      case "amountHigh":
        productDetails.sort((a,b)=>a.totalPrice-b.totalPrice);
        break;
      case "amountLow":
        productDetails.sort((a,b)=>b.totalPrice-a.totalPrice);  
        break;
      case "newest":
        productDetails.sort((a,b)=>b.orderDate-a.orderDate);
        break;
      case "oldest":
        productDetails.sort((a,b)=>a.orderDate-b.orderDate);
        break;    
    }

    const totalItems = productDetails.length;
    const paginateItems = productDetails.slice(skip,skip+limit);

    res.render("admin/orderDetails",{
      products:paginateItems,
      order,
      currentPage:page,
      totalPages:Math.ceil(totalItems/limit),
      search,
      sort,
      status
    })

  } catch (error) {
    console.log("Error:",error.message);
  }
}


module.exports = {
    loadOrderPage,
    updateOverallStatus,
    loadOrderDetailsPage
}