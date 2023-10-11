exports = async function() {
  const collection = context.services.get("mongodb-atlas").db("demo_hc_virtual_hospital").collection("appointments");
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const query = {
    $and: [
      { status: { $in: ["canceled", "noshow"] } },
      { start: { $lt: threeDaysAgo } }
    ]
  };

  const deleteResult = await collection.deleteMany(query);//deleteMany

  return deleteResult;
};
