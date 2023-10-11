exports = async function(arg){
  
  const appointmentsCol = context.services.get("mongodb-atlas").db("demo_hc_virtual_hospital").collection('appointments');
  
  const currentTime = new Date();
  currentTime.setHours(currentTime.getHours() - 1);

  const query = {
      status: {$in: ["proposed", "booked"]},
      start: { $lt: currentTime },
    };
    
  const update = {'$set': {'status': 'noshow'}}
  
  log = await appointmentsCol.aggregate([{$match:query},{$project:{start:1, status:1}}]).toArray();
  
  console.log(JSON.stringify(log));
  
  result = await appointmentsCol.updateMany(query,update);

  return result;
};