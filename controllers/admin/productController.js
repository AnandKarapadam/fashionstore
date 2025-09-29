const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const categorys = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });
    res.render("admin/addProduct", {
      cssFile: "admin/dashboard",
      categorys,
      brands,
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const addproduct = async (req, res) => {
  try {
    const products = req.body;
    const productExisting = await Product.find({
      productName: products.productName,color:products.color
    });

    const sizeArray = [
      { size: "M", quantity: parseInt(products.medium) || 0 },
      { size: "L", quantity: parseInt(products.large) || 0 },
      { size: "XL", quantity: parseInt(products.xl) || 0 },
    ];

    const totalQty = sizeArray.reduce((acc, s) => acc + s.quantity, 0);

    const categorys = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    if (productExisting.length === 0) {
      const images = [];

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;

          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            req.files[i].filename
          );

          await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);
        }
      }
      const categoryDoc = await Category.findOne({ _id: products.category });
      const brandDoc = await Brand.findOne({ _id: products.brands });

      if (!categoryDoc || !brandDoc) {
        return res.render("admin/addProduct", {
          message: "Category/Brand not found!",
          formData: products,
          categorys,
          brands,
        });
      }

      let roundedOffer = "";
      if (products.actualPrice && products.discountPrice) {
        const offer =
          ((products.actualPrice - products.discountPrice) /
            products.actualPrice) *
          100;
        roundedOffer = Math.round(offer);
      }

      const statusValidated = totalQty > 0 ? "Available" : "Out of Stock";

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brands,
        category: categoryDoc._id,
        regularPrice: products.actualPrice,
        salePrice: products.discountPrice,
        quantity: totalQty,
        productOffer: roundedOffer || "",
        color: products.color,
        productImage: images,
        status: statusValidated,
        sizes: sizeArray,
      });

      if (productExisting.length === 0) {
        await newProduct.save();

        return res.render("admin/addProduct", {
          success: "Product added successfully!",
          formData: {},
          categorys,
          brands,
        });
      }

    } else {
      return res.render("admin/addProduct", {
        message: "Product Already Exists!",
        formData: products,
        brands,
        categorys,
      });
    }
  } catch (error) {
    console.log("Error in saving new Product");
    console.error("Error:", error.message);
    return res.redirect("/admin/pageerror");
  }
};

const loadProductsPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;

    const limit = 4;
    const skip = (page - 1) * limit;
    const brandMatch = await Brand.find({
      brandName: { $regex: new RegExp(search, "i") },
    }).select("_id");

    const brandIds = brandMatch.map((b) => b._id);
    const query = {
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $in: brandIds } },
      ],
    };
    const productData = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("category")
      .populate("brand")
      .exec();

    const count = await Product.find(query).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("admin/products", {
        products: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brands: brand,
        cssFile: "admin/dashboard",
        search,
      });
    } else {
      res.redirect("/admin/pageerror");
    }
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.log("Error in loading the product page", error.message);
  }
};

const removeOffer = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findById(id);
    const regularPrice = product.regularPrice;

    await Product.findByIdAndUpdate(id, {
      salePrice: regularPrice,
      productOffer: "",
    });

    res.redirect("/admin/products");
  } catch (error) {
    console.log("Error removing offer:", error.message);
    res.redirect("/admin/pageerror");
  }
};

const addOffer = async (req, res) => {
  try {
    const id = req.params.id;
    let offer = parseFloat(req.body.offerPrice);
    const productData = await Product.findById(id).populate("category");
    let offerPrice = 0;

    if (productData) {
      const realPrice = productData.regularPrice;

      offerPrice = realPrice - (realPrice * offer) / 100;

      if (productData.category && productData.category.categoryOffer) {
        if (
          productData.category.categoryOffer > offer &&
          productData.category.isListed
        ) {
          offer = productData.category.categoryOffer;
          offerPrice = realPrice - (realPrice * offer) / 100;
        }
      }
      await Product.findByIdAndUpdate(id, {
        salePrice: Math.round(offerPrice),
        productOffer: Math.round(offer),
      });
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error in add offer:", error.message);
    res.redirect("/admin/pageerror");
  }
};

const toggleIsBlocked = async (req, res) => {
  try {
    const id = req.params.id;
    const productData = await Product.findById(id);
    if (!productData) {
      return res.redirect("/admin/pageerror");
    }
    productData.isBlocked = !productData.isBlocked;

    await productData.save();

    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.error("Error in updating status", error.message);
  }
};

const productDelete = async (req, res) => {
  try {
    const id = req.params.id;

    await Product.findByIdAndDelete(id);

    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.error("Error in deleting product!", error.message);
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const productData = await Product.findById(id)
      .populate("category")
      .populate("brand");

    if (!productData) {
      return res.redirect("/admin/pageerror");
    }

    const category = await Category.find();
    const brand = await Brand.find();

    res.render("admin/editProduct", {
      cssFile: "admin/dashboard",
      product: productData,
      categories: category,
      brands: brand,
    });
  } catch (error) {
    console.error("Error in rendering edit page", error.message);
    res.redirect("/admin/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      return res.redirect("/admin/pageerror");
    }

  
    existingProduct.productName = req.body.name;
    existingProduct.description = req.body.description;
    existingProduct.brand = req.body.brand;
    existingProduct.category = req.body.category;
    existingProduct.color = req.body.color;
    existingProduct.regularPrice = req.body.actualPrice;
    existingProduct.salePrice = req.body.discountPrice;
    existingProduct.quantity = req.body.quantity;

    const mQty = Number(req.body.mQuantity)||0;
    const lQty = Number(req.body.lQuantity)||0;
    const xlQty = Number(req.body.xlQuantity)||0;

    existingProduct.sizes= [
      {size:"M",quantity:mQty},
      {size:"L",quantity:lQty},
      {size:"XL",quantity:xlQty}
    ]

    const totalQuantity = mQty+lQty+xlQty;
    existingProduct.quantity = totalQuantity

    if (totalQuantity === 0) {
  existingProduct.status = "out of stock"; 
} else if (req.body.status === "Discontinued") {
  existingProduct.status = "Discontinued"; 
} else {
  existingProduct.status = "Available"; 
}


    
    if (req.body.deletedImages) {
      const deleted = req.body.deletedImages.split(",");
      existingProduct.productImage = existingProduct.productImage.filter(
        (img) => {
          if (deleted.includes(img)) {
            const oldPath = path.join(
              "public",
              "uploads",
              "product-images",
              img
            );
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); 
            return false;   
          }
          return true;
        }
      );
    }

    
    if (req.files && req.files.length > 0) {
      const uploadedImages = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const tempPath = file.path;
        const finalPath = path.join(
          "public",
          "uploads",
          "product-images",
          file.filename
        );

        await sharp(tempPath)
          .resize({ width: 440, height: 440 })
          .toFile(finalPath);

        uploadedImages.push(file.filename);
      }

      
      uploadedImages.forEach((img) => {
        const emptyIndex = existingProduct.productImage.findIndex(
          (x) => !x || x.trim() === ""
        );
        if (emptyIndex !== -1) {
          existingProduct.productImage[emptyIndex] = img; 
        } else {
          existingProduct.productImage.push(img); 
        }
      });
    }

    await existingProduct.save();
    return res.redirect("/admin/products");
  } catch (error) {
    console.error("Error while editing product:", error.message);
    return res.redirect("/admin/pageerror");
  }
};

const deleteImage = async (req, res) => {
  try {
    const productId = req.params.id;
    const { image } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Remove from array
    product.productImage = product.productImage.filter((img) => img !== image);

    // Delete files
    ["product-images", "re-image"].forEach((folder) => {
      const filePath = path.join("public", "uploads", folder, image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await product.save();
    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

module.exports = {
  getProductAddPage,
  addproduct,
  loadProductsPage,
  removeOffer,
  addOffer,
  toggleIsBlocked,
  productDelete,
  loadEditProduct,
  editProduct,
  deleteImage,
};
