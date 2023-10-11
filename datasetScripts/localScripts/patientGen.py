from gevent import monkey
_ = monkey.patch_all()
import pymongo
import time
from datetime import datetime, timedelta
import random
from mimesis import Person
from mimesis.locales import Locale
from mimesis.enums import Gender
from mimesis import Address
from mimesis import Generic
from mimesis.schema import Field, Fieldset, Schema

## INPUTS
from config import myclient,db,patients, locations

bulk_size = 20000
date_format="%d-%m-%Y"
insert = True
verbose = False
loc=Locale.ES
loc_str='en'
country="USA"

print("\n")

######################## CREATING THE PATIENT ########################

fieldset = Fieldset(locale=loc)
field = Field(loc_str)
person =Person(loc_str)
address=Address(loc_str)

PostCodes = locations.aggregate([{'$project':{'_id':0,"postalCode":"$address.postalCode"}}])

PC=[x["postalCode"] for x in PostCodes]

def date_generator(minimum_age=0,maximum_age=100):
    dt=datetime.today() - timedelta(days=random.randint(365*minimum_age, 365 * maximum_age)) - timedelta(seconds=random.randint(0,12*3600))
    return(datetime(dt.year, dt.month, dt.day))

def postCode_generator():
  out=PC.pop(0)
  PC.append(out)
  return out

_PATIENT = Schema(schema=lambda: 
{"resourceType" : "Patient",
"name": [{"given":fieldset('name', i=random.randint(1,2), gender=Gender.FEMALE),"family":person.last_name(gender=Gender.FEMALE)}],
"gender" : "female",
"birthDate" : date_generator(minimum_age=50,maximum_age=70),
"telecom" : [{'phone':person.phone_number()},{ 'email':person.email()}],
"address" : [{'house': {
            "line" : [address.address()],
            "postalCode" : postCode_generator(),
            "country" : country } }],
 }, iterations=bulk_size)

if verbose:
	print(_PATIENT.create())
	print("\n\n\n\n")

######################## INSERTING THE PATIENT ########################

if insert:
	tic = datetime.today();
	x=patients.insert_many(_PATIENT, ordered=False)
	print("\nPatient inserted "+" in "+str(datetime.today()-tic) )
	

myclient.close();
