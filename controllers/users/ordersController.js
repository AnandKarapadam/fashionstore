const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const User = require("../../models/userSchema");


const loadOrderPage = async(req,res)=>{
    try {

        const userId = req.session.user;
        const page = parseInt(req.query.page)||1;
        const search = req.query.search||"";
        const limit = 2;
        const skip = (page-1)*limit;
        let user
        if(userId){
             user = await User.findById(userId);
        }

        const searchRegex = new RegExp(search,"i"); 

        let orders = await Order.find({userId}).populate({path:"orderedItems.product",match:{productName:searchRegex}}).populate("address").sort({createOn:-1});

        let allItems = [];

        orders.forEach(order=>{
            order.orderedItems.forEach(item=>{
                if(item.product){
                    allItems.push({
                        orderId:order.orderId,
                        orderItemId:item.orderItemId,
                        product:item.product,
                        quantity:item.quantity,
                        status:item.status,
                        orderDate:order.createOn,
                        address:order.address
                    })
                }
            })
        })
        
        

        const totalOrders = allItems.length;

        const paginateItems = allItems.slice(skip,skip+limit);

      
        res.render("user/orders",{
            orders:paginateItems,
            currentPage:page,
            totalPages:Math.ceil(totalOrders/limit),
            search,
            user
        });

    } catch (error) {
        console.log("Error:",error.message);
    }
}

const loadOrderDetails = async(req,res)=>{
    try {
        const {orderId} = req.params;
        const {productId} = req.query;
        const userId = req.session.user;
        let user
        if(userId){
             user = await User.findById(userId);
        }        

        const order = await Order.findOne({orderId,userId}).populate("orderedItems.product")

        if(!order){
            console.log("order not found")
        }

        const orderItem = order.orderedItems.find(
            (item) => item.product._id.toString() === productId
        )

        if(!orderItem){
            console.log("Product not found in Order");
        }
        
        const userAddress = await Address.findOne(
          { userId, "address._id": order.address },
          { "address.$": 1 }
        );

        const address = userAddress ? userAddress.address[0] : null;

        const itemDetails = {
            order_id:order._id,
            orderId:order.orderId,
            orderItemId:orderItem.orderItemId,
            product:orderItem.product,
            quantity:orderItem.quantity,
            returnReason:orderItem.returnReason,
            orderDate:order.createOn,
            status:orderItem.status,
            address
        }
        
        res.render("user/orderDetails",{
            orderItem:itemDetails,
            user
        });
        
    } catch (error) {
        console.log(error.message);
    }
}

const invoiceDownload = async (req,res)=>{
    try {
        const {orderId,productId} = req.params;
        const userId = req.session.user;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid ID format");
    }

    const order = await Order.findOne({_id:orderId,userId}).populate("orderedItems.product");

    if (!order) {
        console.log("order not found")
  return res.status(404).send("Order not found");
}

    const productItem = order.orderedItems.find(item=>{
       return item.product._id.toString()===productId;
    })

    if(!productItem){
        return console.log("No product found");
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment;filename=invoice=${productItem.product._id}.pdf`);

    doc.pipe(res);

    doc.fontSize(14).text(`Invoice Date: ${new Date(order.invoiceDate).toLocaleDateString()}`);
    doc.text(`Order ID:${order.orderId}`);
    doc.text(`Customer ID:${order.userId}`);
    doc.moveDown();

    doc.fontSize(16).text("Product Details:");
    doc.fontSize(14).text(`Name:${productItem.product.productName}`);
    doc.text(`Quantity:${productItem.quantity}`);
    doc.text(`Price:${productItem.product.salePrice}`);
    doc.text(`Total:${productItem.quantity * productItem.product.salePrice}`);
    doc.moveDown();

    doc.fontSize(12).text("Thank you for shopping with us!",{align:"center"});
    
    doc.end()

        
    } catch (error) {
        console.error("Error:",error.message);
    }
}

const postReturnRequest = async(req,res)=>{
    try {

        const {orderId,productId,reason} = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({orderId,userId}).populate("orderedItems.product");

        if(!order){
            return console.log("Order not found");
        }


        const item = order.orderedItems.find(
            (i)=>i.product._id.toString()===productId
        )
        
        if(item.status!== "Delivered"){
            return console.log("Cannot return delivered product");
        }

        item.returnReason = reason.trim();
        item.status = "Return Request";
        order.overAllStatus = "Return Request";
        

        await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: item.quantity } }
      
    );

    
        await order.save();

        console.log("order saved");

        res.redirect("/orders");

        
    } catch (error) {
        console.log("Error:",error.message);
    }
}

const postCancelOrder = async(req,res)=>{
    try {
        const {orderId,productId} = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({orderId,userId});

        if(!order){
            return res.status(404).json({success:false,message:"Order not found!"})
        }

        const item = order.orderedItems.find(i=>i.product._id.toString()===productId);

        if(!item){
            return res.status(404).json({success:false,message:"Product not found in order"});
        }

        if(["Delivered","Shipped"].includes(item.status)){
            return res.status(400).json({success:false,message:"Cannot cancel at this stage"});
        }

        item.status = "Cancelled";
        order.overAllStatus = "Cancelled";
        await order.save();

        await Product.findByIdAndUpdate(productId,{$inc:{quantity:item.quantity}});

        res.json({success:true,message:"Order cancelled successfully."});

        
    } catch (error) {
        console.log("Error:",error.message);
    }
}
module.exports = {
    loadOrderPage,
    loadOrderDetails,
    invoiceDownload,
    postReturnRequest,
    postCancelOrder
}