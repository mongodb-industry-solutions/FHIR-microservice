import pymongo
import time
from datetime import datetime, timedelta
import random
from multiprocessing import Pool

from config import myclient, db, patients, appointments, locations, practitioners

def get_week_slots(appointment_lenght=30,start=datetime.today(), max_start=None, ):
    start = start + timedelta((7 - start.weekday()) % 7) # next monday
    t=start.weekday()
    out = []
    while t<6:
        slots_per_h=int(60/appointment_lenght)
        out +=[start+i*timedelta(minutes=appointment_lenght) for i in range(4*slots_per_h)] 
        out +=[start+i*timedelta(minutes=appointment_lenght) for i in range(5*slots_per_h,9*slots_per_h)]
        start+=timedelta(days=1)
        t=start.weekday()
    if max_start:
        out = [slot for slot in out if slot > max_start]
    return out

def generate_appointment(x, loc, pract, slot):
    appointment = {
        "resourceType": "Appointment",
        "status": "proposed",
        "created": datetime.today(),
        "start":slot,
        "description": "Breast Mammography Screening",
        "serviceType": [{
            "coding": [{
                "system": "http://snomed.info/sct",
                "code": "278110001",
                "display": "radiographic imaging"
            }],
            "text": "Mammography"
        }],
        "participant": [
            {   "actor": {
                    "reference": x["_id"],
                    "display": x["name"] },
                "required": True,
                "status": "needs-action" },
            {   "actor": {
                    "reference": pract["_id"],
                    "display": pract["name"] },
                "required": True,
                "status": "accepted" },
        ],
        "location": {
            "reference": loc["_id"],
            "display": loc["name"] },
    }
    return appointment


if __name__ == '__main__':
    
    ## INPUTS
    update=True
    verbose=False
    start=datetime.today()
    minAge,maxAge = 50,70


    toc = datetime.today()
    startDate=datetime.today()
    endDate=datetime(startDate.year-minAge, startDate.month, startDate.day,0,0,0)
    startDate = datetime(startDate.year-maxAge, startDate.month, startDate.day,0,0,0)

    PostCodes = locations.aggregate([{'$project':{'_id':0,"postalCode":"$address.postalCode"}}])
    PC=[x["postalCode"] for x in PostCodes]

    for pc in PC:
        slot=get_week_slots(start=start)
        
        pract = practitioners.aggregate([ 
              {'$match':{'address.house.postalCode':pc }}
            , {'$lookup':{  'from': 'appointments', 
                            'localField': '_id', 
                            'foreignField': 'participant.actor.reference', 
                            'as': 'appointment',
                            'pipeline':[{ '$match': {'status':'proposed'} }] } }
            , {'$project': {'name': 1,'max_start': {'$max': '$appointment.start'}}}
            ])

        pract = [ i for i in pract]
        p=len(pract)

        loc = locations.aggregate([{'$match':{'address.postalCode':pc}},{'$project':{'name':1}}]).next()

        waitlist = patients.aggregate([ { '$match': { 'gender': "female", 'address.house.postalCode':pc, 'birthDate': {'$gte': startDate,'$lte': endDate } },}
            , {'$project': {'_id':1,'name':1,'PostalCode':'$address.house.postalCode','age': {'$dateDiff': {
                                                                    'startDate': '$birthDate', 
                                                                    'endDate': datetime.utcnow(),  
                                                                    'unit': 'year'} }}}
            , {'$lookup': {
                    'from': 'appointments', 
                    'localField': '_id', 
                    'foreignField': 'participant.actor.reference', 
                    'as': 'appointment',
                    'pipeline': [{ '$match': { '$expr': { '$or': [
                                    { '$eq': ['$status', 'proposed'] },
                                    { '$and': [ { '$eq': ['$status', 'booked'] },
                                                { '$gt': ['$start', datetime.utcnow()-timedelta(days=365 *2)] }
                                            ] }
                                                                ]} } }
                                ]} }
            , {'$match': { 'appointment': [] } }
            , {'$project':{'_id':1,'name':1,'age':1} }
            , {'$sort': {'age':-1} }
            , {'$limit': len(slot)*p }
        ])

        n,bulk_updates = 0,[]

        for x in waitlist:
            if len(slot)==0:
                Day = datetime.today()+timedelta(days=amt_days_notice)
                print('No longer any slots available on '+Day.strftime("%Y-%m-%d")+ " on "+pc)
                break
            if pract[n % p]["max_start"] is None or pract[n % p]["max_start"] < slot[0]:
                bulk_updates.append(generate_appointment(x,loc,pract[n%p],slot[0]))
            if n%p==p-1:
                slot.pop(0)
            n+=1


        if verbose:
            print(bulk_updates)
            print(len(bulk_updates))
        
        if update and len(bulk_updates)>0:
            tic=datetime.today()
            appointments.bulk_write([ pymongo.InsertOne(update) for update in bulk_updates ])
            print(f"{len(bulk_updates)} Appointments updated in {datetime.today() - tic}")

print("Total time "+str(datetime.today()-toc) )
myclient.close();




