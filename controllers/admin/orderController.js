const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const User = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Address = require("../../models/addressSchema");


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

      let sortOption = {createOn:-1};

      if(sort=="newest") sortOption = {createOn:-1};
      if(sort=="oldest") sortOption = {createOn:1};
      if(sort=="amountHigh") sortOption = {totalPrice:-1};
      if(sort==="amountLow") sortOption = {totalPrice:1};

      const orders = await Order.find(query).populate("userId","name email").populate("orderedItems").sort(sortOption).skip(skip).limit(limit);

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

      const allItems = await Order.findOne({orderId:orderId});

      let totalOrderAmount = allItems.totalPrice;
      let totalDiscount = allItems.discount||0;

      const alreadyReturnedItems = allItems.orderedItems.filter(item=>item.status==="Returned");
      let alreadyRefundedAmount = 0;
      if(alreadyReturnedItems.length>0){
        let returnedTotal = alreadyReturnedItems.reduce(
          (sum,i)=>sum+i.price*i.quantity,0
        )

          const discountShare = (returnedTotal/totalOrderAmount)*totalDiscount;
          alreadyRefundedAmount = returnedTotal-discountShare;

      }

    const order = await Order.findOneAndUpdate({orderId:orderId},{$set:{overAllStatus:status,"orderedItems.$[].status":status}},{new:true});
    if(!order) return res.json({success:false});
    
    const allReturned = order.orderedItems.every(item=>item.status === "Returned");
    if(allReturned){
      const userId = order.userId;

      let totalPaid = order.totalPrice;
      let couponDiscount = order.discount||0;

      let fullRefundAmount = totalPaid - couponDiscount;

      let refundAmount = Math.max(fullRefundAmount - alreadyRefundedAmount, 0);

      refundAmount = parseFloat(refundAmount.toFixed(2))

      const wallet = await Wallet.findOne({userId});
      if(!wallet){
        const newWallet = new Wallet({
          userId,
          balance:refundAmount,
          transactions:[
            {
              type:"CREDIT",
              amount:refundAmount,
              description:`Refund for the Order ${orderId}`,
              orderId:order._id,
              balanceAfter:refundAmount
            }
          ]
        })
        await newWallet.save();
      }else{
        const newBalance = wallet.balance+refundAmount;
        wallet.balance = newBalance;
        wallet.transactions.push({
          type:"CREDIT",
          amount:refundAmount,
          description:`Refund for order ${orderId}`,
          orderId:order._id,
          balanceAfter:newBalance
        })
        await wallet.save();
      }

      for(let item of order.orderedItems){
        if(item.product&&item.quantity>0){
          await Product.updateOne(
            {_id:item.product,"sizes.size":item.size},
            {$inc:{"sizes.$.quantity":item.quantity}}
          )

          const productDoc = await Product.findById(item.product);
          const totalQuantity = productDoc.sizes.reduce((acc,s)=>acc+s.quantity,0);

          await Product.updateOne(
            {_id:item.product},
            {$set:{quantity:totalQuantity}}
          )

        }
      }
    }

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

    const order = await Order.findOne({orderId:orderId}).populate("orderedItems.product","productName price salePrice").populate("address");

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
        address: order.address,
        size:item.size
      }
    })

    if(status){
      productDetails = productDetails.filter(
        item=>item.status.toLowerCase()===status.toLowerCase()
      )
    }

    switch (sort){
      case "amountLow":
        productDetails.sort((a,b)=>a.totalPrice-b.totalPrice);
        break;
      case "amountHigh":
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

const postOrderItemStatus = async(req,res)=>{
  try {

    const {orderItemId,status,size} = req.body;
    const {orderId} = req.params;

    if(!orderItemId||!status){
      return res.status(400).json({success:false,message:"Missing Data"});
    }

    const order = await Order.findOne({
      orderId:orderId,
      "orderedItems.orderItemId":orderItemId
    })

    
    if(!order){
      return res.status(400).json({success:false,message:"Order not found"})
    }

    const updated = await Order.updateOne(
      {orderId:orderId,'orderedItems.orderItemId':orderItemId},
      {$set:{"orderedItems.$.status":status}}
    );  

    

    if(updated.modifiedCount>0){
      if(status==="Returned"){
        const returnedItem = order.orderedItems.find(
          item=>item.orderItemId === orderItemId
        )
        let refundAmount = 0;

        if(returnedItem){
          const itemTotal = returnedItem.price*returnedItem.quantity;
          refundAmount = itemTotal;

          if(order.discount&&order.discount>0){
            const orderSubTotal = order.orderedItems.reduce(
              (sum,item)=>sum+(item.price*item.quantity),0
            )
            const discountShare = (itemTotal/orderSubTotal)*order.discount;
            refundAmount = itemTotal-discountShare;
          }

          await Product.updateOne(
            {_id:returnedItem.product,"sizes.size":size},
            {$inc:{"sizes.$.quantity":returnedItem.quantity}}
          )


          const productDoc = await Product.findById(returnedItem.product);
          const totalQuantity = productDoc.sizes.reduce((acc,s)=>acc+s.quantity,0);
          const newStatus = totalQuantity===0?"out of stock":productDoc.status;

          await Product.updateOne(
            {_id:returnedItem.product},
            {$set:{quantity:totalQuantity,status:newStatus}}
          )

        }

        refundAmount = parseFloat(refundAmount.toFixed(2));

        if(refundAmount>0){
          let wallet = await Wallet.findOne({userId:order.userId});

          if(wallet){
            const currentBalance = parseFloat(wallet.balance.toString());
            wallet.balance = (currentBalance+refundAmount).toFixed(2);
            wallet.transactions.push({
              type:"CREDIT",
              amount:refundAmount,
              description:order.discount
              ? `Refund (after coupon) for Order ${orderId}`
              : `Refund for Order ${orderId}`,
              orderId:order._id,
              balanceAfter:wallet.balance
            })
            await wallet.save();
          }
          else{
            wallet = new Wallet({
              userId:order.userId,
              balance:refundAmount,
              transactions:[
            {
              type:"CREDIT",
              amount:refundAmount,
              description:`Refund for the Order ${orderId}`,
              orderId:order._id,
              balanceAfter:refundAmount
            }
          ]
            });
            await wallet.save();
          }
        }
        
      

      const updatedOrder = await Order.findOne({ orderId: orderId });
        const allReturned = updatedOrder.orderedItems.every(
          item => item.status === "Returned"
        );

        if (allReturned||updatedOrder.orderedItems.length===1) {
          await Order.updateOne(
            { orderId: orderId },
            { $set: { overAllStatus: "Returned" } }
          );
        }
      }

      return res.json({success:true,message:"Order item updated successfully"});
    }
    else{
     return res.json({success:false,message:"Status update failed"}); 
    }

    
  } catch (error) {
    console.log("Error:",error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

const loadItemDetailsPage = async(req,res)=>{
  try {

    const {orderId,itemId} = req.params;

    const order = await Order.findOne({orderId}).populate("orderedItems.product").populate("userId");

    const orderItem = order.orderedItems.find(item=>item.orderItemId === itemId);
    const addressDoc = await Address.findOne({ userId: order.userId._id });
   

    const orderAddress = addressDoc.address.find(
       (addr) => addr._id.toString() === order.address.toString()
    );

    res.render("admin/orderitemdetails",{order,orderItem,address:orderAddress});
    
  } catch (error) {
    console.log("error:",error.message);
  }
}
const loadReturnRequestPage = async (req,res)=>{
  try {
    const { page = 1, search = "",status = "",sort = ""} = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    
    let query = {
      $or: [
        { overAllStatus: "Return Request" },
        { "orderedItems.status": "Return Request" }
      ]
    };

    if (search) {
      query.orderId = { $regex: new RegExp(search, "i") };
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("userId", "name email")
      .sort({ createOn: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/orderreturnpage",{
      orders,
      currentPage: parseInt(page),
      totalPages,
      search,
      status,
      sort
    });

    
  } catch (error) {
    console.log("error:",error.message);
  }
}
module.exports = {
    loadOrderPage,
    updateOverallStatus,
    loadOrderDetailsPage,
    postOrderItemStatus,
    loadItemDetailsPage,
    loadReturnRequestPage
}