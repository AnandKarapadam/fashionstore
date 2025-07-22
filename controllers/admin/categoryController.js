const Category = require("../../models/categorySchema");



const categoryInfo = async(req,res)=>{
    try {
        const page = parseInt(req.query.page)||1;
        const limit = 4;
        const skip = (page-1)*limit;
        const search = req.query.search || "";

        
        const query = search ? {name:{$regex:search,$options:"i"}}:{};

        const categoryData = await Category.find(query).sort({createdAt:-1}).skip(skip).limit(limit);

        const totalCategories = await Category.countDocuments(query);
        const totalMatch = Math.ceil(totalCategories/limit);

        res.render("admin/category",{
            cssFile:"admin/dashboard",
            search,
            categories:categoryData,
            cat:categoryData,
            currentPage:page,
            totalPages:totalMatch
        })
    


    } catch (error) {
        console.error(error);
        res.redirect("/pageerror")
    }
}

const addCategory = async(req,res)=>{
    const {name,description} = req.body;
    try {   
        
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category already Exists"})
        }

        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"});

    } catch (error) {
        return res.status(500).json({error:"Internal Server Error"})
    }
}

const addOffer = async(req,res)=>{
    try {
        const {id} = req.params;
        const {offerPrice} = req.body;

        if(!offerPrice || offerPrice<0){
            req.session.error = "Invalid offer price";
            return res.redirect("/admin/category");
        }
        await Category.findByIdAndUpdate(id,{categoryOffer:offerPrice});

        req.session.success = "Offer added successfully";
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Add offer Error",error);
        res.redirect("/admin/pageerror")
    }
}

const removeOffer = async (req,res)=>{
    try {
       const {id} = req.params;
       if(!id){
        return res.redirect("admin/category");
       }
       await Category.findByIdAndUpdate(id,{categoryOffer:0});
       
       res.redirect("/admin/category");
    } catch (error) {
        console.error("Error In Removing Offer ",error);
        res.redirect("/admin/pageerror");
    }
}

const toggleCategoryStatus = async(req,res)=>{
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if(!category){
            return res.redirect("/admin/categroy");
        }

        category.isListed = !category.isListed;
        await category.save();

        res.redirect("/admin/category");

    } catch (error) {
        console.error("Error in listing/unlisting",error);
        res.redirect("/admin/pageerror");
    }
}

const loadEditCategory = async(req,res)=>{
    try {
        const {id} = req.params;
        const categoryData = await Category.findById(id);

        if(!categoryData){
            return res.redirect('/admin/category')
        }
        res.render("admin/editCategory",{category:categoryData,cssFile:"admin/dashboard"});

    } catch (error) {
        
    }
}

const editCategory = async(req,res)=>{
    try {
        const {id} = req.params;
        const {name,description} = req.body;
        const existing = await Category.findOne({name,_id:{$ne:id}});
        if(existing){
            return res.status(400).json({error:"Category name already exists"});
        }
        await Category.findByIdAndUpdate(id,{name,description});

        res.redirect("/admin/category");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}
const deleteCategory = async(req,res)=>{
    try {
        const {id} = req.params;
        await Category.findByIdAndDelete(id);

        res.redirect("/admin/category");

    } catch (error) {
        
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addOffer,
    removeOffer,
    toggleCategoryStatus,
    loadEditCategory,
    editCategory,
    deleteCategory
};