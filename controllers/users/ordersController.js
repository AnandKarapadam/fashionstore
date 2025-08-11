const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");


const loadOrderPage = async(req,res)=>{
    try {

        const userId = req.session.user;
        const page = parseInt(req.query.page)||1;
        const search = req.query.search||"";
        const limit = 4;
        const skip = (page-1)*limit;

        const searchRegex = new RegExp(search,"i"); 

        let orders = await Order.find({userId}).populate({path:"orderedItems.product",match:{productName:searchRegex}}).populate("address").sort({createOn:-1}).skip(skip).limit(limit);
        
        orders = orders.map(order=>{
            const matchingItems = order.orderedItems.filter(item=>item.product);

            return matchingItems.length>0?{...order.toObject(),orderedItems:matchingItems}:null;
        }).filter(order=>order!==null);

        const totalOrders = orders.length;

        const paginateItems = orders.slice(skip,skip+limit);

      
        res.render("user/orders",{
            orders:paginateItems,
            currentPage:page,
            totalPages:Math.ceil(totalOrders/limit),
            search
        });

    } catch (error) {
        console.log("Error:",error.message);
    }
}

const loadOrderDetails = async(req,res)=>{
    try {
        const {orderId} = req.params;
        const {productId} = req.query;
        

        const order = await Order.findOne({orderId,userId:req.session.user}).populate("orderedItems.product");

        const userAddress = await Address.findOne({userId:req.session.user,"address._id":order.address},{"address.$":1});
        console.log(userAddress);

        const address = userAddress.address[0];
        
        if (!order) {
          console.log("order not found");
        }

        const product = await Product.findById(productId);

        if (!product) {
            console.log("Product not found");
        }

        
        res.render("user/orderDetails",{
            order,
            product,
            address
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

module.exports = {
    loadOrderPage,
    loadOrderDetails,
    invoiceDownload
}