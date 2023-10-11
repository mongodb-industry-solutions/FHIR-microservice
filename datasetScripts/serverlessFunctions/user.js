const moment = require('moment');

exports = async function(request) {
  const appointments = context.services
    .get("mongodb-atlas")
    .db("demo_hc_virtual_hospital")
    .collection("appointments");

  const limit = 2000;

  const waitlist = await appointments.aggregate([
    { '$match': { 'status': 'proposed' } }
    ,{ '$project': { 'start': 1 } }
    //,{ '$sort':{'start':1}}
    ,{ '$limit': 1000 }
  ]).toArray();

  //console.log('waitlist:', JSON.stringify(waitlist));

  const bulkUpdates = waitlist.map((x) => {
    const query = { '_id': x._id };
    const cancel = {
      '$set': {
        'status': 'canceled',
        'participant.0.status': 'declined',
        'cancellationReason': {
          'coding': [
            {
              'system': 'http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason',
              'code': 'pat-cpp',
              'display': 'Patient: Canceled via Patient Portal'
            }
          ],
          'text': 'Patient: Canceled via Patient Portal'
        }
      }
    };
    const accept = {
      '$set': {
        'status': 'booked',
        'participant.0.status': 'accepted'
      }
    };

    if (Math.random() > 3 / 4) {
      return { 'updateOne': { 'filter': query, 'update': cancel } };
    } else {
      return { 'updateOne': { 'filter': query, 'update': accept } };
    }
  });

  console.log('Bulk Updates:', JSON.stringify(bulkUpdates));

  const tic = moment();
  const result = await appointments.bulkWrite(bulkUpdates);
  return (result);
};
