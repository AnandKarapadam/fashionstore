const User = require("../../models/userSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 5; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
const sendVerificationEmail = async (email, otp) => {
  try {
        console.log("SMTP User:", process.env.NODEMAILER_EMAIL);
console.log("SMTP Pass:", process.env.NODEMAILER_PASSWORD ? "Loaded" : "Missing");
    const transporter = nodeMailer.createTransport({
      name:"anandkv@gmail.com",  
      service:"gmail",
      port: 587,
      secure: false,
    //   requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });


    const mailOptions = {
      from: `${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Fashion Store - Your One Time Password (OTP)",
      html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
      <h4>Your OTP: <strong>${otp}</strong></h4>
      <p>This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.</p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;">
      <p style="font-size:12px; color:#777;">
        – Fashion Store Support<br>
        This is an automated message, please do not reply.
      </p>
    </div>
  `,
      headers: {
        "X-Mailer": "FashionStore App", // helps avoid spam
        'Reply-To': process.env.NODEMAILER_EMAIL,
      },
    };

    const info = await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Sending Email Error", error.message);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("Cannot hash password..!");
    console.error("error:", error.message);
  }
};

const loadForgetpage = async (req, res) => {
  try {
    res.render("user/forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.error("Error in loading forget page", error.message);
  }
};
const forgetEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("user/forgotOTP");
        console.log("OTP", otp);
      } else {
        res.json({ success: false, message: "Failed to send OTP!" });
      }
    } else {
      res.render("user/forgot-password", {
        message: "User with this email doesnot exist",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.error("Error ", error.message);
  }
};
const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    console.log(req.session.userOtp);

    if (String(enteredOTP) === String(req.session.userOtp)) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP Not Matching" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error in OTP verification!" });
    res.redirect("/pageNotFound");
    console.error("Error", error.message);
  }
};

const getResetPasswordPage = async (req, res) => {
  try {
    res.render("user/resetpassword");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.error("Error", error.message);
  }
};

const resendforgotOTP = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("Resending otp to email:", email);
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      console.log("Resend OTP:", otp);
      res.status(200).json({ success: true, message: "Resend OTP Successful" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Cannot send OTP to this email!" });
    }
  } catch (error) {
    console.error("Error in resend OTP", error);
    res.redirect("/pageNotFound");
  }
};

const postNewPassword = async (req, res) => {
  try {
    const { passOne, passTwo } = req.body;
    const email = req.session.email;

    if (passOne === passTwo) {
      const passwordHash = await securePassword(passOne);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      return res.json({
        success: true,
        message: "Password Updated Successfully.",
      });
    } else {
      return res.json({ success: false, message: "Passwords do not match!" });
    }
  } catch (error) {
    console.error("Error in Reseting Password", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId);
    const address = await Address.findOne({ userId });

    res.render("user/editProfile", { search: "", user, address });
  } catch (error) {
    console.log(error.message);
    res.redirect("/pageNotFound");
  }
};

const loadProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const address = await Address.findOne({ userId });

    res.render("user/profile", { search: "", user, address });
  } catch (error) {
    console.error(error.message);
  }
};

const postProfile = async (req, res) => {
  try {
    const { name, email, phone, gender } = req.body;
    const image = req.file ? req.file.filename : "default-img.jpg";
    let updateData = { name, email, phone, gender };
    const userId = req.session.user;
    if (image) {
      updateData.image = image;
    }

    const userUpdate = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
    const user = await User.findById(userId);
    const address = await Address.findOne({ userId });

    res.redirect("/profile");
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const loadChangePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("user/changePassword", { user });
  } catch (error) {
    console.log(error.message);
  }
};

const postEmailForOtp = async (req, res) => {
  try {
    const email = req.body.email;

    const findUser = await User.findOne({ email: email });

    if (findUser) {
      const otp = generateOtp();
      console.log(otp);
      const emailSend = await sendVerificationEmail(email, otp);
      if (emailSend) {
        req.session.userOtp = otp;
        console.log(otp);
        req.session.email = email;
        res.render("user/changeOTP");
        console.log(otp);
      } else {
        res.json({ success: false, message: "Cannot send OTP to this email" });
      }
    } else {
      res.render("user/changePassword", {
        message: "User with this email doesnot exist",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const verifyChangeOTP = async (req, res) => {
  try {
    const enteredOTP = req.body.otp;

    if (String(enteredOTP) === String(req.session.userOtp)) {
      res.json({ success: true, redirectUrl: "/password-change" });
    } else {
      res.json({ success: false, message: "OTP Not Matching" });
    }
  } catch (error) {
    res.json({ success: false, message: "Cannot verify OTP" });
    console.error("Error:", error.message);
  }
};

const loadPasswordChangePage = async (req, res) => {
  try {
    res.render("user/passwordChange");
  } catch (error) {
    console.log(error.message);
  }
};

const resendChangePassOTP = async (req, res) => {
  try {
    const otp = generateOtp();

    const email = req.session.email;

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      res.json({ success: true, message: "OTP send successfully" });
      req.session.userOtp = otp;
      console.log(req.session.userOtp, otp);
    } else {
      res.json({ success: false, message: "Cannot send OTP" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const postPasswordChangePage = async (req, res) => {
  try {
    const passOne = req.body.passOne;
    const passTwo = req.body.passTwo;
    const email = req.session.email;

    if (passOne === passTwo) {
      const hashPassword = await securePassword(passOne);
      await User.findOneAndUpdate(
        { email: email },
        { $set: { password: hashPassword } }
      );

      res.json({ success: true, message: "Password Updated!" });
    } else {
      res.json({ success: false, message: "Password doesn't match." });
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const changeEmailPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    if (user) {
      res.render("user/changeEmail");
    } else {
      res.redirect("/profile");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const varifyEmailChangeOTP = async (req, res) => {
  try {
    const newEmail = req.body.email;

    const existingUser = await User.findOne({ email: newEmail });

    if (existingUser) {
      return res.render("user/changeEmail", {
        message: "User with this email already exist!",
      });
    } else {
      const otp = generateOtp();
      console.log(otp);
      const emailSend = await sendVerificationEmail(newEmail, otp);
      if (emailSend) {
        req.session.userOtp = otp;
        req.session.email = newEmail;
        res.render("user/changeEmailOTP");
      } else {
        res.render("user/changeEmail", { message: "Email is not valid" });
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const changeEmailOTPVerify = async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    const otp = req.session.userOtp;
    const newEmail = req.session.email;

    if (String(otp) === String(enteredOTP)) {
      const user = await User.findByIdAndUpdate(req.session.user, {
        $set: { email: newEmail },
      });
      if (user) {
        res.json({ success: true, redirectUrl: "/edit-profile" });
      } else {
        res.json({ success: false, message: "Cannot find user" });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const changeEmailResendOTP = async (req, res) => {
  try {
    const otp = generateOtp();

    const email = req.session.email;

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      res.json({ success: true, message: "OTP send successfully" });
      req.session.userOtp = otp;
      console.log(req.session.userOtp, otp);
    } else {
      res.json({ success: false, message: "Cannot send OTP" });
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
};

const loadReferAndEarn = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const rewardCoupons = await Coupon.find({
      user: userId,
      isList: true,
      expireOn: { $gt: new Date() },
    });

    res.render("user/referAndEarn", {
      user,
      cssFile: "referandearn.css",
      rewardCoupons,
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

module.exports = {
  loadForgetpage,
  forgetEmailValid,
  verifyForgotPassOtp,
  getResetPasswordPage,
  resendforgotOTP,
  postNewPassword,
  loadEditProfile,
  loadProfile,
  postProfile,
  loadChangePassword,
  postEmailForOtp,
  verifyChangeOTP,
  loadPasswordChangePage,
  resendChangePassOTP,
  postPasswordChangePage,
  changeEmailPage,
  varifyEmailChangeOTP,
  changeEmailOTPVerify,
  changeEmailResendOTP,
  loadReferAndEarn,
};
