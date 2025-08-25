const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const logger = require("../../utils/logger");
const User = require("../../models/userSchema");



const loadAddressPage = async(req,res)=>{
    try {

        const search = req.query.search||"";
        const page = parseInt(req.query.page)||1;
        const limit = 2;
        const skip = (page-1)*limit;
        const userId = req.session.user;
        const regex = new RegExp(search,"i");
        const user = await User.findById(userId);

        const addressDoc = await Address.findOne({userId});

        if(!addressDoc){
            return res.render("user/manageAddress", {
               currentPage: 1,
               totalPages: 1,
               search,
            addresses: [{ address: [] }],
            userId,
            user
            });
        }

        const filtered = addressDoc.address.filter(addr =>
            regex.test(addr.name) ||
            regex.test(addr.city) ||
            regex.test(addr.landMark)
        );

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const paginated = filtered.slice(skip, skip + limit);       

        res.render("user/manageAddress",{
            currentPage:page,
            totalPages,
            search,
            addresses:paginated,
            userId,
            user
        });
        
    } catch (error) {
  
        logger.error("Error:",error.message);
    }
}

const loadNewAddressPage = async(req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);

        res.render("user/addAddress",{user})
        
    } catch (error) {
        console.error("Error: ",error.message);
    }
}


const postAddress = async(req,res)=>{
    try {

        const userId = req.session.user;
        const {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
            locality,
            address,
            countryCode
        } = req.body;


        const userAddressDoc = await Address.findOne({userId});

        const newAddress = {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone:altPhone||"",
            locality:locality||"",
            address,
            countryCode
        }

        if(userAddressDoc){
            userAddressDoc.address.push(newAddress);
            await userAddressDoc.save();
        }
        else{
            const newDoc = new Address({
                userId,
                address:[newAddress]
            })
            await newDoc.save();
        }

        res.redirect("/address");
    } catch (error) {
        console.error("Error-",error.message);
    }
}

const loadEditAddressPage = async(req,res)=>{
    try {
        const userId = req.session.user;
        const addressId = req.params.id;

        const user = await User.findById(userId);

        const addressDoc = await Address.findOne({userId})
        
        const selectedAddress = addressDoc.address.find(a=>a._id.toString() === addressId);

        if(!selectedAddress){
            return res.redirect("/manage-address");
        }

        res.render("user/editAddress",{address:selectedAddress,user});
    } catch (error) {
        console.error("Error:",error.message);
    }
}

const postEditAddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const userId  = req.session.user;

        const user = await User.findById(userId);

        const {
            name,
            phone,
            pincode,
            locality,
            address,
            city,
            state,
            landMark,
            altPhone,
            addressType,
            countryCode
        } = req.body;

        const updated  = await Address.updateOne(
            {userId,"address._id":addressId},{
                $set:{
                    "address.$.name":name,
                    "address.$.phone":phone,
                    "address.$.pincode":pincode,
                    "address.$.locality":locality,
                    "address.$.address":address,
                    "address.$.city":city,
                    "address.$.state":state,
                    "address.$.landMark":landMark,
                    "address.$.altPhone":altPhone,
                    "address.$.addressType":addressType,
                    "address.$.countryCode":countryCode
                }
            }
        )

        if(updated.modifiedCount === 0){
        const addressDoc = await Address.findOne({userId})
        
        const selectedAddress = addressDoc.address.find(a=>a._id.toString() === addressId);

        return res.render("user/editAddress",{address:selectedAddress,message:"Address Not found!",user});
        }
        
        res.redirect("/address");

    } catch (error) {
        console.error("Error:",error.message);
    }
}

const deleteAddress = async(req,res)=>{
    try {

        const addressId = req.params.id;
        const userId = req.session.user;

       const updated =  await Address.updateOne({userId},
            {$pull:{address:{_id:addressId}}}
        )

        if(updated.modifiedCount === 0){
           return res.status(404).send("Cannot delete address");
        }

        res.status(200).send("Deleted successfully");
        
    } catch (error) {
        console.error("Error:",error.message);
    }
}

module.exports = {
    loadAddressPage,
    loadNewAddressPage,
    postAddress,
    loadEditAddressPage,
    postEditAddress,
    deleteAddress
}