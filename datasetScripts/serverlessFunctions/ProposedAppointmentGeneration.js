const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

exports = async function(request) {


  const amtDaysNotice = 105; //84

  const minAge = 50;
  const maxAge = 70;
  
  const db = context.services.get("mongodb-atlas").db("demo_hc_virtual_hospital")
  const appointmentsCol = db.collection('appointments');
  const practitionersCol = db.collection('practitioners');
  const locationsCol = db.collection('locations');
  const patientsCol = db.collection('patients');

  const endDate = moment().startOf('day').subtract(minAge, 'years').startOf('day');
  const startDate = moment().startOf('day').subtract(maxAge, 'years').startOf('day');
  
  const PostCodesCursor = locationsCol.aggregate([ { $project: { _id: 0, postalCode: "$address.postalCode" } } ]);
  
  const PostCodes = await PostCodesCursor.toArray();
  const postalCodes = PostCodes.map(x => x.postalCode);
  
  try {
    
    for (const pc of postalCodes) {
      const slots = [];
      const bulkUpdates = [];
  
      //////////////////////////////          start get_slots logic          //////////////////////////////
      const today = moment();
      let start = today.add(amtDaysNotice, 'days');
      while (start.weekday() > 5) {
        start.add(1, 'days');
      }
      start.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  
      const slotsPerHour = Math.floor(60 / 30);
      for (let i = 0; i < 4 * slotsPerHour; i++) {
        slots.push(start.toDate());
        start.add(30, 'minutes');
      }
      for (let i = 5 * slotsPerHour; i < 9 * slotsPerHour; i++) {
        slots.push(start.toDate());
        start.add(30, 'minutes');
      }
      start.add(1, 'days');

      //////////////////////////////          end get_slots logic          //////////////////////////////
      
      const practitionerCursor = practitionersCol.aggregate([
          {$match: {'address.house.postalCode': pc,},},
          {$lookup: {
              from: 'appointments',
              localField: '_id',
              foreignField: 'participant.actor.reference',
              as: 'appointment',
              pipeline: [{$match: {status: 'proposed',},},],
            },},
          {$project: {name: 1,max_start: { $max: '$appointment.start' },},},
        ]);
      
      const practitioners = await practitionerCursor.toArray();
      
      const locationCursor = locationsCol.aggregate([
        {$match: {'address.postalCode': pc,},},
        {$project: {name: 1,},},]);

      const location = await locationCursor.next();
      
      console.log(JSON.stringify(location))
      
      const waitlistCursor = patientsCol.aggregate([
        {$match: {
            gender: 'female',
            'address.house.postalCode': pc,
            birthDate: {$gte: startDate.toDate(),$lte: endDate.toDate(),},
          },},
        {$project: {
            _id: 1,
            name: 1,
            PostalCode: '$address.house.postalCode',
            birthDate: 1,
          },
        },
        {$lookup: {
            from: 'appointments',
            localField: '_id',
            foreignField: 'participant.actor.reference',
            as: 'appointment',
            pipeline: [
              {$match: {
                  $expr: {
                    $or: [
                      {$eq: ['$status', 'proposed'],},
                      {$and: [{$eq: ['$status', 'booked'],},
                              {$gt: ['$start', new Date(new Date() - 2 * 365 * 24 * 60 * 60 * 1000)],},
                            ],},
                    ],},
                },},],
          },},
        {$match: {appointment: [],},},
        {$project: {_id: 1,name: 1,birthDate:1},},
        {$sort: {birthDate: -1,},},
        {$limit: slots.length * practitioners.length,},
      ]);

      const waitlist = await waitlistCursor.toArray();
      
      console.log(JSON.stringify(waitlist))
      
       let n = 0;

      for (const x of waitlist) {
        if (slots.length === 0) {
          const day = moment().add(amtDaysNotice, 'days').format('YYYY-MM-DD');
          console.log(`No longer any slots available on ${day} on ${pc}`);
          break;
        }
        //console.log(JSON.stringify(x))
        if (practitioners[n % practitioners.length].max_start === null || practitioners[n % practitioners.length].max_start < slots[0]) {
          //////////////////////////////          start generateAppointment logic          //////////////////////////////
          const appointment = {
              resourceType: 'Appointment',
              status: 'proposed',
              created: moment().startOf('day').toDate(),
              start: slots[0],
              description: 'Breast Mammography Screening',
              serviceType: [
                {coding: [
                    { system: 'http://snomed.info/sct',
                      code: '278110001',
                      display: 'radiographic imaging', },
                  ],
                  text: 'Mammography',
                }, ],
              participant: [
                { actor: {
                    reference: x._id,
                    display: x.name,
                    birthDate:x.birthDate
                  },
                  required: true,
                  status: 'needs-action',
                },
                { actor: {
                    reference: practitioners[n % practitioners.length]._id,
                    display: practitioners[n % practitioners.length].name,
                  },
                  required: true,
                  status: 'accepted',
                },
              ],
              location: {
                reference: location._id,
                display: location.name,
              },
            };
          //////////////////////////////          end generateAppointment logic          //////////////////////////////
          //console.log(JSON.stringify(appointment))
          bulkUpdates.push(appointment);
            
            }
            if (n % practitioners.length === practitioners.length - 1) {
              slots.shift();
            }
            n++;
        }
        console.log(bulkUpdates.length)
        
      if (bulkUpdates.length > 0) {
        const tic = moment().toDate();
        await appointmentsCol.bulkWrite(bulkUpdates.map((update) => ({insertOne: {document: update,},})));
        console.log(`${bulkUpdates.length} Appointments updated in ${moment.duration(moment().diff(tic)).asMilliseconds()}ms`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
};