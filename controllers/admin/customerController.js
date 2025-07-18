const User = require("../../models/userSchema");



const customerInfo = async(req,res)=>{
    try {
        
        let search = req.session.search||"";
        if(req.query.search){
            search = req.query.search;
        }

        let page = 1;
        if(req.query.page){
            page = parseInt(req.query.page);
        }
        const limit = 3;
        const userData = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ]
        }).limit(limit*1).skip((page-1)*limit).exec();

        const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ]
        }).countDocuments();

        res.render("admin/customers",{search:search,users:userData,totalPages:Math.ceil(count/limit),currentPage:page,cssFile:"admin/dashboard"});


    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const customerBlocked = async (req,res)=>{
    try {
        
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});

        res.redirect("/admin/users")

    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const customerUnblocked = async(req,res)=>{
    try{
        let id = req.query.id;

        await User.updateOne({_id:id},{$set:{isBlocked:false}});

        res.redirect("/admin/users");

    }
    catch(error){
        res.redirect("/admin/pageerror");
    }
}


module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
};