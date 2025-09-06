const mongoose = require("mongoose");

const deliveryChargeSchema = new mongoose.Schema({
    type:{
        type:String,
        enum:["fixed","state"],
        required:true
    },
    amount:{
        type:Number
    },
    stateRules:[
        {
            state:String,
            charge:Number
        }
    ]
});

const Delivery = mongoose.model("Delivery",deliveryChargeSchema);

module.exports = Delivery;