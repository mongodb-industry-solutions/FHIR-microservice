#  2: Create an App Services Application

After you’ve created a cluster and loaded the sample dataset, you can create an application in App Services. 
[Follow these steps to create a new App Services Application]([https://www.mongodb.com/docs/atlas/app-services/apps/create/]), if you haven’t done so already.

I used the name “FHIR-search” and chose the cluster “FHIR” that I’ve already loaded the sample dataset into.

![image](/Media/AppServices.png)

After you’ve created the App Services application, navigate to the HTTPS Endpoints on the left side menu and click the Data API tab, as shown below.

![image](/Media/HTTPSEndpoint.png)

Then please:
- Hit the button “add an endpoint”.
- Name the route we recommend “/Appointment”
- Enable the endpoint
- Choose the “GET” HTTP method
- Enable “respond with result”
- Select “+ New function” and name it we chose the name "Appointment".
- Copy paste the “Appointment” function from the github above.
- Make sure to change the fake URL in said function with the one that just got created from your HTTPS endpoint.
- Enable both “Fetch Custom User Data” and “Create User Upon Authentication”
- Lastly  save the draft and deploy it

Now, your API endpoint is ready and accessible.  But if you test it, you will get the following authentication error, since no authentication provider has been enabled.

```curl
curl --location --request GET https://fakeurl.com/app/{application-id}/endpoint/Appointment' \
 --header 'Content-Type: application/json'
```

```json
{"error":"no authentication methods were specified","error_code":"InvalidParameter","link":"https://realm.mongodb.com/groups/64e34f487860ee7a5c8fc990/apps/64e35fe30e434ffceaca4c89/logs?co_id=64e369ca7b46f09497deb46d"}
```

Side note: to view the result without any security, you can go into your function, then go to the settings tab and set the authentication to system. 

## 2.1 Set up more backend to maintain the dataset (optional) 

Because the 
