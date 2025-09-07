const user = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");
const session = require("express-session");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Order = require("../../models/orderSchema");
const logger = require("../../utils/logger");
const ExcelJs = require("exceljs");
const PDFDocument = require("pdfkit");
const path = require("path");

const loadLogin = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/dashboard");
    } else {
      res.render("admin/login", { message: null, cssFile: "admin/login" });
    }
  } catch (error) {}
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminData = await User.findOne({ email, isAdmin: true });
    if (adminData) {
      const passwordMatch = await bcrypt.compare(password, adminData.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.render("admin/login", { message: "Wrong password" });
      }
    } else {
      return res.render("admin/login", { message: "Admin Not Found" });
    }
  } catch (error) {
    console.log("Login error", error.message);
    return res.redirect("/admin/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  try {
    if (req.session.admin) {
      const count = await User.countDocuments({ isBlocked: false });
      const prCount = await Product.countDocuments({ isBlocked: false });
      const brCount = await Brand.countDocuments({ isBlocked: false });

      const { filter, startDate, endDate, page = 1,chartFilter } = req.query;
      const limit = 5;

      let query = { overAllStatus: "Delivered" };

      const today = new Date();

      if (filter === "daily") {
        query.createOn = {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999)),
        };
      } else if (filter === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        query.createOn = {
          $gte: weekAgo,
          $lte: new Date(),
        };
      } else if (filter === "monthly") {
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        query.createOn = {
          $gte: monthAgo,
          $lte: new Date(),
        };
      } else if (filter === "yearly") {
        const yearAgo = new Date();
        yearAgo.setFullYear(today.getFullYear() - 1);
        query.createOn = {
          $gte: yearAgo,
          $lte: new Date(),
        };
      } else if (filter === "custom" && startDate && endDate) {
        query.createOn = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const totalOrders = await Order.countDocuments(query);

      const pageInt = parseInt(page) || 1;
      const skip = (pageInt - 1) * limit;
      const totalPages = Math.ceil(totalOrders / limit);

      const orders = await Order.find(query)
        .populate("userId")
        .sort({ createOn: -1 })
        .skip(skip)
        .limit(limit);

      let totalSales = 0;
      let totalProductsSold = 0;
      orders.forEach((order) => {
        totalSales += order.totalPrice;
        totalProductsSold += order.orderedItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      });


      let chartQuery = {overAllStatus:"Delivered"};

      if(chartFilter==="topDaily"){
        chartQuery.createOn = {
          $gte:new Date(today.setHours(0,0,0,0)),
          $lte:new Date(today.setHours(23,59,59,999))
        }
      }else if(chartFilter==="topMonthly"){
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth()-1);
        chartQuery.createOn={$gte:monthAgo,$lte:today}
      }else if(chartFilter=== "topYearly"){
        const yearAgo = new Date();
        yearAgo.setFullYear(today.getFullYear()-1);
        chartQuery.createOn = {$gte:yearAgo,$lte:today}
      }

      const topProducts = await Order.aggregate([
        {$match:chartQuery},
        {$unwind:"$orderedItems"},
        {
          $group:{
            _id:"$orderedItems.product",
            totalSold:{$sum:"$orderedItems.quantity"},
          },
        },
        {
          $lookup:{
            from:"products",
            localField:"_id",
            foreignField:"_id",
            as:"product",
          }
        },
        {$unwind:"$product"},
        {$project:{name:"$product.productName",totalSold:1}},
        {$sort:{totalSold:-1}},
        {$limit:10}
      ])

      const topCategories = await Order.aggregate([
        {$match:chartQuery},
        {$unwind:"$orderedItems"},
        {
          $lookup:{
            from:"products",
            localField:"orderedItems.product",
            foreignField:"_id",
            as:"product"
          }
        },
        {$unwind:"$product"},
        {
          $group:{
            _id:"$product.category",
            totalSold:{$sum:"$orderedItems.quantity"}
          }
        },
        {
          $lookup:{
            from:"categories",
            localField:"_id",
            foreignField:"_id",
            as:"category"
          }
        },
        {$unwind:"$category"},
        {$project:{name:"$category.name",totalSold:1}},
        {$sort:{totalSold:-1}},
        {$limit:10}
      ]);

      const topBrands = await Order.aggregate([
        {$match:chartQuery},
        {$unwind:"$orderedItems"},
        {
          $lookup:{
            from:"products",
            localField:"orderedItems.product",
            foreignField:"_id",
            as:"product"
          }
        },
        {$unwind:"$product"},
        {
          $group:{
            _id:"$product.brand",
            totalSold:{$sum:"$orderedItems.quantity"},
          }
        },
        {
          $lookup:{
            from:"brands",
            localField:"_id",
            foreignField:"_id",
            as:"brand"
          },
        },
        {$unwind:"$brand"},
        {$project:{name:"$brand.brandName",totalSold:1}},
        {$sort:{totalSold:-1}},
        {$limit:10}
      ])

      return res.render("admin/dashboard", {
        cssFile: "admin/dashboard",
        count,
        products: prCount,
        brand: brCount,
        filter,
        startDate,
        endDate,
        totalOrders,
        totalSales,
        totalProductsSold,
        orders,
        currentPage: pageInt,
        totalPages,
        topProducts:topProducts||[],
        topCategories:topCategories||[],
        topBrands:topBrands||[],
        chartFilter
      });
    } else {
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("Error:", error.message);
    res.redirect("/pageerror");
  }
};

const salesReportDownload = async (req, res) => {
  try {
    const { type, filter, startDate, endDate } = req.query;

    let query = { overAllStatus: "Delivered" };
    const today = new Date();

    if (filter === "daily") {
      query.createOn = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if (filter === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      query.createOn = { $gte: weekAgo, $lte: new Date() };
    } else if (filter === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      query.createOn = { $gte: monthAgo, $lte: new Date() };
    } else if (filter === "yearly") {
      const yearAgo = new Date();
      yearAgo.setFullYear(today.getFullYear() - 1);
      query.createOn = { $gte: yearAgo, $lte: new Date() };
    } else if (filter === "custom" && startDate && endDate) {
      query.createOn = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(query).populate("userId");

    if (orders.length == 0) {
      return res.status(404).send("No sales data found for this filter");
    }

    if (type === "excel") {
      const workbook = new ExcelJs.Workbook();
      const sheet = workbook.addWorksheet("Sales Report");

      sheet.columns = [
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "User", key: "user", width: 20 },
        { header: "Date", key: "date", width: 20 },
        { header: "Total Price", key: "totalPrice", width: 15 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Final Amount", key: "finalAmount", width: 15 },
      ];

      orders.forEach((order) => {
        sheet.addRow({
          orderId: order.orderId,
          user: order.userId?.name || "Guest",
          date: order.createOn.toDateString(),
          totalPrice: order.totalPrice,
          discount: order.discount || 0,
          finalAmount: order.finalAmount,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-report.xlsx"
      );

      return workbook.xlsx.write(res).then(() => res.end());
    }

   if (type === "pdf") {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sales-report.pdf"
  );

  doc.pipe(res);

  // Title
  doc.fontSize(18).text("Sales Report", { align: "center" });
  doc.moveDown(1);

  // Column setup (x position + width + alignment)
  const columns = [
    { label: "No",       key: "no",       x: 50,  width: 30,  align: "left" },
    { label: "Order ID", key: "orderId",  x: 80,  width: 80,  align: "left" },
    { label: "User",     key: "user",     x: 160, width: 80,  align: "left" },
    { label: "Date",     key: "date",     x: 240, width: 100, align: "left" },
    { label: "Total ",key: "total",    x: 340, width: 60,  align: "right" },
    { label: "Discount", key: "discount", x: 400, width: 70,  align: "right" },
    { label: "Final ",key: "final",    x: 470, width: 70,  align: "right" },
  ];

  let y = doc.y;

  // Headers
  doc.fontSize(12).font("Helvetica-Bold");
  columns.forEach(col => {
    doc.text(col.label, col.x, y, { width: col.width, align: col.align });
  });

  y += 20; 

  
  doc.moveTo(50, y - 5).lineTo(540, y - 5).stroke();

  
  doc.fontSize(10).font("Helvetica");
  orders.forEach((order, i) => {
    const row = {
      no: i + 1,
      orderId: order.orderId,
      user: order.userId?.name || "Guest",
      date: new Date(order.createOn).toDateString(),
      total: order.totalPrice,
      discount: order.discount,
      final: order.finalAmount,
    };

    columns.forEach(col => {
      doc.text(String(row[col.key]), col.x, y, { width: col.width, align: col.align });
    });

    y += 18; 
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = doc.y;
    }
  });

  doc.end();
}
  } catch (error) {
    console.log("Error:", error.message);
    logger.error(`Error:${error.message}`);
  }
};

const pageError = async (req, res) => {
  res.render("admin/admin-error", { cssFile: "admin/dashboard" });
};

const adminLogout = async (req, res) => {
  try {
    const id = req.session.user;

    const adminData = await User.find({ _id: id, isAdmin: true });

    if (adminData) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error in logout: ", err.message);
          return res.redirect("/admin/pageerror");
        }

        res.clearCookie("connect.id");
        return res.redirect("/admin/login");
      });
    }
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.error("Error:", error.message);
  }
};
module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageError,
  adminLogout,
  salesReportDownload,
};
