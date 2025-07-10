

let loadHomepage = async (req,res)=>{
    try {
        
        return res.send("Home page");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server error");
    }
}


module.exports = {
    loadHomepage
}