const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadCartPage = async(req,res)=>{
  try {

    const id = req.session.user;
    const page = parseInt(req.query.page)||1;
    const search = req.query.search||"";
    const limit = 4;
    const skip = (page-1)*limit;

    const cart  = await Cart.findOne({userId:id}).populate("items.productId");
    

    if(!cart || cart.items.length === 0){
      return res.render("user/cart",{
        currentPage:1,
        totalPages:1,
        search:"",
        items:[],
        subtotal:0});
    }

    const filterItems = search?cart.items.filter(item=>{
       const name = item.productId.productName.toLowerCase();
      const regex = new RegExp(search.toLowerCase(), 'i'); // 'i' for case-insensitive
      return regex.test(name);
    }):cart.items;

    const totalItems = filterItems.length;
    const totalPages = Math.ceil(totalItems/limit);

    const paginateItems = filterItems.slice(skip,skip+limit);

    const subtotal = filterItems.reduce((acc,item)=>{

      if(item.productId && !item.productId.isBlocked ){
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
      search
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
      return res.render("user/product_details",{error:"Product is not available"});
    }

    const price = product.salePrice || product.regularPrice;
    const totalPrice = price*quantity;

    let cart = await Cart.findOne({userId:id})

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
    
    res.redirect("/cart");


  } catch (error) {
    console.error("Error :",error.message);
  }
}
const loadSelectAddress = async(req,res)=>{
  try {
    
    const userId = req.session.user;

    const addressDoc = await Address.findOne({userId});
    const cart = await Cart.findOne({userId}).populate("items.productId");

    const validItems =cart ? cart.items.filter(item=>item.productId&& !item.productId.isBlocked):[];

    const subtotal = validItems.reduce((acc,item)=>acc+item.totalPrice,0);

    const addresses = addressDoc?addressDoc.address:[];

    res.render("user/selectAddress",{
      userId,
      addresses,
      cartItems:validItems,
      subtotal})

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

    res.json({ success: true });
  } 
   catch (error) {
    console.error("Error:",error.message);
  }
}

const removeCartItem = async(req,res)=>{
  try {

    const cartItemId = req.params.cartItemId;
    const userId = req.session.user;

    console.log(cartItemId);

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
     res.render("user/payment");
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
    removeCartItem
}