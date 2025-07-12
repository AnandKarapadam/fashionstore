

let loadHomepage = async (req,res)=>{
    try {
        
        return res.render("user/home",{search : "Anand",sort:"low to high",category:"pants",minPrice:1000,maxPrice:2000,products:["p1","p2","p3"],totalPages:3,currentPage:4});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server error");
    }
}

let loadLogin = async(req,res)=>{
    try {
        return res.render("user/login");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}
let loadSignup = async(req,res)=>{
    try {
        
        return res.render("user/signup");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}

let loadOtp = async (req,res)=>{
    try {
        return res.render("user/otp");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}
let loadForgetpage = async (req,res)=>{
    try {

        return res.render("user/forgot-password");
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}

let loadProductdetails = async(req,res)=>{
    try {
        
        return res.render("user/product_details",{product:"hello"});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error",);
    }
}
let loadPageNotFound = async(req,res)=>{
    try {
        
        return res.render("user/pageNotFound");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error")
    }
}
module.exports = {
    loadHomepage,
    loadLogin,
    loadSignup,
    loadOtp,
    loadForgetpage,
    loadProductdetails,
    loadPageNotFound
}