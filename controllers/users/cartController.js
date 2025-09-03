const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const { countDocuments, validate } = require("../../models/userSchema");
const {v4:uuidv4} = require("uuid");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
const Wallet = require("../../models/walletSchema");

const loadCartPage = async(req,res)=>{
  try {

    const id = req.session.user;
    const page = parseInt(req.query.page)||1;
    const search = req.query.search||"";
    const limit = 4;
    const skip = (page-1)*limit;

    let user
        if(id){
             user = await User.findById(id);
        }
    const cart  = await Cart.findOne({userId:id}).populate("items.productId");
            
 


    if(!cart || cart.items.length === 0){
      return res.render("user/cart",{
        currentPage:1,
        totalPages:1,
        search:"",
        items:[],
        cartItems:[],
        subtotal:0,
      user});
    }

    let shouldSave = false
    cart.items.forEach(item=>{
      if(item.productId){
        const currentPrice = item.productId.salePrice??item.productId.regularPrice;
        const  newTotal = currentPrice*item.quantity;
        if(item.price!== currentPrice||item.totalPrice!==newTotal){
          item.price = currentPrice;
          item.totalPrice = newTotal;
          shouldSave = true;
        }
      }
    })

    if(shouldSave) await cart.save();

    const filterItems = search?cart.items.filter(item=>{
       const name = item.productId.productName.toLowerCase();
      const regex = new RegExp(search.toLowerCase(), 'i'); // 'i' for case-insensitive
      return regex.test(name);
    }):cart.items;

    const totalItems = filterItems.length;
    const totalPages = Math.ceil(totalItems/limit);

    const paginateItems = filterItems.slice(skip,skip+limit);
    
    const subtotal = filterItems.reduce((acc,item)=>{

      if(item.productId && !item.productId.isBlocked&&item.productId.quantity>0 ){
      return acc+item.totalPrice;
      }
      return acc;
    },0);   

    res.render("user/cart",{
      currentPage:page,
      totalPages,
      items:paginateItems,
      cartItems:filterItems,
      subtotal,
      search,
      user
    })

  } catch (error) {
    console.error("Error:",error.message);
  }
}

const addToCart = async(req,res)=>{
  try {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity)||1;
    const id = req.session.user;

    let product = await Product.findById({_id:productId})

    if(!product||product.isBlocked||product.quantity<=0){
      return res.json({success:false,message:"Product not found!"});
    }

    const price = product.salePrice || product.regularPrice;
    const totalPrice = price*quantity;

    let cart = await Cart.findOne({userId:id})

    if(cart && cart.items.length===5){
      return res.json({success:false,message:"Cart if full"});
    }

    if(!cart){
      cart = new Cart({
        userId:id,
        items:[{productId,quantity,price,totalPrice}]
      })
    }else{
      const itemIndex = cart.items.findIndex((item)=>item.productId.toString() === productId.toString());

      if(itemIndex >-1){
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * cart.items[itemIndex].quantity;
        
      }
      else{
        cart.items.push({productId,quantity,price,totalPrice});
      }
    }
    await cart.save();
    await Wishlist.updateOne(
      { userId:id },
      { $pull: { products: { productId:productId } } }
    );
      
  res.json({success:true,message:"Product added successfully"});

  } catch (error) {
    console.error("Error :",error.message);
  }
}
const loadSelectAddress = async(req,res)=>{
  try {
    
    const userId = req.session.user;
    const type = req.query.type; 
    const productId = req.query.productId; 

    let user
        if(userId){
             user = await User.findById(userId);
        }

    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc ? addressDoc.address : [];

    let cartItems = [];
    let subtotal = 0;
    
    if(type==="single"){
        
        
        const cart = await Cart.findOne(
          {userId,'items.productId':productId},
          {"items.$":1}
        ).populate("items.productId");

       if (cart && cart.items.length > 0) {
         if (cart.items[0].productId.quantity < 1) {
         return res.redirect("/cart");
          }
        }

        cartItems = cart?cart.items:[];
        subtotal = cart.items[0].totalPrice;
        
    }
    else{
    const cart = await Cart.findOne({userId}).populate("items.productId");

    const validItems =cart ? cart.items.filter(item=>item.productId&& !item.productId.isBlocked&&item.productId.quantity>0):[];
      cartItems = validItems;

      if(validItems.length===0){
        return res.redirect("/cart");
      }
   subtotal = validItems.reduce((acc,item)=>acc+item.totalPrice,0);
  }
    

    res.render("user/selectAddress",{
      userId,
      addresses,
      cartItems,
      subtotal,type,productId,user,cssFile:"selectaddress.css"});

  } catch (error) {
    console.error("Error",error.message);
  }
}
const updateCartQuantity = async(req,res)=>{
  try {

  const { productId, quantity } = req.body;
  const userId = req.session.user;


    const cart = await Cart.findOne({ userId });

    const item = cart.items.find(i => i.productId.equals(productId));
    if (!item) return res.json({ success: false, message: 'Item not found' });

    item.quantity = quantity;
    item.totalPrice = item.price * quantity;

    await cart.save();

    const newSubtotal = cart.items.reduce((sum,i)=>sum+(i.totalPrice||0),0);

    res.json({ success: true,updatedItemTotal:item.totalPrice,newSubtotal});
  } 
   catch (error) {
    console.error("Error:",error.message);
  }
}

const removeCartItem = async(req,res)=>{
  try {

    const cartItemId = req.params.cartItemId;
    const userId = req.session.user;


    const result = await Cart.updateOne({userId},{$pull:{items:{_id:cartItemId}}})

    if(result.modifiedCount === 0){
      return res.status(404).json({success:false,message:"Item not found in cart"});
    }

    res.status(200).json({success:true,message:"Item removed successfully from cart."});
    
  } catch (error) {
    console.log(error.message);
  }
}

const loadPaymentPage = async(req,res)=>{
  try {

    const userId = req.session.user;
    const {type,productId} = req.query;
    let user
        if(userId){
             user = await User.findById(userId);
        }

    let cartItems = [];
    let subtotal = 0;

    if(type==="single"&&productId){

      const cart = await Cart.findOne(
        {userId,"items.productId":productId},
        {"items.$":1}
      ).populate("items.productId");  

      if(cart){
        const item = cart.items[0];
        if(item.productId&&!item.productId.isBlocked&&item.productId.quantity>0){
          cartItems = [item];
          subtotal = item.totalPrice;
        }
      }

    }
    else{
      const cart = await Cart.findOne({userId}).populate("items.productId");

    const validItems = cart?cart.items.filter(item=>item.productId && !item.productId.isBlocked&&item.productId.quantity>0):[];

    subtotal = validItems.reduce((acc,item)=>acc+item.totalPrice,0);
      cartItems = validItems;
    }
    
    let discount = 0;
    let finalAmount = subtotal;

    if(req.session.couponData){
      discount = req.session.couponData.discount;
      subtotal = req.session.couponData.finalAmount;
    }
    

     res.render("user/payment",{cartItems,discount,finalAmount,subtotal,type,productId,user});

  } catch (error) {
    console.error("Error:",error.message);
  }
}

const postSelectedAddress = async (req,res)=>{
  try {
    
      const {selectedAddress,type,productId}  = req.body;
      const userId = req.session.user;
     

    const userAddressDoc = await Address.findOne({userId:req.session.user});
    

    if(!userAddressDoc){
      return res.status(404).send("No address found for user.");
    }

    const selected = userAddressDoc.address.find(addr=>
      addr._id.toString() === selectedAddress
    );

    if(!selected){
      return res.status(404).send("Invalied address selected.");
    }

    req.session.selectedAddress = selected;
    
    let redirectUrl = `/cart/checkout/payment?addressId=${selected._id}`;
    if(type === "single" && productId){
      redirectUrl += `&type=single&productId=${productId}`;
    }
    
    res.json({ success: true, redirectUrl });
    
  } catch (err) {
    console.error("Error:",err.message)
  }
}

const postPaymentMethod = async(req,res)=>{
  try {
    const userId  = req.session.user;
    const {paymentMethod} = req.body;
    const method = paymentMethod.toLowerCase();

    const validateMethods = ["cod","razorpay","upi","card","wallet"];
    if(!validateMethods.includes(method)){
      return res.json({success:false,message:"Invalied payment method"});
    }

    if(!req.session.selectedAddress){
      return res.json({success:false,message:"No delivery address selected"});
    }

    const {type,productId} = req.body;
    let products = [];
    let subtotal = 0;
    let checkoutType = type||"";

    if(type==="single"&&productId){
        const cart = await Cart.findOne({userId}).populate("items.productId");

        if(!cart){
          return res.json({success:false,message:"Your cart is empty."})
        }

        const item = cart.items.find(item=>item.productId&&item.productId._id.toString()===productId);

        if(!item){
          return res.json({success:false,message:"Product not available!"});
        }
        
        products = [item];
        subtotal = item.totalPrice;

    }
    else{
      const cart = await Cart.findOne({userId}).populate("items.productId");

       if(!cart||cart.items.length === 0){
      return res.json({success:false,message:"Your cart is empty"});
    }

    products = cart?cart.items.filter(item=>item.productId&&!item.productId.isBlocked&&item.productId.quantity>0):[];

       subtotal = products.reduce((acc,item)=>
      acc+item.totalPrice,0
    )
  }

  let discount = 0;
  let finalAmount = subtotal;


    if(req.session.couponData&&req.session.couponData.couponApplied){
      discount = req.session.couponData.discount;
      finalAmount = subtotal-discount;
    }


    req.session.orderData = {
      userId,
      address:req.session.selectedAddress,
      paymentMethod:method,
      products,
      discount,
      finalAmount,
      totalAmount:subtotal,
      couponApplied:discount>0,
      type:checkoutType,
      productId
    }

    delete req.session.couponData;
    
       

    if(method === "cod"){

      if(type==="single"&&productId){
         return res.json({success:true,redirectUrl:`/cart/checkout/confirm?type=${type}&product=${productId}`})
      }else{
        return res.json({success:true,redirectUrl:"/cart/checkout/confirm"})
      }
      
    }
    else if(method === "razorpay"){
      if(type === "single"&& productId){
        return res.json({success:true,redirectUrl:`/cart/checkout/razorpay?type=${type}&product=${productId}`});
      }else{
        return res.json({success:true,redirectUrl:"/cart/checkout/razorpay"});
      }
      
    }
    else if(method === "upi"){
      if(type === "single"&& productId){
        return res.json({success:true,redirectUrl:`/cart/checkout/razorpay?type=${type}&product=${productId}`});
      }else{
        return res.json({success:true,redirectUrl:"/cart/checkout/razorpay"});
      }
      
    }
    else if(method === "card"){
      if(type === "single"&& productId){
        return res.json({success:true,redirectUrl:`/cart/checkout/razorpay?type=${type}&product=${productId}`});
      }else{
        return res.json({success:true,redirectUrl:"/cart/checkout/razorpay"});
      }
      
    }else if(method === "wallet"){
      if(type === "single"&& productId){
        return res.json({success:true,redirectUrl:`/cart/checkout/wallet?type=${type}&product=${productId}`});
      }else{
        return res.json({success:true,redirectUrl:"/cart/checkout/wallet"});
      }
    }

  } catch (error) {
    console.error("Error: ",error.message);
  }
}

const getRazorpayOrder = async (req,res)=>{
  try {
      const {orderData} = req.session;
      if(!orderData){
        return res.redirect("/cart");
      }

      const options = {
        amount:orderData.finalAmount*100,
        currency:"INR",
        receipt:"order_rcpt"+Date.now()
      }

      const order = await razorpay.orders.create(options);
      let selectedMethod = "";
      if(orderData.paymentMethod==="card"||orderData.paymentMethod==="upi"){
        selectedMethod = orderData.paymentMethod;
      }
      res.render("user/razorpayCheckout",{
        key:process.env.RAZORPAY_KEY_ID,
        order,
        orderData,
        selectedMethod
      })
  } catch (error) {
    console.log("Error:",error.message);
  }
}
function generateOrderItemId() {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `OIID${randomNum}`;
}

async function updateOrder(orderData,userId) {
  const{type,productId,address,paymentMethod,razorpayOrderId,discount,couponApplied,finalAmount,totalAmount,razorpayPaymentId} = orderData;
  let orderedItems = [];
  let totalPrice = 0;

  if(type==="single"&&productId){
    const cart = await Cart.findOne(
      {userId,"items.productId":productId},
      {"items.$":1}
    ).populate("items.productId");
    if(!cart||cart.items.length===0){
      throw new Error("Product not found in cart");
    } 

    const singleItem = cart.items[0];
    const price = singleItem.productId.salePrice||singleItem.productId.price;

    orderedItems.push({
      orderItemId:generateOrderItemId(),
      product:singleItem.productId._id,
      quantity:singleItem.quantity,
      price,
      totalPrice:price*singleItem.quantity,
      status:"Processing"
    })
    totalPrice = price*singleItem.quantity;
    await Cart.updateOne(
      {userId},
      {$pull:{items:{productId}}}
    );
  }else{
    const cart = await Cart.findOne({userId}).populate("items.productId");

    if(!cart||cart.items.length===0){
      throw new Error("Product not found in cart");
    }

    orderedItems = cart.items.map(item=>{
      const price = item.productId.salePrice||item.productId.price;
      return{
        orderItemId:generateOrderItemId(),
        product:item.productId._id,
        quantity:item.quantity,
        price,
        totalPrice:price*item.quantity,
        status:"Processing"
      }
    })

    totalPrice = orderedItems.reduce((sum,i)=>sum+i.totalPrice,0);

    await Cart.updateOne({userId},{$set:{items:[]}});

  }

  for(const item of orderedItems){
    await Product.findByIdAndUpdate(item.product,{
      $inc:{quantity:-item.quantity},
    })
  }

  const order = new Order({
    userId,
    orderedItems,
    totalPrice,
    discount,
    finalAmount,
    address,
    couponApplied,
    paymentMethod,
    paymentId:razorpayPaymentId||null,
    razorpayOrderId:razorpayOrderId||null,
    overAllStatus:"Processing"

  })

  
   await order.save();
 
   return order;
}

const verifyRazorPayment = async (req,res)=>{
  try {
    const userId = req.session.user;
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body;

    const body = razorpay_order_id+"|"+razorpay_payment_id;
    const expectedSignature  = crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");

    if(expectedSignature === razorpay_signature){
      req.session.orderData.razorpayOrderId = razorpay_order_id;
      req.session.orderData.razorpayPaymentId = razorpay_payment_id;
      const order = await updateOrder(req.session.orderData,userId);
        delete req.session.orderData;
      return res.json({success:true,orderId: order._id });
    }else{
      return res.json({success:false,message:"Invalid signature"});
    }

    
  } catch (error) {
    console.log("Error:",error.message);
    res.json({success:false,message:"Server error"});
  }
}
const loadWalletPayment = async (req,res)=>{
  try {

    const userId = req.session.user;
    const user = await User.findById(userId);
    let wallet = await Wallet.findOne({userId});
    const orderData = req.session.orderData;

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: [] 
      });
      await wallet.save();
    }

    if(orderData.finalAmount>wallet.balance){
       return res.render("user/walletPayment",{user,wallet,orderData,message:"No much wallet balance."});
    }

    res.render("user/walletPayment",{user,wallet,orderData,message:null});
    
  } catch (error) {
    console.log("Error:",error.message);
  }
}

const postWalletPayment = async (req,res)=>{
  try {

    const{type,productId,address,paymentMethod,razorpayOrderId,discount,couponApplied,finalAmount,totalAmount} = req.session.orderData;
    const orderData = req.session.orderData;
    const userId = req.session.user;

    if(!type&&!orderData){
      return res.redirect("/cart/checkout/wallet");
    }

    const user = await User.findById(userId);
    const wallet = await Wallet.findOne({userId});

    if (!wallet || wallet.balance < finalAmount) {
      // Not enough balance
      return  res.render("user/walletPayment",{user,wallet,orderData,message:"No Enough Balance in wallet"});
    }

    let orderedItems = [];
    let totalPrice = 0;
    
    


    if(type==="single"&&productId){
      const cart = await Cart.findOne(
        {userId,"items.productId":productId},
        {"items.$":1}
      ).populate("items.productId");

      if(!cart||cart.items.length===0){
        console.log("Product not found in cart");
        return res.redirect("/cart");
      }
      const singleItem = cart.items[0];
      let price = singleItem.productId.salePrice||singleItem.productId.price;

      orderedItems.push({
        orderItemId:generateOrderItemId(),
        product:singleItem.productId._id,
        price,
        quantity:singleItem.quantity,
        totalPrice:price*singleItem.quantity,
        status:"Processing"
      })

      totalPrice=price*singleItem.quantity;
      await Cart.updateOne(
        {userId},
        {$pull:{items:{productId}}}
      )

    }else{
      const cart = await Cart.findOne({userId}).populate("items.productId");

      if(!cart||cart.items.length===0)return res.redirect("/cart");

      orderedItems = cart.items.map(item=>{
        const price = item.productId.salePrice||item.productId.price;
        return{
          orderItemId:generateOrderItemId(),
          product:item.productId,
          quantity:item.quantity,
          price,
          totalPrice:price*item.quantity,
          status:"Processing"
        }
      })

      totalPrice = orderedItems.reduce((sum,i)=>sum+i.totalPrice,0);

      await Cart.updateOne({userId},{$set:{items:[]}});
    }

    for(const item of orderedItems){
      await Product.findByIdAndUpdate(item.product,{
        $inc:{quantity:-item.quantity},
      })
    }



    const order = new Order({
      userId,
      orderedItems,
      totalPrice,
      discount,
      finalAmount,
      address,
      couponApplied,
      paymentMethod,
      paymentId:null,
      razorpayOrderId:null,
      overAllStatus:"Processing"
    })
    await order.save();
    
    wallet.balance-=finalAmount;
    wallet.transactions.push({
      type:"DEBIT",
      amount:finalAmount,
      description:"Wallet payment for order.",
      orderId:order._id,
      balanceAfter:wallet.balance
    })

    await wallet.save();

    delete req.session.orderData;
    res.redirect("/cart/order-success");
    
  } catch (error) {
    console.log("Error:",error.message);
  }
}
const applyCoupon = async(req,res)=>{
  try {

    const userId = req.session.user;
    const {couponCode} = req.body;
    const {type}= req.query||null;
    const {productId} = req.query||null;

    const coupon = await Coupon.findOne({name:couponCode,isList:true});

    if(!coupon){
      return res.json({success:false,message:"Invalid Coupon Code"});
    }

    if(coupon.user&&coupon.user.toString()!==userId.toString()){
      return res.json({success:false,message:"This coupon is not available for you."});
    }

    if(new Date()>coupon.expireOn){
      return res.json({success:false,message:"Coupon has expired."})
    }

    if(coupon.usedBy.some(id=>id.toString()===userId.toString())){
      return res.json({success:false,message:"You have already used this coupon."});
    }

    let subtotal = 0;

    if(type==='single'&&productId){
      const cart = await Cart.findOne({userId}).populate("items.productId");

      if(!cart){
        return res.json({success:false,message:'Your cart is empty.'});
      }
      const item = cart.items.find(
        (i)=>i.productId&&i.productId._id.toString()===productId
      );

      if(!item){
        return res.json({success:false,message:"Product not found"});
      }

      subtotal = item.totalPrice;

    }
    else{

      const cart = await Cart.findOne({userId}).populate("items.productId");

      if(!cart||cart.items.length===0){
        return res.json({success:false,message:"Your cart is empty."});
      }

      subtotal = cart.items.filter(item=>item.productId&&!item.productId.isBlocked&&item.productId.quantity>0).reduce((acc,item)=>acc+item.totalPrice,0);
    }
      if(subtotal<coupon.minimumPrice){
        return res.json({success:false,message:`Minimum purchase amount for this coupon is ${coupon.minimumPrice}`})
      }

      const discount = coupon.offerPrice;
      const finalAmount = subtotal-discount;

      coupon.usedBy.push(userId);
      await coupon.save();

      req.session.couponData = {
        totalAmount:subtotal,
        discount,
        finalAmount,
        couponApplied:true
      }

      return res.json({
        success:true,
        message:"Coupon applied successfully.",
        finalAmount,
        discount
      })

    
    
  } catch (error) {
    console.log("Error:",error.message);
  }
}

const getConfirmOrderPage = async(req,res)=>{
  try {
      
     const search = req.query.search||"";
     const page = parseInt(req.query.page)||1;
     const limit = 4;
     const skip = (page-1)*limit;
     const searchRegex = new RegExp(search,"i");
     const {type,product} = req.query;
     const userId = req.session.user;

     let user
        if(userId){
             user = await User.findById(userId);
        }

     let itemsToShow = [];
     let cart;
     const orderData = req.session.orderData;

     if(orderData?.products){
      itemsToShow = req.session.orderData.products;
      
     }
     else{
    
      cart = await Cart.findOne({userId:userId}).populate("items.productId");
      if(!cart||cart.items.length===0){
      return res.redirect("/cart");
     }
     itemsToShow = cart.items;

    }

     let filterItems = itemsToShow.filter(item=>{ 
      const product = item.productId;

      if(!product||product.isBlocked||product.status == "out of stock"){
        return false
      }
      
     return searchRegex.test(product.productName);
  })

     const totalProducts = filterItems.length;
     const totalPages = Math.ceil(totalProducts/limit);

     const paginateItems = filterItems.slice(skip,skip+limit);

     const products = paginateItems.map((item)=>({
      _id:item.productId?._id||item._id,
      name:item.productId?.productName||item.name,
      image:item.productId?.productImage?.[0]||item.image,
      price:item.price,
      quantity:item.quantity,
      totalPrice:item.totalPrice||(item.price*item.quantity)
     }))
     

     let totalAmount = filterItems.reduce(
      (acc,item)=>acc+(item.productId.salePrice*item.quantity),0
     )

     let discount = 0;
     let finalAmount = totalAmount;

     if (orderData && typeof orderData.finalAmount === "number" && typeof orderData.discount === "number") {
        discount = orderData.discount;
       finalAmount = orderData.finalAmount;
       totalAmount = finalAmount;
      } 


     res.render("user/orderConfirmation",{
      address:orderData.address,
      paymentMethod:orderData.paymentMethod,
      products,
      totalAmount,
      totalPages,
      currentPage:page,
      search,
      type,
      product,
      user,
      finalAmount,
      discount
     })


  } catch (error) {
    console.error("Error:",error.message);
    res.redirect('/cart');
  }
}




const postConfirmation = async (req, res) => {
  try {
    const userId = req.session.user;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const { addressId, paymentMethod,type,product } = req.body;

    let orderedItems = [];
    let totalPrice = 0;
     
    const orderData = req.session.orderData;
    if (!orderData) {
      return res.status(400).json({ message: "Order expired" });
    }
    
    if (type === "single" && product) {
      const cart = await Cart.findOne(
        { userId, "items.productId": product },
        { "items.$": 1 } 
      ).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.status(404).json({ message: "Product not found in cart" });
      }

      const singleItem = cart.items[0];
      const price = singleItem.productId.salePrice || singleItem.productId.price;

      orderedItems.push({
        orderItemId:generateOrderItemId(),
        product: singleItem.productId._id,
        quantity: singleItem.quantity,
        price: price,
        totalPrice: singleItem.totalPrice,
        status:"Processing"
      });

      totalPrice = price * singleItem.quantity;

      // Remove the product from the cart
      await Cart.updateOne(
        { userId },
        { $pull: { items: { productId: product } } }
      );
    }

    // WHOLE CART CHECKOUT
    else {
      const cart = await Cart.findOne({ userId })
    .populate("items.productId");

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  // Filter out blocked products
  const validCartItems = cart.items.filter(item => 
    item.productId && item.productId.isBlocked === false && item.productId.quantity>0
  );

  
  if (validCartItems.length === 0) {
    return res.status(400).json({ message: "No available products to order" });
  }

  orderedItems = validCartItems.map(item => {
    const price = item.productId.salePrice || item.productId.price;
    return {
      orderItemId:generateOrderItemId(),
      product: item.productId._id,
      quantity: item.quantity,
      price: price,
      totalPrice: price * item.quantity,
      status:"Processing"
    };
  });

  totalPrice = orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    await Cart.findOneAndUpdate({userId:new mongoose.Types.ObjectId(userId)},{$set:{items:[]}})

    }

    for (const item of orderedItems) {
      
      // Update stock by subtracting ordered quantity
     const updatedProduct = await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
      
    }

    // Discount logic (optional)
    let discount = 0; // Placeholder for coupon logic
    let finalAmount = totalPrice - discount;

    // Create new order
    const newOrder = new Order({
      userId,
      orderedItems,
      totalPrice:orderData.totalAmount,
      discount:orderData.discount,
      finalAmount:orderData.finalAmount,
      address: addressId,
      invoiceDate: new Date(),
      couponApplied: orderData.couponApplied,
      paymentMethod:paymentMethod,
      overAllStatus:"Processing",

    });

    await newOrder.save();

    delete req.session.orderData;

    res.status(200).json({
      message: "Order placed successfully",
      orderId: newOrder.orderId
    });

  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const buyNowSingleProduct = async(req,res)=>{
  try {
    
    const userId = req.session.user;
    const productId = req.params.id;
    
    const cart  = await Cart.findOne(
     {userId,"items.productId": productId}, 
     { "items.$": 1 }    
    ).populate("items.productId");

    if(!cart){
      const product =  await Product.findById(productId);
      await Cart.updateOne(
    {userId},
    {$push:{items:{productId:product_id,quantity:1,price:product.salePrice}}}
    )
      return res.redirect("/cart");
    }    

    res.redirect(`/cart/select-address?type=single&productId=${productId}`);

  } catch (error) {
    console.error("Error:",error.message);
  }
}

const loadSuccessPage = async (req,res)=>{
  try {
    const id = req.session.user;
    let user
        if(id){
             user = await User.findById(id);
        }

    res.render("user/orderSuccess",{user,cssFile:"ordersuccess.css"});
    
  } catch (error) {
    console.error("Error:",error.message);
  }
}
const loadFailedPage = async(req,res)=>{
  try {

    const userId = req.session.user;
    const user = await User.findById(userId);

    res.render("user/paymentError",{user,cssFile:"paymentfail.css"});
    
  } catch (error) {
    console.error("Error:",error.message);
  }
}
module.exports = {
    loadCartPage,
    addToCart,
    loadSelectAddress,
    loadPaymentPage,
    updateCartQuantity,
    removeCartItem,
    postSelectedAddress,
    postPaymentMethod,
    getConfirmOrderPage,
    buyNowSingleProduct,
    postConfirmation,
    loadSuccessPage,
    applyCoupon,
    getRazorpayOrder,
    verifyRazorPayment,
    loadFailedPage,
    loadWalletPayment,
    postWalletPayment
}