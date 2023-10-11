import pymongo

Connexion_string="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/"# Please insert you connexion string here
myclient = pymongo.MongoClient(Connexion_string)
db=myclient["FHIR"] # Please make sure that this is indeed the name of your database
patients = db['patients']
appointments = db['appointments']
practitioners = db ['practitioners']
locations = db['locations']