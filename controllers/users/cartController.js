const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");

const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
const Wallet = require("../../models/walletSchema");
const Delivery = require("../../models/deliverySchema");

const loadCartPage = async (req, res) => {
  try {
    await Product.updateMany(
      { quantity: { $lte: 0 }, status: { $ne: "out of stock" } },
      { $set: { status: "out of stock" } }
    );

    const id = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const limit = 4;
    const skip = (page - 1) * limit;

    let user;
    if (id) {
      user = await User.findById(id);
    }
    const cart = await Cart.findOne({ userId: id }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.render("user/cart", {
        currentPage: 1,
        totalPages: 1,
        search: "",
        items: [],
        cartItems: [],
        subtotal: 0,
        user,
      });
    }

    let shouldSave = false;
    cart.items.forEach((item) => {
      if (item.productId) {
        const currentPrice =
          item.productId.salePrice ?? item.productId.regularPrice;
        const newTotal = currentPrice * item.quantity;
        if (item.price !== currentPrice || item.totalPrice !== newTotal) {
          item.price = currentPrice;
          item.totalPrice = newTotal;
          shouldSave = true;
        }
      }
    });

    if (shouldSave) await cart.save();

    const filterItems = search
      ? cart.items.filter((item) => {
          const name = item.productId.productName.toLowerCase();
          const regex = new RegExp(search.toLowerCase(), "i"); // 'i' for case-insensitive
          return regex.test(name);
        })
      : cart.items;

    const totalItems = filterItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    const paginateItems = filterItems.slice(skip, skip + limit);

    const subtotal = filterItems.reduce((acc, item) => {
      if (
        item.productId &&
        !item.productId.isBlocked &&
        item.productId.quantity > 0
      ) {
        return acc + item.totalPrice;
      }
      return acc;
    }, 0);

    res.render("user/cart", {
      currentPage: page,
      totalPages,
      items: paginateItems,
      cartItems: filterItems,
      subtotal,
      search,
      user,
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const requestedQty = parseInt(req.body.quantity) || 1;
    const selectedSize = req.body.size;
    const id = req.session.user;

    if (!id) {
      return res.json({ success: false, message: "Please Login To Account" });
    }

    let product = await Product.findById(productId);

    if (!product || product.isBlocked || product.status === "out of stock") {
      return res.json({ success: false, message: "Product not available!" });
    }

    const sizeData = product.sizes.find((s) => s.size === selectedSize);
    if (!sizeData || sizeData.quantity <= 0) {
      return res.json({
        success: false,
        message: "Selected size is out of stock!",
      });
    }

    const price = product.salePrice || product.regularPrice;
    const qtyToAdd = Math.min(requestedQty, sizeData.quantity);
    const totalPrice = price * qtyToAdd;

    let cart = await Cart.findOne({ userId: id });

    if (cart && cart.items.length === 5) {
      return res.json({ success: false, message: "Cart if full" });
    }

    if (!cart) {
      cart = new Cart({
        userId: id,
        items: [
          {
            productId,
            size: selectedSize,
            quantity: qtyToAdd,
            price,
            totalPrice,
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === productId.toString() &&
          item.size === selectedSize
      );

      if (itemIndex > -1) {
        const newQty = Math.min(
          cart.items[itemIndex].quantity + requestedQty,
          sizeData.quantity
        );
        cart.items[itemIndex].quantity = newQty;
        cart.items[itemIndex].totalPrice =
          cart.items[itemIndex].price * cart.items[itemIndex].quantity;
      } else {
        cart.items.push({
          productId,
          size: selectedSize,
          quantity: qtyToAdd,
          price,
          totalPrice,
        });
      }
    }
    await cart.save();
    await Wishlist.updateOne(
      { userId: id },
      { $pull: { products: { productId: productId } } }
    );

    res.json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error :", error.message);
  }
};
const loadSelectAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const type = req.query.type;
    const productId = req.query.productId;
    const size = req.query.size || "";

    let user;
    if (userId) {
      user = await User.findById(userId);
    }

    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc ? addressDoc.address : [];

    let cartItems = [];
    let subtotal = 0;

    if (type === "single") {
      const cart = await Cart.findOne(
        { userId, "items.productId": productId, "items.size": size },
        { "items.$": 1 }
      ).populate("items.productId");

      if (cart && cart.items.length > 0) {
        const item = cart.items[0];

        const sizeStock = item.productId.sizes.find((s) => s.size === size);

        if (!sizeStock || sizeStock.quantity < 1) {
          return res.redirect("/cart");
        }

        cartItems = [item];
        subtotal = item.totalPrice;
      } else {
        return res.redirect("/cart");
      }

      cartItems = cart ? cart.items : [];
      subtotal = cart.items[0].totalPrice;
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      const validItems = cart
        ? cart.items.filter(
            (item) =>
              item.productId &&
              !item.productId.isBlocked &&
              item.productId.quantity > 0
          )
        : [];
      cartItems = validItems;

      if (validItems.length === 0) {
        return res.redirect("/cart");
      }
      subtotal = validItems.reduce((acc, item) => acc + item.totalPrice, 0);
    }

    res.render("user/selectAddress", {
      userId,
      addresses,
      cartItems,
      subtotal,
      type,
      productId,
      user,
      size,
      cssFile: "selectaddress.css",
    });
  } catch (error) {
    console.error("Error", error.message);
  }
};
const updateCartQuantity = async (req, res) => {
  try {
    await Product.updateMany(
      { quantity: { $lte: 0 }, status: { $ne: "out of stock" } },
      { $set: { status: "out of stock" } }
    );

    const { productId, quantity, size } = req.body;
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId });

    const item = cart.items.find(
      (i) => i.productId.equals(productId) && i.size === size
    );
    if (!item) return res.json({ success: false, message: "Item not found" });

    item.quantity = quantity;
    item.totalPrice = item.price * quantity;

    await cart.save();

    const newSubtotal = cart.items.reduce(
      (sum, i) => sum + (i.totalPrice || 0),
      0
    );

    res.json({ success: true, updatedItemTotal: item.totalPrice, newSubtotal });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const removeCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;
    const userId = req.session.user;
    const { size } = req.body;

    const result = await Cart.updateOne(
      { userId },
      { $pull: { items: { _id: cartItemId, size: size } } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    res
      .status(200)
      .json({ success: true, message: "Item removed successfully from cart." });
  } catch (error) {
    console.log(error.message);
  }
};

const loadPaymentPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const { type, productId, size } = req.query;
    let user;
    if (userId) {
      user = await User.findById(userId);
    }

    let cartItems = [];
    let subtotal = 0;

    if (type === "single" && productId) {
      const cart = await Cart.findOne(
        { userId, "items.productId": productId, "items.size": size },
        { "items.$": 1 }
      ).populate("items.productId");

      if (cart && cart.items.length > 0) {
        const item = cart.items[0];
        const sizeStock = item.productId.sizes.find((s) => s.size === size);

        if (
          item.productId &&
          !item.productId.isBlocked &&
          sizeStock &&
          sizeStock.quantity > 0 &&
          item.productId.status === "Available"
        ) {
          cartItems = [item];
          subtotal = item.totalPrice;
        } else {
          return res.redirect("/cart");
        }
      } else {
        return res.redirect("/cart");
      }
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      const validItems = cart
        ? cart.items.filter(
            (item) =>
              item.productId &&
              !item.productId.isBlocked &&
              item.productId.quantity > 0 &&
              item.productId.status === "Available"
          )
        : [];

      subtotal = validItems.reduce((acc, item) => acc + item.totalPrice, 0);
      cartItems = validItems;
    }

    let discount = 0;
    let finalAmount = subtotal;

    if (req.session.couponData) {
      discount = req.session.couponData.discount;
    }

    let deliveryCharge = 0;
    let delivery = await Delivery.findOne();
    const addressDoc = await Address.findOne({
      "address._id": req.session.selectedAddress,
    });

    if (!addressDoc) {
      return res.json({ success: false, message: "Address not found" });
    }

    const selectedAddress = addressDoc.address.id(req.session.selectedAddress);

    if (delivery.type === "fixed") {
      deliveryCharge = delivery.amount;
    } else if (delivery.type === "state") {
      const usersState = selectedAddress.state.trim().toLowerCase();

      const stateRule = delivery.stateRules.find(
        (rule) => rule.state.trim().toLowerCase() === usersState
      );
      if (stateRule) {
        deliveryCharge = stateRule.charge;
      } else {
        deliveryCharge = 0;
      }
    }

    const today = new Date();

    const availableCoupons = await Coupon.find({
      isList: true,
      createOn: { $lte: today },
      expireOn: { $gte: today },
      $or: [{ user: null }, { user: userId }],
      usedBy: { $ne: userId },
    });

    finalAmount = subtotal + deliveryCharge - discount;

    res.render("user/payment", {
      cartItems,
      discount,
      coupons: availableCoupons,
      deliveryCharge,
      finalAmount,
      subtotal,
      type,
      productId,
      user,
      size: size || "",
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const postSelectedAddress = async (req, res) => {
  try {
    const { selectedAddress, type, productId, size } = req.body;
    const userId = req.session.user;

    const userAddressDoc = await Address.findOne({ userId: req.session.user });

    if (!userAddressDoc) {
      return res.status(404).send("No address found for user.");
    }

    const selected = userAddressDoc.address.find(
      (addr) => addr._id.toString() === selectedAddress
    );

    if (!selected) {
      return res.status(404).send("Invalied address selected.");
    }

    req.session.selectedAddress = selected;

    let redirectUrl = `/cart/checkout/payment?addressId=${selected._id}`;
    if (type === "single" && productId) {
      redirectUrl += `&type=single&productId=${productId}&size=${size}`;
    }

    res.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("Error:", err.message);
  }
};

const postPaymentMethod = async (req, res) => {
  try {
    const userId = req.session.user;
    const { paymentMethod } = req.body;
    const method = paymentMethod.toLowerCase();
   

    const validateMethods = ["cod", "razorpay", "upi", "card", "wallet"];
    if (!validateMethods.includes(method)) {
      return res.json({ success: false, message: "Invalied payment method" });
    }

    if (!req.session.selectedAddress) {
      return res.json({
        success: false,
        message: "No delivery address selected",
      });
    }

    let { type, productId, size } = req.body;
    size = size || "";
    let products = [];
    let subtotal = 0;
    let checkoutType = type || "";

    if (type === "single" && productId) {
      const cart = await Cart.findOne(
        { userId },
        { items: { $elemMatch: { productId, size } } }
      ).populate("items.productId");

      if (cart && cart.items.length > 0) {
        const item = cart.items[0];

        const sizeStock = item.productId.sizes.find((s) => s.size === size);

        if (!sizeStock || sizeStock.quantity < 1) {
          return res.json({
            success: false,
            message: "Selected size is out of stock",
          });
        }

        let warningMessage = "";
        let finalQty = item.quantity;

        if (item.quantity > sizeStock.quantity) {
          finalQty = sizeStock.quantity;
          warningMessage = `Only ${sizeStock.quantity} item(s) available for ${item.productId.productName} (size ${size}). Quantity has been adjusted.`;
        }

        item.quantity = finalQty;
        item.totalPrice = finalQty * item.productId.salePrice;

        products = [item];
        subtotal = item.totalPrice;

        if (warningMessage) {
          return res.json({
            success: false,
            warning: true,
            message: warningMessage,
            products,
          });
        }
      } else {
        return res.json({ success: false, message: "Your cart is empty." });
      }
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.json({ success: false, message: "Your cart is empty" });
      }

      products = cart
        ? cart.items.filter(
            (item) =>
              item.productId &&
              !item.productId.isBlocked &&
              item.productId.quantity > 0
          )
        : [];

      subtotal = products.reduce((acc, item) => acc + item.totalPrice, 0);
    }

    let discount = 0;
    let finalAmount = subtotal;

    let deliveryCharge = 0;
    let delivery = await Delivery.findOne();
    const addressDoc = await Address.findOne({
      "address._id": req.session.selectedAddress,
    });

    if (!addressDoc) {
      return res.json({ success: false, message: "Address not found" });
    }

    const selectedAddress = addressDoc.address.id(req.session.selectedAddress);

    if (delivery.type === "fixed") {
      deliveryCharge = delivery.amount;
    } else if (delivery.type === "state") {
      const usersState = selectedAddress.state.trim().toLowerCase();

      const stateRule = delivery.stateRules.find(
        (rule) => rule.state.trim().toLowerCase() === usersState
      );
      if (stateRule) {
        deliveryCharge = stateRule.charge;
      } else {
        deliveryCharge = 0;
      }
    }

    if (req.session.couponData && req.session.couponData.couponApplied) {
      discount = req.session.couponData.discount;
    }

    finalAmount = subtotal - discount + deliveryCharge;

    req.session.orderData = {
      userId,
      address: req.session.selectedAddress,
      paymentMethod: method,
      products,
      discount,
      finalAmount,
      totalAmount: subtotal,
      couponApplied: discount > 0,
      type: checkoutType,
      productId,
      deliveryCharge,
      size,
    };

    if (method === "cod") {
      if (finalAmount > 1000) {
        return res.json({
          success: false,
          message: "Cash on Delivery is not available for orders above ₹1000",
        });
      }

      if (type === "single" && productId) {
        const product = await Product.findById(productId);

        return res.json({
          success: true,
          redirectUrl: `/cart/checkout/confirm?type=${type}&product=${productId}&size=${size}`,
        });
      } else {
        return res.json({
          success: true,
          redirectUrl: "/cart/checkout/confirm",
        });
      }
    } else if (method === "razorpay") {
      if (type === "single" && productId) {
        return res.json({
          success: true,
          redirectUrl: `/cart/checkout/razorpay?type=${type}&product=${productId}&size=${size}`,
        });
      } else {
        return res.json({
          success: true,
          redirectUrl: "/cart/checkout/razorpay",
        });
      }
    } else if (method === "upi") {
      if (type === "single" && productId) {
        return res.json({
          success: true,
          redirectUrl: `/cart/checkout/razorpay?type=${type}&product=${productId}&size=${size}`,
        });
      } else {
        return res.json({
          success: true,
          redirectUrl: "/cart/checkout/razorpay",
        });
      }
    } else if (method === "card") {
      if (type === "single" && productId) {
        return res.json({
          success: true,
          redirectUrl: `/cart/checkout/razorpay?type=${type}&product=${productId}&size=${size}`,
        });
      } else {
        return res.json({
          success: true,
          redirectUrl: "/cart/checkout/razorpay",
        });
      }
    } else if (method === "wallet") {
      if (type === "single" && productId) {
        return res.json({
          success: true,
          redirectUrl: `/cart/checkout/wallet?type=${type}&product=${productId}&size=${size}`,
        });
      } else {
        return res.json({
          success: true,
          redirectUrl: "/cart/checkout/wallet",
        });
      }
    }
  } catch (error) {
    console.error("Error: ", error.message);
  }
};

const getRazorpayOrder = async (req, res) => {
  try {
    const { orderData } = req.session;
    if (!orderData) {
      return res.redirect("/cart");
    }

    const options = {
      amount: orderData.finalAmount * 100,
      currency: "INR",
      receipt: "order_rcpt" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    let selectedMethod = "";
    if (
      orderData.paymentMethod === "card" ||
      orderData.paymentMethod === "upi"
    ) {
      selectedMethod = orderData.paymentMethod;
    }
   
    res.render("user/razorpayCheckout", {
      key: process.env.RAZORPAY_KEY_ID,
      order,
      orderData,
      selectedMethod,
      cssFile: "razorpaycheckout.css",
      selectedAddressId: req.session.selectedAddress?._id || null,
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};
function generateOrderItemId() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `OIID${randomNum}`;
}

async function updateOrder(orderData, userId) {
  let {
    type,
    productId,
    address,
    paymentMethod,
    razorpayOrderId,
    discount,
    couponApplied,
    finalAmount,
    deliveryCharge,
    totalAmount,
    razorpayPaymentId,
    size,
  } = orderData;
  let orderedItems = [];
  let totalPrice = 0;

  if (type === "single" && productId) {
    const cart = await Cart.findOne(
      { userId, "items.productId": productId, "items.size": size },
      { "items.$": 1 }
    ).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      throw new Error("Product not found in cart");
    }

    const singleItem = cart.items[0];
    const price = singleItem.productId.salePrice || singleItem.productId.price;

    orderedItems.push({
      orderItemId: generateOrderItemId(),
      product: singleItem.productId._id,
      quantity: singleItem.quantity,
      price,
      totalPrice: price * singleItem.quantity,
      status: "Processing",
    });
    totalPrice = price * singleItem.quantity;
    await Cart.updateOne({ userId }, { $pull: { items: { productId, size } } });

    await Product.updateOne(
      { _id: productId, "sizes.size": size },
      { $inc: { "sizes.$.quantity": -singleItem.quantity } }
    );

    const productDoc = await Product.findById(productId);
    productDoc.quantity = productDoc.sizes.reduce(
      (sum, s) => sum + s.quantity,
      0
    );
    await productDoc.save();
  } else {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      throw new Error("Product not found in cart");
    }

    const inStockItems = cart.items.filter(
      (item) =>
        item.productId.quantity > 0 && item.productId.status === "Available"
    );

    orderedItems = inStockItems.map((item) => {
      const price = item.productId.salePrice || item.productId.price;
      return {
        orderItemId: generateOrderItemId(),
        product: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        price,
        totalPrice: price * item.quantity,
        status: "Processing",
      };
    });

    totalPrice = orderedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    await Cart.updateOne({ userId }, { $set: { items: [] } });

    for (const item of orderedItems) {
      const productDoc = await Product.findById(item.product);

      if (item.size) {
        await Product.updateOne(
          { _id: item.product, "sizes.size": item.size },
          { $inc: { "sizes.$.quantity": -item.quantity } }
        );
      }

      if (productDoc.sizes && productDoc.sizes.length > 0) {
        productDoc.quantity = productDoc.sizes.reduce(
          (sum, s) => sum + s.quantity,
          0
        );
      } else {
        productDoc.quantity = productDoc.quantity - item.quantity;
      }

      await productDoc.save();
    }
  }

  finalAmount = totalPrice + deliveryCharge - discount;

  const order = new Order({
    userId,
    orderedItems,
    totalPrice,
    discount,
    finalAmount,
    address,
    couponApplied,
    paymentMethod,
    paymentId: razorpayPaymentId || null,
    razorpayOrderId: razorpayOrderId || null,
    overAllStatus: "Processing",
    deliveryCharge,
  });

  await order.save();

  return order;
}

const verifyRazorPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      req.session.orderData.razorpayOrderId = razorpay_order_id;
      req.session.orderData.razorpayPaymentId = razorpay_payment_id;
      const order = await updateOrder(req.session.orderData, userId);
      
      if (req.session.couponData) {
        delete req.session.couponData;
      }
      delete req.session.orderData;

      return res.json({ success: true, orderId: order._id });
    } else {
      return res.json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.log("Error:", error.stack);
    res.json({ success: false, message: "Server error" });
  }
};
const loadWalletPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    let wallet = await Wallet.findOne({ userId });
    const orderData = req.session.orderData || {};
    const selectedAddress = req.session.selectedAddress?._id || null;

    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    let updatedItems = [];
    let totalPrice = 0;

    if (cart?.items?.length) {
      cart.items.forEach((item) => {
        const product = item.productId;
        const sizeObj = product?.sizes.find((s) => s.size === item.size);
        if (!product || product.isBlocked || !sizeObj || sizeObj.quantity < 1)
          return;

        const quantity = Math.min(item.quantity, sizeObj.quantity);
        const price = product.salePrice ?? product.price ?? 0;
        const itemTotal = price * quantity;

        updatedItems.push({
          product: product._id,
          productName: product.productName,
          size: item.size,
          quantity,
          price,
          totalPrice: itemTotal,
        });

        totalPrice += itemTotal;
      });
    }

    const deliveryCharge = orderData.deliveryCharge || 0;
    const discount =
      typeof orderData.discount === "object"
        ? orderData.discount.amount || 0
        : orderData.discount || 0;

    const finalAmount = totalPrice + deliveryCharge - discount;

    req.session.orderData = {
      ...orderData,
      products: updatedItems,
      totalPrice,
      finalAmount,
    };

    if (finalAmount > (wallet.balance || 0)) {
      return res.render("user/walletPayment", {
        user,
        wallet,
        orderData: req.session.orderData,
        message: "Not enough wallet balance.",
        addressId: selectedAddress,
      });
    }

    return res.render("user/walletPayment", {
      user,
      wallet,
      orderData: req.session.orderData,
      message: null,
      addressId: selectedAddress,
    });
  } catch (err) {
    console.error("Error in loadWalletPayment:", err);
    return res.status(500).send("Something went wrong");
  }
};

const postWalletPayment = async (req, res) => {
  try {
    let {
      type,
      productId,
      address,
      paymentMethod,
      razorpayOrderId,
      deliveryCharge,
      discount,
      couponApplied,
      totalAmount,
      finalAmount,
      size,
    } = req.session.orderData;
    const orderData = req.session.orderData;
    const userId = req.session.user;

    if (!type && !orderData) {
      return res.redirect("/cart/checkout/wallet");
    }

    const user = await User.findById(userId);
    const wallet = await Wallet.findOne({ userId });

    let orderedItems = [];
    let totalPrice = 0;

    if (type === "single" && productId) {
      const cart = await Cart.findOne(
        { userId },
        { items: { $elemMatch: { productId, size } } }
      ).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        console.log("Product not found in cart");
        return res.redirect("/cart");
      }
      const singleItem = cart.items[0];
      let price = singleItem.productId.salePrice || singleItem.productId.price;

      orderedItems.push({
        orderItemId: generateOrderItemId(),
        product: singleItem.productId._id,
        price,
        size: singleItem.size,
        quantity: singleItem.quantity,
        totalPrice: price * singleItem.quantity,
        status: "Processing",
      });

      totalPrice = price * singleItem.quantity;
      await Cart.updateOne(
        { userId },
        { $pull: { items: { productId, size } } }
      );
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) return res.redirect("/cart");
      let isStockItems = cart.items.filter(
        (item) =>
          item.productId.status === "Available" && item.productId.quantity > 0
      );
      orderedItems = isStockItems.map((item) => {
        const price = item.productId.salePrice || item.productId.price;
        return {
          orderItemId: generateOrderItemId(),
          product: item.productId,
          quantity: item.quantity,
          price,
          size: item.size,
          totalPrice: price * item.quantity,
          status: "Processing",
        };
      });

      totalPrice = orderedItems.reduce((sum, i) => sum + i.totalPrice, 0);

      await Cart.updateOne({ userId }, { $set: { items: [] } });
    }

    for (const item of orderedItems) {
      await Product.updateOne(
        { _id: item.product, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } }
      );
    }

    finalAmount = totalPrice + deliveryCharge - discount;

    if (!wallet || wallet.balance < finalAmount) {
      return res.render("user/walletPayment", {
        user,
        wallet,
        orderData,
        message: "No Enough Balance in wallet",
      });
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
      paymentId: null,
      razorpayOrderId: null,
      overAllStatus: "Processing",
      deliveryCharge,
    });
    await order.save();

    wallet.balance -= finalAmount;
    wallet.transactions.push({
      type: "DEBIT",
      amount: finalAmount,
      description: "Wallet payment for order.",
      orderId: order._id,
      balanceAfter: wallet.balance,
    });

    await wallet.save();

    delete req.session.orderData;
    delete req.session.couponData;

    for (const item of orderedItems) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) continue;

      productDoc.quantity = productDoc.sizes.reduce(
        (sum, s) => sum + s.quantity,
        0
      );

      await productDoc.save();
    }

    res.redirect("/cart/order-success");
  } catch (error) {
    console.log("Error:", error.message);
  }
};
const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    const { couponCode } = req.body;
    const { type } = req.query || null;
    const { productId } = req.query || null;

    const coupon = await Coupon.findOne({ name: couponCode, isList: true });

    if (req.session.couponData && req.session.couponData.couponApplied) {
      return res.json({
        success: false,
        message: "A coupon is already applied to this order.",
      });
    }

    if (!coupon) {
      return res.json({ success: false, message: "Invalid Coupon Code" });
    }

    if (coupon.user && coupon.user.toString() !== userId.toString()) {
      return res.json({
        success: false,
        message: "This coupon is not available for you.",
      });
    }

    if (new Date() > coupon.expireOn) {
      return res.json({ success: false, message: "Coupon has expired." });
    }

    if (coupon.usedBy.some((id) => id.toString() === userId.toString())) {
      return res.json({
        success: false,
        message: "You have already used this coupon.",
      });
    }

    let subtotal = 0;

    if (type === "single" && productId) {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart) {
        return res.json({ success: false, message: "Your cart is empty." });
      }
      const item = cart.items.find(
        (i) => i.productId && i.productId._id.toString() === productId
      );

      if (!item) {
        return res.json({ success: false, message: "Product not found" });
      }

      subtotal = item.totalPrice;
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.json({ success: false, message: "Your cart is empty." });
      }

      subtotal = cart.items
        .filter(
          (item) =>
            item.productId &&
            !item.productId.isBlocked &&
            item.productId.quantity > 0
        )
        .reduce((acc, item) => acc + item.totalPrice, 0);
    }
    if (subtotal < coupon.minimumPrice) {
      return res.json({
        success: false,
        message: `Minimum purchase amount for this coupon is ${coupon.minimumPrice}`,
      });
    }

    const discount = coupon.offerPrice;
    const finalAmount = subtotal - discount;

    coupon.usedBy.push(userId);
    await coupon.save();

    req.session.couponData = {
      totalAmount: subtotal,
      discount,
      finalAmount,
      couponApplied: true,
    };

    return res.json({
      success: true,
      message: "Coupon applied successfully.",
      finalAmount,
      discount,
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const getConfirmOrderPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(search, "i");
    const { type, product, size } = req.query;
    const userId = req.session.user;

    delete req.session.couponData;
    let user;
    if (userId) {
      user = await User.findById(userId);
    }

    let itemsToShow = [];
    let cart;
    const orderData = req.session.orderData;

    if (orderData?.products) {
      itemsToShow = req.session.orderData.products;
    } else {
      cart = await Cart.findOne({ userId: userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res.redirect("/cart");
      }
      itemsToShow = cart.items;
    }

    let filterItems = itemsToShow.filter((item) => {
      const product = item.productId;

      if (!product || product.isBlocked || product.status == "out of stock") {
        return false;
      }

      return searchRegex.test(product.productName);
    });

    const totalProducts = filterItems.length;
    const totalPages = Math.ceil(totalProducts / limit);

    const paginateItems = filterItems.slice(skip, skip + limit);

    const products = paginateItems.map((item) => ({
      _id: item.productId?._id || item._id,
      name: item.productId?.productName || item.name,
      image: item.productId?.productImage?.[0] || item.image,
      price: item.price,
      quantity: item.quantity,
      totalPrice: item.totalPrice || item.price * item.quantity,
    }));

    let totalAmount = filterItems.reduce(
      (acc, item) => acc + item.productId.salePrice * item.quantity,
      0
    );

    let discount = 0;
    let finalAmount = totalAmount;

    if (
      orderData &&
      typeof orderData.finalAmount === "number" &&
      typeof orderData.discount === "number"
    ) {
      discount = orderData.discount;
      finalAmount = orderData.finalAmount;
      totalAmount = finalAmount;
    }

    res.render("user/orderConfirmation", {
      address: orderData.address,
      paymentMethod: orderData.paymentMethod,
      products,
      totalAmount,
      totalPages,
      currentPage: page,
      search,
      type,
      product,
      user,
      finalAmount,
      discount,
      size,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.redirect("/cart");
  }
};

const postConfirmation = async (req, res) => {
  try {
    const userId = req.session.user;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const { addressId, paymentMethod, type, product } = req.body;

    let orderedItems = [];
    let totalPrice = 0;
    let warnings = [];

    const orderData = req.session.orderData;
    if (!orderData) {
      return res.status(400).json({ message: "Order expired" });
    }

    if (type === "single" && product) {
      const { size } = req.body;

      if (!size) {
        return res
          .status(400)
          .json({ message: "Size is required for single product order" });
      }

      const cart = await Cart.findOne(
        { userId, "items.productId": product, "items.size": size },
        { "items.$": 1 }
      ).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.status(404).json({ message: "Product not found in cart" });
      }

      const singleItem = cart.items[0];
      const price =
        singleItem.productId.salePrice || singleItem.productId.price;

      const productDoc = await Product.findOne(
        { _id: product, "sizes.size": size },
        { "sizes.$": 1 }
      );

      if (!productDoc) {
        return res.status(404).json({ message: "Product not found" });
      }

      const availableQty = productDoc.sizes[0].quantity;

      if (availableQty === 0) {
        await Cart.updateOne(
          { userId },
          { $pull: { items: { productId: product, size: size } } }
        );

        return res.status(409).json({
          message: `${singleItem.productId.name} (size ${size}) is out of stock.`,
          redirect: "/cart",
        });
      }

      let finalQty = singleItem.quantity;
      if (singleItem.quantity > availableQty) {
        finalQty = availableQty;

        await Cart.updateOne(
          { userId, "items.productId": product, "items.size": size },
          { $set: { "items.$.quantity": availableQty } }
        );

        warnings.push(
          `Quantity adjusted for ${singleItem.productId.name} (size ${size}). Only ${availableQty} available.`
        );
      }

      orderedItems.push({
        orderItemId: generateOrderItemId(),
        product: singleItem.productId._id,
        quantity: finalQty,
        size: size,
        price: price,
        totalPrice: price * finalQty,
        status: "Processing",
      });

      totalPrice = price * finalQty;

      await Cart.updateOne(
        { userId },
        { $pull: { items: { productId: product, size: size } } }
      );
    } else {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Your cart is empty" });
      }

      const validCartItems = cart.items.filter(
        (item) =>
          item.productId &&
          item.productId.isBlocked === false &&
          item.productId.quantity > 0
      );

      if (validCartItems.length === 0) {
        return res
          .status(400)
          .json({ message: "No available products to order" });
      }

      for (const item of validCartItems) {
        const productDoc = await Product.findOne(
          { _id: item.productId._id, "sizes.size": item.size },
          { "sizes.$": 1 }
        );

        if (!productDoc) continue;

        const availableQty = productDoc.sizes[0].quantity;

        if (availableQty === 0) {
          await Cart.updateOne(
            { userId },
            {
              $pull: {
                items: { productId: item.productId._id, size: item.size },
              },
            }
          );

          return res.status(409).json({
            message: `${item.productId.name} (size ${item.size}) is out of stock.`,
            redirect: "/cart",
          });
        }

        let finalQty = item.quantity;
        if (item.quantity > availableQty) {
          finalQty = availableQty;

          await Cart.updateOne(
            {
              userId,
              "items.productId": item.productId._id,
              "items.size": item.size,
            },
            { $set: { "items.$.quantity": availableQty } }
          );

          warnings.push(
            `Quantity adjusted for ${item.productId.name} (size ${item.size}). Only ${availableQty} available.`
          );
        }

        const price = item.productId.salePrice || item.productId.price;

        orderedItems.push({
          orderItemId: generateOrderItemId(),
          product: item.productId._id,
          quantity: finalQty,
          size: item.size,
          price: price,
          totalPrice: price * finalQty,
          status: "Processing",
        });
      }

      totalPrice = orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      await Cart.findOneAndUpdate(
        { userId: userObjectId },
        { $set: { items: [] } }
      );
    }

    for (const item of orderedItems) {
      await Product.updateOne(
        { _id: item.product, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } }
      );
    }

    const newOrder = new Order({
      userId,
      orderedItems,
      totalPrice: orderData.totalAmount,
      discount: orderData.discount,
      finalAmount: orderData.finalAmount,
      address: addressId,
      invoiceDate: new Date(),
      couponApplied: orderData.couponApplied,
      paymentMethod: paymentMethod,
      overAllStatus: "Processing",
      deliveryCharge: orderData.deliveryCharge,
    });

    await newOrder.save();

    delete req.session.orderData;
    delete req.session.couponData;

    for (const item of orderedItems) {
  const actualProduct = await Product.findById(item.product); 
  if (actualProduct && actualProduct.sizes && actualProduct.sizes.length > 0) {
    
    actualProduct.quantity = actualProduct.sizes.reduce((sum, s) => sum + s.quantity, 0);
    await actualProduct.save();
  }
}


    res.status(200).json({
      message: "Order placed successfully",
      orderId: newOrder.orderId,
      warnings,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const buyNowSingleProduct = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;
    const size = req.params.size;
    const quantity = parseInt(req.query.quantity) || 1;

    const product = await Product.findById(productId);

    if (!product || product.isBlocked) {
      return res.json({ success: false, message: "Product not available" });
    }

    const sizeObj = product.sizes.find((s) => s.size === size);

    if (!sizeObj || sizeObj.quantity < 1) {
      return res.json({
        success: false,
        message: `Selected size (${size}) is out of stock`,
      });
    }

    let finalQty = quantity;
    let adjustedMessage = "";

    if (finalQty > sizeObj.quantity) {
      finalQty = sizeObj.quantity;
      adjustedMessage = `Quantity adjusted: Only ${sizeObj.quantity} item(s) available in size ${size}`;
    }

    const cart = await Cart.findOneAndUpdate(
      { userId, "items.productId": productId, "items.size": size },
      {
        $set: {
          "items.$.quantity": finalQty,
          "items.$.price": product.salePrice,
        },
      },
      { new: true }
    );

    if (!cart) {
      await Cart.updateOne(
        { userId },
        {
          $push: {
            items: {
              productId: product._id,
              size: size,
              quantity: finalQty,
              price: product.salePrice,
            },
          },
        },
        { upsert: true }
      );
    }

    product.quantity = product.sizes.reduce(
      (acc, s) => acc + (s.quantity || 0),
      0
    );

    await product.save();
    return res.json({
      success: true,
      redirectUrl: `/cart/select-address?type=single&productId=${productId}&size=${size}`,
      message: adjustedMessage,
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const loadSuccessPage = async (req, res) => {
  try {
    const id = req.session.user;
    let user;
    if (id) {
      user = await User.findById(id);
    }

    res.render("user/orderSuccess", { user, cssFile: "ordersuccess.css" });
  } catch (error) {
    console.error("Error:", error.message);
  }
};
const loadFailedPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    res.render("user/paymentError", { user, cssFile: "paymentfail.css" });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const checkStock = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || !cart.items.length) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let outOfStockItems = [];
    let adjustedItems = [];
    let itemsToKeep = [];

    for (const item of cart.items) {
      const product = item.productId;

      if (!product || product.isBlocked) {
        outOfStockItems.push(
          `${product?.productName || "Unknown Product"} (blocked)`
        );
        continue;
      }

     
      const sizeObj = product.sizes.find((s) => s.size === item.size);

      if (!sizeObj || sizeObj.quantity < 1) {
        outOfStockItems.push(`${product.productName} (${item.size})`);
        continue;
      }

      let finalQty = item.quantity;
      if (item.quantity > sizeObj.quantity) {
        finalQty = sizeObj.quantity;
        adjustedItems.push({
          productName: product.productName,
          size: item.size,
          availableQty: sizeObj.quantity,
        });
      }

      itemsToKeep.push({
        productId: product._id,
        size: item.size,
        quantity: finalQty,
        price: product.salePrice,
        totalPrice: product.salePrice * finalQty,
        status: "inCart",
        cancellationReason: "none",
      });
    }

    cart.items = itemsToKeep;
    await cart.save();

    let message = "";
    if (outOfStockItems.length) {
      message += `${outOfStockItems.join(", ")} removed from cart. `;
    }
    if (adjustedItems.length) {
      message += adjustedItems
        .map(
          (item) =>
            `${item.productName} (${item.size}) quantity adjusted to ${item.availableQty}`
        )
        .join(", ");
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const checkPaymentStock = async (req, res) => {
  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Your cart is empty" });
    }

    let outOfStockItems = [];
    let updatedCart = [];
    let adjustedItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      const selectedSize = item.size;
      if (!product || product.isBlocked) {
        outOfStockItems.push(product?.productName || "Unknown product");
        continue;
      }
      const sizeObj = product.sizes.find((s) => s.size === selectedSize);

      if (!sizeObj || sizeObj.quantity < 1) {
        outOfStockItems.push(`${product.productName} (${selectedSize})`);
        continue;
      }

      if (item.quantity > sizeObj.quantity) {
        adjustedItems.push({
          productName: product.productName,
          size: selectedSize,
          availableQty: sizeObj.quantity,
        });
        item.quantity = sizeObj.quantity;
      }

      item.totalPrice =
        item.quantity * (product.salePrice || product.regularPrice);

      updatedCart.push(item);

      product.quantity = product.sizes.reduce(
        (acc, s) => acc + (s.quantity || 0),
        0
      );

      await product.save();
    }

    cart.items = updatedCart;
    await cart.save();

    let message = "";
    if (outOfStockItems.length > 0) {
      message += `${outOfStockItems.join(", ")} ${
        outOfStockItems.length > 1 ? "are" : "is"
      } out of stock.`;
    }

    if (adjustedItems.length > 0) {
      message += adjustedItems
        .map(
          (item) =>
            `${item.productName} (${item.size}) quantity adjusted to available stock (${item.availableQty}) `
        )
        .join(", ");
    }

    return res.json({
      success: true,
      outOfStockItems,
      adjustedItems,
      message,
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const cartCheckoutValidate = async (req, res) => {
  try {
    const userId = req.session.user;
    const { type, product, size } = req.body;
    const {paymentMethod} = req.session.orderData;

    let cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || !cart.items.length) {
      return res.json({
        success: false,
        message: "Cart is empty",
        redirectCart: true,
      });
    }

    let messages = [];
    let itemsToKeep = [];
    let redirectCart = false;


    if (type === "single" && product && size) {
      const item = cart.items.find(
        (i) => i.productId._id.toString() === product && i.size === size
      );

      if (!item) {
        return res.json({
          success: false,
          message: "Product not found in cart",
          redirectCart: true,
        });
      }

      const productDoc = await Product.findOne(
        { _id: product, "sizes.size": size },
        { "sizes.$": 1 }
      );

      if (!productDoc || productDoc.sizes[0].quantity === 0) {
        await Cart.updateOne(
          { userId },
          { $pull: { items: { productId: product, size } } }
        );
        return res.json({
          success: false,
          message: `${item.productId.productName} (size ${size}) is out of stock.`,
          redirectCart: true,
        });
      }

      let finalQty = item.quantity;
      if (item.quantity > productDoc.sizes[0].quantity) {
        finalQty = productDoc.sizes[0].quantity;
        messages.push(
          `Quantity adjusted: Only ${finalQty} item(s) available for ${item.productId.productName} (size ${size}).`
        );
        await Cart.updateOne(
          { userId, "items.productId": product, "items.size": size },
          {
            $set: {
              "items.$.quantity": finalQty,
              "items.$.totalPrice": finalQty * item.price,
            },
          }
        );
      }

      itemsToKeep.push({
        ...item._doc,
        quantity: finalQty,
        totalPrice: finalQty * item.price,
      });
    }

   
    else {
      for (let item of cart.items) {
        const product = item.productId;
        const sizeObj = product?.sizes?.find((s) => s.size === item.size);

        if (
          !product ||
          product.isBlocked ||
          !sizeObj ||
          sizeObj.quantity === 0
        ) {
          messages.push(
            `Removed: ${product?.productName || "Product"} (${
              item.size
            }) is unavailable.`
          );
          redirectCart = true;
          continue;
        }

        if (item.quantity > sizeObj.quantity) {
          item.quantity = sizeObj.quantity;
          item.totalPrice = item.price * item.quantity;
          messages.push(
            `Quantity adjusted: Only ${sizeObj.quantity} item(s) available for ${product.productName} (${item.size}).`
          );
        }

        itemsToKeep.push(item);
      }
    }

  
    cart.items = itemsToKeep;
    await cart.save();

    if (itemsToKeep.length === 0) {
      return res.json({
        success: false,
        message: "All items in your cart are out of stock.",
        messages,
        redirectCart: true,
      });
    }

   
    cart = await Cart.findOne({ userId }).populate("items.productId");
    itemsToKeep = cart.items;

    const totalAmount = itemsToKeep.reduce(
      (sum, item) => sum + (item.totalPrice || item.price * item.quantity),
      0
    );

  
    let discount = req.session.couponData?.discount || 0;

    
    if (
      req.session.couponData?.minAmount &&
      totalAmount < req.session.couponData.minAmount
    ) {
      discount = 0;
      messages.push(
        "Coupon removed: minimum amount not met after cart update."
      );
      req.session.couponData = null;
    }

    const deliveryCharge = req.session.orderData.deliveryCharge||0;  
    const finalAmount = Math.max(totalAmount + deliveryCharge - discount, 0);

    const selectedAddressId = req.session.selectedAddress;
    if (!selectedAddressId) {
      return res.json({
        success: false,
        message: "Please select a delivery address before checkout.",
        redirectCart: true,
      });
    }

    
    const addressDoc = await Address.findOne({
      "address._id": selectedAddressId,
    });

    if (!addressDoc) {
      return res.json({
        success: false,
        message: "Selected address not found. Please select a valid address.",
        redirectCart: true,
      });
    }

    const selectedAddress = addressDoc.address.id(selectedAddressId);
    if (!selectedAddress) {
      return res.json({
        success: false,
        message: "Selected address not found. Please select a valid address.",
        redirectCart: true,
      });
    }

    req.session.orderData = {
      type,
      product: type === "single" ? product : null,
      size: type === "single" ? size : null,
      items: itemsToKeep.map((item) => ({
        productId: item.productId._id,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice || item.price * item.quantity,
      })),
      totalAmount,
      discount,
      deliveryCharge,
      finalAmount,
      address: selectedAddress,
      paymentMethod:paymentMethod
    };

    return res.json({ success: true, warnings: messages, redirectCart });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: "Validation failed",
      redirectCart: false,
    });
  }
};

const validateStock = async (req, res) => {
  try {
    const userId = req.session.user;
    const { type, product, size } = req.query;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || !cart.items.length) {
      return res.json({
        success: false,
        message: "Cart is empty",
        redirectCart: true,
      });
    }

    let messages = [];
    let itemsToKeep = [];
    let mustRedirect = false;

    if (type === "single" && product && size) {
      const item = cart.items.find(
        (i) => i.productId._id.toString() === product && i.size === size
      );

      if (!item) {
        return res.json({
          success: false,
          message: "Selected product not found in cart",
          redirectCart: true,
        });
      }

      const sizeObj = item.productId.sizes.find((s) => s.size === size);

      if (!sizeObj || sizeObj.quantity < 1) {
        await Cart.updateOne(
          { userId },
          { $pull: { items: { productId: product, size } } }
        );
        return res.json({
          success: false,
          message: `${item.productId.productName} (${size}) is out of stock`,
          redirectCart: true,
        });
      }

      if (item.quantity > sizeObj.quantity) {
        item.quantity = sizeObj.quantity;
        item.totalPrice = item.price * item.quantity;
        messages.push({
          name: item.productId.productName,
          size: item.size,
          message: `Quantity adjusted: Only ${sizeObj.quantity} item(s) available in size ${item.size}`,
          redirect: false,
        });
      }

      itemsToKeep.push(item);
    } else {
      for (let item of cart.items) {
        const productDoc = item.productId;
        const sizeObj = productDoc?.sizes.find((s) => s.size === item.size);

        if (
          !productDoc ||
          productDoc.isBlocked ||
          !sizeObj ||
          sizeObj.quantity < 1
        ) {
          messages.push({
            name: productDoc?.productName || "Unknown Product",
            size: item.size,
            message: `Removed: ${productDoc?.productName || "Product"} (${
              item.size
            }) is unavailable`,
            redirect: true,
          });
          mustRedirect = true;
          continue;
        }

        if (item.quantity > sizeObj.quantity) {
          item.quantity = sizeObj.quantity;
          item.totalPrice = item.price * item.quantity;
          messages.push({
            name: productDoc.productName,
            size: item.size,
            message: `Quantity adjusted: Only ${sizeObj.quantity} item(s) available in size ${item.size}`,
            redirect: false,
          });
        }

        itemsToKeep.push(item);
      }
    }

    cart.items = itemsToKeep;
    cart.totalPrice = itemsToKeep.reduce(
      (sum, i) => sum + (i.totalPrice || i.price * i.quantity),
      0
    );
    await cart.save();

    if (itemsToKeep.length === 0 || mustRedirect) {
      return res.json({ success: false, messages, redirectCart: true });
    }

    if (messages.length > 0) {
      return res.json({ success: true, messages, redirectCart: false });
    }

    return res.json({ success: true, messages: [] });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Validation failed",
      redirectCart: true,
    });
  }
};

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
  postWalletPayment,
  checkStock,
  checkPaymentStock,
  cartCheckoutValidate,
  validateStock,
};
