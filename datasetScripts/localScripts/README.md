## 1: Insert FHIR documents into the database

Find the config.py file and modify it with the connection string of your cluster. Please note that the collections that are being imported here have also the same names as the ones in your cluster.

Execute in order the files: 
- locGen.py,
- pracGen.py,
- patientGen.py,
- and ProposedAppointmentGeneration.py

Notes. The last script will take a more time than the previous ones as it creates the appointments with the relevant information from the other collections.

Before continuing you should check that you have a new “FHIR” database with 4 collections inside it:
Locations with 22 locations,
Practitioners with 70 documents,
Patients with 20k documents,
And Appointments with close to 7k documents.

![image](/Media/FHIRdatabase.png)

If the number of documents doesn't suit you please feel free to increase the bulk_size variable in the files. This would only be limited by the tier of the cluster that you chose.
