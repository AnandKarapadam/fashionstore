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

      const { filter, startDate, endDate, page = 1 } = req.query;
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
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-report.pdf"
      );

      doc.pipe(res);

      doc.fontSize(18).text("Sales Report", { align: "center" });
      doc.moveDown();
      let count = 0;
      orders.forEach((order) => {
        count++;
        doc
          .fontSize(12)
          .text(
            `${count})Order: ${order.orderId} | User: ${
              order.userId?.name || "Guest"
            } | Date: ${order.createOn.toDateString()} | Total: ₹${
              order.totalPrice
            } | Discount: ₹${order.discount} | Final: ₹${order.finalAmount}`
          );
        doc.moveDown(0.5);
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
