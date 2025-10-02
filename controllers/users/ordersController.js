const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
const PdfPrinter = require("pdfmake");
const path = require("path");
const User = require("../../models/userSchema");

const Wallet = require("../../models/walletSchema");

const { text } = require("pdfkit");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");

const loadOrderPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const limit = 2;
    const skip = (page - 1) * limit;
    let user;
    if (userId) {
      user = await User.findById(userId);
    }

    const searchRegex = new RegExp(search, "i");

    let orders = await Order.find({ userId })
      .populate({
        path: "orderedItems.product",
        match: { productName: searchRegex },
      })
      .populate("address")
      .sort({ createOn: -1 });

    orders = orders.map((order) => {
      order.orderedItems = order.orderedItems.filter(
        (item) => item.product !== null
      );
      return order;
    });

    orders = orders.filter((order) => {
      return searchRegex.test(order.orderId) || order.orderedItems.length > 0;
    });
    const totalOrders = orders.length;

    const paginateItems = orders.slice(skip, skip + limit);

    res.render("user/orders", {
      orders: paginateItems,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      search,
      user,
      cssFile: "orders.css",
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, size } = req.query;
    const userId = req.session.user;
    let user;
    if (userId) {
      user = await User.findById(userId);
    }

    const order = await Order.findOne({ orderId, userId }).populate(
      "orderedItems.product"
    );

    
    if (!order) {
      console.log("order not found");
    }

    const paymentMethod = order.paymentMethod||"N|A";

    const orderItem = order.orderedItems.find(
      (item) => item.product._id.toString() === productId && item.size === size
    );

    if (!orderItem) {
      console.log("Product not found in Order");
    }

    const userAddress = await Address.findOne(
      { userId, "address._id": order.address },
      { "address.$": 1 }
    );

    const address = userAddress ? userAddress.address[0] : null;

    const itemDetails = {
      order_id: order._id,
      orderId: order.orderId,
      orderItemId: orderItem.orderItemId,
      product: orderItem.product,
      quantity: orderItem.quantity,
      returnReason: orderItem.returnReason,
      orderDate: order.createOn,
      status: orderItem.status,
      address,
      discount: order.discount,
      deliveryCharge: order.deliveryCharge,
      size:orderItem.size
    };

    res.render("user/orderDetails", {
      orderItem: itemDetails,
      user,
      cssFile: "orderdetails.css",
      paymentMethod
    });
  } catch (error) {
    console.log(error.message);
  }
};

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

    const order = await Order.findOne({ _id: orderId, userId }).populate({
      path: "orderedItems.product",
      populate: { path: "brand", model: "Brand" },
    });

    const user = await User.findById(userId);

    if (!order || !user) {
      return res.status(404).send("Order not found");
    }

    const productItem = order.orderedItems.find(
      (item) => item.product._id.toString() === productId
    );

    if (!productItem) {
      return res.status(404).send("Product not found");
    }

    const docDefinition = {
      content: [
        { text: "RORITO", style: "header" },
        { text: "Official Invoice\n\n", style: "subheader" },

        {
          text: [
            "Invoice Date:",
            { text: `${new Date().toLocaleDateString()}`, bold: true },
          ],
        },
        { text: ["Order ID:", { text: `${order.orderId}`, bold: true }] },
        {
          text: [
            "Customer Name:",
            { text: `${user.name}\n\n`, bold: true, color: "blue" },
          ],
        },
        {
          text: [
            "Total Order Amount:",
            { text: `₹${order.finalAmount}`, bold: true, color: "green" },
          ],
        },
        {
          text: [
            "Discount Applied:",
            { text: `-₹${order.discount}`, bold: true },
          ],
        },
        {
          text: [
            "Delivery Charge:",
            {text:`${order.deliveryCharge||0}\n\n`,bold:true}
          ]
        },

        {
          table: {
            widths: ["*", "auto", "auto","auto", "auto","auto", "auto"],
            body: [
              [
                "Product Name",
                "Brand",
                "Quantity",
                "Size",
                "Status",
                "Actual Price",
                "Offer Price",
              ],
              ...order.orderedItems.map((item) => [
                item.product.productName,
                item.product.brand?.brandName || "N/A",
                item.quantity,item.size,
                item.status,
                `₹${item.product.regularPrice}`,
                `₹${item.product.salePrice}`,
              ]),
            ],
          },
        },

        { text: "\nThank you for shopping with us!", alignment: "center" },
      ],
      styles: {
        header: { fontSize: 22, bold: true, alignment: "center" },
        subheader: { fontSize: 14, italics: true, alignment: "center" },
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment;filename=invoice-${productItem.product._id}.pdf`
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error("Error generating invoice:", error.message);
    res.status(500).send("Error generating invoice");
  }
};

const postReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, returnReason ,size} = req.body;
    const userId = req.session.user;

    if (!orderId || !productId||!size || !returnReason) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const order = await Order.findOne({ orderId, userId }).populate(
      "orderedItems.product"
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.find(
      (i) => i.product._id.toString() === productId&&i.size===size
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
    }

    if (item.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered items can be returned",
      });
    }

    item.status = "Return Request";
    item.returnReason = returnReason.trim();

    if (order.orderedItems.length === 1) {
      order.overAllStatus = "Return Request";
      order.returnReason = returnReason;
    } else {
      const allReturned = order.orderedItems.every(
        (i) => i.status === "Return Request"
      );
      if (allReturned) {
        order.overAllStatus = "Return Request";
        order.returnReason = "Returned the whole products by user";
      }
    }

    await Product.updateOne(
      {_id:productId,"sizes.size":size},
      {$inc:{"sizes.$.quantity":item.quantity}}
    )

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const postCancelOrder = async (req, res) => {
  try {
    const { orderId, productId, reason ,size } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found!" });
    }

    const item = order.orderedItems.find(
      (i) => i.product._id.toString() === productId && i.size === size
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
    }

    if (["Delivered", "Shipped"].includes(item.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel at this stage" });
    }

    item.status = "Cancelled";
    item.cancelReason = reason;

    if (order.orderedItems.length === 1) {
      order.overAllStatus = "Cancelled";
      order.cancelReason = reason;
    } else {
      const allCancelled = order.orderedItems.every(
        (i) => i.status === "Cancelled"
      );
      if (allCancelled) {
        order.overAllStatus = "Cancelled";
        order.cancelReason = "All products are cancelled by user";
      }
    }

    await order.save();

 
    await Product.updateOne(
  { _id: productId, "sizes.size": size },
  { $inc: { "sizes.$.quantity": item.quantity } }
);


    if (order.paymentMethod !== "cod") {
      const totalOrderAmount = order.totalPrice;
      const totalDiscount = order.discount || 0;
      const itemTotal = item.price * item.quantity;
      const discountShare = (itemTotal / totalOrderAmount) * totalDiscount;

      const refundAmount = parseFloat((itemTotal - discountShare).toFixed(2));

      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: refundAmount,
          transactions: [
            {
              type: "CREDIT",
              amount: refundAmount,
              description: `Refund for cancelled product in Order ${orderId}`,
              orderId: order._id,
              balanceAfter: refundAmount,
            },
          ],
        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "CREDIT",
          amount: refundAmount,
          description: `Refund for cancelled product in Order ${orderId}`,
          orderId: order._id,
          balanceAfter: wallet.balance,
        });
        await wallet.save();
      }
    }

    res.json({ success: true, message: "Order cancelled successfully." });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const postCancelWholeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId });

    if (
      order.overAllStatus !== "Processing" &&
      order.overAllStatus !== "Pending"
    ) {
      return res.json({
        success: false,
        message: "Cannot cancel this order at this stage",
      });
    }

    let refundAmount = 0;

    const totalOrderAmount = order.totalPrice;
    const totalDiscount = order.discount || 0;

    for (let item of order.orderedItems) {
      if (item.status !== "Cancelled" && item.status !== "Returned") {
        item.status = "Cancelled";
        item.cancelReason = cancelReason;

        await Product.updateOne(
          { _id: item.product, "sizes.size": item.size },
          { $inc: { "sizes.$.quantity": item.quantity } }
        );

        const itemTotal = item.price * item.quantity;
        const discountShare = (itemTotal / totalOrderAmount) * totalDiscount;
        refundAmount += itemTotal - discountShare;
      }
    }

    if(order.deliveryCharge&&order.deliveryCharge>0){
      refundAmount+=order.deliveryCharge
    }

    order.overAllStatus = "Cancelled";
    order.cancelReason = cancelReason;

    await order.save();

    if (refundAmount > 0 && order.paymentMethod !== "cod") {
      refundAmount = parseFloat(refundAmount.toFixed(2));

      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: refundAmount,
          transactions: [
            {
              type: "CREDIT",
              amount: refundAmount,
              description: `Refund for cancelled order ${orderId}`,
              orderId: order._id,
              balanceAfter: refundAmount,
            },
          ],
        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "CREDIT",
          amount: refundAmount,
          description: `Refund for cancelled order ${orderId}`,
          orderId: order._id,
          balanceAfter: wallet.balance,
        });
      }
      await wallet.save();
    }

    res.json({
      success: true,
      message: "Order and all items have been successfully cancelled!",
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const postWholeReturnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { returnReason } = req.body;

    const order = await Order.findOne({ orderId });

    if (order.overAllStatus !== "Delivered") {
      return res.json({
        success: false,
        message: "Cannot return at this stage",
      });
    }
    order.overAllStatus = "Return Request";
    order.returnReason = returnReason;

    order.orderedItems.forEach((item) => {
      if (item.status !== "Returned") {
        item.status = "Return Request";
        item.returnReason = returnReason;
      }
    });

    await order.save();

    res.json({ success: true, message: "Return request send successfully" });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const getRetryPaymentPage = async (req,res)=>{
 const { orderId } = req.params;
  const userId = req.session.user;
  const order = await Order.findOne({ orderId, userId }).populate("orderedItems.product");
  
  let finalAmount = order.finalAmount;
  let warnings = [];

  // Validate coupon
  if(order.couponName){
    const coupon = await Coupon.findOne({ name: order.couponName });
    if(!coupon || !coupon.isList || new Date() > coupon.expireOn){
      warnings.push(`Coupon "${order.couponName}" is invalid or expired. Discount removed.`);
      finalAmount = order.totalPrice + order.deliveryCharge;
      order.couponApplied = false;
      order.couponName = null;
      order.discount = 0;
    }
  }

  // Validate stock
  order.orderedItems.forEach(item => {
    const sizeStock = item.product.sizes.find(s => s.size === item.size);
    if(!sizeStock || sizeStock.quantity < item.quantity){
      warnings.push(`Product "${item.product.productName}" (size ${item.size}) adjusted to stock.`);
      item.quantity = sizeStock ? sizeStock.quantity : 0;
      item.totalPrice = item.quantity * item.product.salePrice;
      item.markModified("quantity");
      item.markModified("totalPrice");
    }
    item.status = "Processing";
    item.markModified("status");
  });

  finalAmount = order.orderedItems.reduce((sum,i)=>sum+i.totalPrice,0) + order.deliveryCharge;
  order.finalAmount = finalAmount;
  await order.save();

  const razorpayOrder = await razorpay.orders.create({
    amount: finalAmount*100,
    currency: "INR",
    receipt:`retry_rcpt_${Date.now()}`
  });

  res.json({
    success:true,
    warnings,
    razorpayOptions:{
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "Fashion Store",
      description: "Retry Order Payment",
      order_id: razorpayOrder.id,
      prefill:{email:req.session.userEmail||""},
      theme:{color:"#000cc"}
    }
  });
}
const validateRetryPayment = async (req,res)=>{

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const { orderId } = req.params;
  const userId = req.session.user;

  const order = await Order.findOne({ orderId, userId });

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const generated_signature = hmac.digest("hex");

  if(generated_signature !== razorpay_signature){
    return res.json({success:false,message:"Payment signature verification failed"});
  }

  order.paymentMethod = "razorpay";
  order.overAllStatus = "Processing";
  for (let item of order.orderedItems) {
      item.status = "Processing";

      const productDoc = await Product.findById(item.product._id);
      const sizeIndex = productDoc.sizes.findIndex(s => s.size === item.size);

      if (sizeIndex >= 0) {
        productDoc.sizes[sizeIndex].quantity -= item.quantity;
        if (productDoc.sizes[sizeIndex].quantity < 0) productDoc.sizes[sizeIndex].quantity = 0;
      }

      await productDoc.save(); 
    }
  await order.save();

  res.json({success:true,message:"Payment verified successfully"});
}
module.exports = {
  loadOrderPage,
  loadOrderDetails,
  invoiceDownload,
  postReturnRequest,
  postCancelOrder,
  postCancelWholeOrder,
  postWholeReturnOrder,
  getRetryPaymentPage,
  validateRetryPayment
};
