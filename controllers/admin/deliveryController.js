const Delivery = require("../../models/deliverySchema");


const loadDeliveryCharge = async(req,res)=>{
    try {

        let delivery = await Delivery.findOne();

   
    if (!delivery) {
      delivery = new Delivery({
        type: "fixed",   
        amount: 0,       
        stateRules: []   
      });
      await delivery.save();
    }

    res.render("admin/deliverycharge", { delivery ,cssFile:'deliverypage.css'});
        
    } catch (error) {
        console.log("Error:",error.message);
    }
}

const postDeliveryCharge = async (req, res) => {
  try {
    const { formData, deliveryId } = req.body;

    if (!formData) {
      return res.json({ success: false, message: "Cannot find form data" });
    }

    let deliveryDoc;

    
    if (formData.type === "fixed") {
      const updateData = {
        type: "fixed",
        amount: formData.amount,
        
      };

      if (deliveryId) {
        deliveryDoc = await Delivery.findByIdAndUpdate(deliveryId, updateData, { new: true });
      } else {
        deliveryDoc = new Delivery(updateData);
        await deliveryDoc.save();
      }

      return res.json({ success: true, message: "Fixed delivery charge updated successfully", delivery: deliveryDoc });
    }

    
    if (formData.type === "state") {
      if (deliveryId) {
        
        deliveryDoc = await Delivery.findOne({ _id: deliveryId, "stateRules.state": formData.state });

        if (deliveryDoc) {
       
          deliveryDoc = await Delivery.findOneAndUpdate(
            { _id: deliveryId, "stateRules.state": formData.state },
            { $set: { "stateRules.$.charge": formData.charge }, type: "state"},
            { new: true }
          );

          return res.json({ success: true, message: "State charge updated successfully", delivery: deliveryDoc });
        } else {
       
          deliveryDoc = await Delivery.findByIdAndUpdate(
            deliveryId,
            {
              type: "state",
              $push: { stateRules: { state: formData.state, charge: formData.charge } }
            },
            { new: true }
          );

          return res.json({ success: true, message: "New state charge added successfully", delivery: deliveryDoc });
        }
      } else {
        
        deliveryDoc = new Delivery({
          type: "state",
          stateRules: [{ state: formData.state, charge: formData.charge }]
        });
        await deliveryDoc.save();

        return res.json({ success: true, message: "Delivery charge created successfully", delivery: deliveryDoc });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res.json({ success: false, message: "Server error. Try again." });
  }
};


module.exports = {
    loadDeliveryCharge,
    postDeliveryCharge
}