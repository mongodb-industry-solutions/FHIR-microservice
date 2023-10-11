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

from config import myclient,db,locations

## INPUTS
bulk_size = 22
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


_LOCATIONS = Schema(schema=lambda: 
{ "resourceType": "Location",
  "identifier": [
    {
      "system": "http://example.com/identifiers",
      "value": field("uuid")
    }
  ],
  "status": "active",
  "name": "St. "+person.name()+random.choice([' hospital',' clinic', ' medical center']),
  "description": "Mammography Department",
  "mode": "instance",
  "type": [
    { "coding": [
        { "system": "http://terminology.hl7.org/CodeSystem/service-delivery-location",
          "code": "RD",
          "display": "Radiology Department"
        }
      ]
    }
  ],
  "address": {
    "line" : [address.address()],
    "postalCode" : address.postal_code(),
    "country" : country   },
  "position": {
    "latitude": address.latitude(),
    "longitude":address.longitude()
  }
}, iterations=bulk_size)

if verbose:
	print(_LOCATIONS.create())
	print("\n\n\n\n")

######################## INSERTING THE DOCUMENT ########################

if insert:
	
	# Note that you don't pass in self despite the signature above
	tic = datetime.today();	
	x=locations.insert_many(_LOCATIONS, ordered=False)
	print("Locations inserted "+" in "+str(datetime.today()-tic) )
	
	print("\n\n\n\n")

myclient.close();
