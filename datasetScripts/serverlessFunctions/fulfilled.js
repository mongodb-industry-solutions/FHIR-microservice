exports = async function(changeEvent) {
    
    const appointments = context.services.get("mongodb-atlas").db("demo_hc_virtual_hospital").collection("appointments");
  
    const docId = BSON.ObjectId(changeEvent.fullDocument.appointmentID);

    var updateRes = await appointments.updateOne({_id : docId},{ $set : {"status" : "fulfilled"}});
    
    console.log(`Updated appointment ${docId} result : ${JSON.stringify(updateRes)}`);
};