const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");
const path = require("path");
const PdfPrinter = require("pdfmake");

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

        const totalOrders = orders.length;

        const paginateItems = orders.slice(skip,skip+limit);

      
        res.render("user/orders",{
            orders:paginateItems,
            currentPage:page,
            totalPages:Math.ceil(totalOrders/limit),
            search,
            user,
            cssFile:"orders.css"
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
            address,
            
        }
        
        res.render("user/orderDetails",{
            orderItem:itemDetails,
            user,
            cssFile:"orderdetails.css"
        });
        
    } catch (error) {
        console.log(error.message);
    }
}

const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../../fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../../fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../../fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../../fonts/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

const invoiceDownload = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.session.user;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid ID format");
    }

    const order = await Order.findOne({ _id: orderId, userId }).populate("orderedItems.product").populate("userId");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const productItem = order.orderedItems.find(
      (item) => item.product._id.toString() === productId
    );

    if (!productItem) {
      return res.status(404).send("Product not found in this order");
    }

    // Define the document
    const docDefinition = {
  pageSize: "A4",
  pageMargins: [40, 60, 40, 60], // left, top, right, bottom
  content: [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: "INVOICE", style: "header" },
                "\n",
                {
                  columns: [
                    { text: `Invoice Date: ${new Date(order.invoiceDate).toLocaleDateString()}` },
                    { text: `Order ID: ${order.orderId}`, alignment: "right" },
                  ],
                },
                { text: `User Name: ${order.userId.name}`, margin: [0, 5, 0, 15] },
                {
                  table: {
                    widths: [40, "*", 80, 80, 80],
                    body: [
                      [
                        { text: "Sl. No", bold: true },
                        { text: "Item Name", bold: true },
                        { text: "Quantity", bold: true },
                        { text: "Price", bold: true },
                        { text: "Total", bold: true },
                      ],
                      [
                        "1",
                        productItem.product.productName,
                        productItem.quantity.toString(),
                        `₹${productItem.product.salePrice}`,
                        `₹${productItem.quantity * productItem.product.salePrice}`,
                      ],
                    ],
                  },
                  layout: "lightHorizontalLines",
                },
                "\n",
                { text: `Order Status: ${order.overAllStatus}`, margin: [0, 10, 0, 0] },
                "\n",
                { text: "Thank you for shopping with us!", alignment: "center", margin: [0, 20, 0, 0] },
              ],
              margin: [10, 10, 10, 10], // inner padding
            },
          ],
        ],
      },
      layout:{
    hLineWidth: function (i, node) {
      return 1; // ✅ horizontal line thickness
    },
    vLineWidth: function (i, node) {
      return 1; // ✅ vertical line thickness
    },
    hLineColor: function (i, node) {
      return '#000000'; // black lines
    },
    vLineColor: function (i, node) {
      return '#000000';
    },
  },
    },
  ],
  styles: {
    header: { fontSize: 20, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
  },
  defaultStyle: { font: "Roboto" },
};

    // Generate PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${productItem.product._id}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Could not generate invoice");
  }
};


const postReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, returnReason } = req.body;
    const userId = req.session.user;

   
    if (!orderId || !productId || !returnReason) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    
    const order = await Order.findOne({ orderId, userId }).populate("orderedItems.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    
    const item = order.orderedItems.find(i => i.product._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

   
    if (item.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered items can be returned" });
    }

   
    item.status = "Return Request";
    item.returnReason = returnReason.trim();

   if(order.orderedItems.length===1){
    order.overAllStatus = "Cancelled";
    order.returnReason = returnReason;
   }
   else{
    const allReturned = order.orderedItems.every((i)=>i.status === "Return Request");
    if(allReturned){
        order.overAllStatus = "Return Request";
        order.returnReason = "Returned the whole products by user";
    }
   }
   
    await Product.findByIdAndUpdate(productId, { $inc: { quantity: item.quantity } });

    
    await order.save();

  
    return res.status(200).json({ success: true, message: "Return request submitted successfully" });

  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


const postCancelOrder = async(req,res)=>{
    try {
        const {orderId,productId,reason} = req.body;
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
        item.cancelReason = reason;

        if(order.orderedItems.length === 1){
            order.overAllStatus = "Cancelled";
            order.cancelReason = reason;
        }
        else{
            const allCancelled = order.orderedItems.every((i)=>i.status==="Cancelled");
            if(allCancelled){
                order.overAllStatus = "Cancelled";
                order.cancelReason = "All products are cancelled by user";
            }
        }

        await order.save();

        await Product.findByIdAndUpdate(productId,{$inc:{quantity:item.quantity}});

        res.json({success:true,message:"Order cancelled successfully."});

        
    } catch (error) {
        console.log("Error:",error.message);
    }
}

const postCancelWholeOrder = async(req,res)=>{
    try {

        const {orderId} = req.params;
        const {cancelReason} = req.body;

        const order = await Order.findOne({orderId});

        if(order.overAllStatus !== "Processing" && order.overAllStatus !== "Pending"){
            return res.json({success:false,message:"Cannot cancel this order at this stage"});
        }

        order.overAllStatus = "Cancelled";
        order.cancelReason = cancelReason;

        order.orderedItems.forEach(item => {
            item.status = "Cancelled";
            item.cancelReason = cancelReason;
        });

        await order.save();

        res.json({success:true,message:"Order and all items have been successfully cancelled!"});

        
    } catch (error) {
        console.log("Error:",error.message);
    }
}

const postWholeReturnOrder = async(req,res)=>{
    try {

        const {orderId} = req.params;
        const {returnReason} = req.body;

        const order = await Order.findOne({orderId});

        if(order.overAllStatus!=="Delivered"){
            return res.json({success:false,message:"Cannot return at this stage"});
        }
        order.overAllStatus= "Return Request";
        order.returnReason = returnReason;

        order.orderedItems.forEach(item=>{
            item.status = "Return Request";
            item.returnReason = returnReason;
        })

        await order.save();

        res.json({success:true,message:"Return request send successfully"});
        
    } catch (error) {
        console.log("Error:",error.message)
    }
}
module.exports = {
    loadOrderPage,
    loadOrderDetails,
    invoiceDownload,
    postReturnRequest,
    postCancelOrder,
    postCancelWholeOrder,
    postWholeReturnOrder
}