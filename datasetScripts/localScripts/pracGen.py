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

## GLOBAL INPUTS

from config import myclient,db,practitioners, locations

## INPUTS
bulk_size = 70
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

_PRACTITIONER = Schema(schema=lambda: 
{ "resourceType": "Practitioner",
  "id": field("uuid"),
  "name": [{"use": "official","family":person.last_name(),"given":fieldset('name', i=1)}],
  "identifier": [
    {
      "system": "http://example.com/identifiers",
      "value": "12345"
    }
  ],
  "qualification": [
    {
      "code": {
        "coding": [
          { "system": "http://snomed.info/sct",
            "code": "2471M2300N",
            "display": "Technologists, Technicians & Other; Radiologic Technologist; Mammography: Radiography" } ],
        "text": "Radiologic Technologist - Mammography" },
      "period": {"start": date_generator(minimum_age=0,maximum_age=30) }
    }
  ],
  "active": True,
  "address" : [{'house': {
            "line" : [address.address()],
            "postalCode" : postCode_generator(),
            "country" : country } }]
}
, iterations=bulk_size)

if verbose:
  print(_PRACTITIONER.create())
  print("\n\n\n\n")

######################## INSERTING THE DOCUMENT ########################

if insert:
	
	# Note that you don't pass in self despite the signature above
	tic = datetime.today();	
	x=practitioners.insert_many(_PRACTITIONER, ordered=False)
	print("Practitioners inserted "+" in "+str(datetime.today()-tic) )
	
	print("\n\n\n\n")


myclient.close();

