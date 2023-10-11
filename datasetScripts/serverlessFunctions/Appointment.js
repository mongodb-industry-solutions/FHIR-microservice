exports = async function(request, response) {
  const queryParams = request.query;
  const collection = context.services.get("mongodb-atlas").db("FHIR").collection("appointments");
  
  const query = {};
  const sort = {};
  const project = {};
  const codeParams = {};
  const aggreg = [];
  const pageSize = 20;
  const limit={};
  let tot = true;
  let dynamicPageSize = null;
  const URL = 'https://fakeurl.com/endpoint/Appointment'//put your http endpoint URL here

  const FieldMap = {
    'actor': 'participant.actor.reference',
    'date': 'start', 
    'identifier':'_id',
    'location': 'location.reference', 
    'part-status': 'participant.0.actor.status',
    'patient':'participant.0.actor.reference',
    'practitioner': 'participant.1.actor.reference', 
    'status': 'status', 
  };
  
  for (const key in queryParams) {
  switch (key) {
    case "actor":
      query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      break;
    case "date":
      const dateParams = queryParams[key].split(",");
        const dateFilters = dateParams.map((dateParam) => {
          const firstTwoChars = dateParam.substr(0, 2);
          const dateValue = dateParam.slice(2);
          if (firstTwoChars === "ge" || firstTwoChars === "le") {
            const operator = firstTwoChars === "ge" ? "$gte" : "$lte";
            return { ["start"]: { [operator] : new Date(dateValue) } };
          }
          return null;
        });
      query["$and"] = dateFilters.filter((filter) => filter !== null);
      break;
    case "identifier":
      query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      break;
    case "location":
      try {
        query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      } catch (error) {
        const locValues = queryParams[key].split(","); 
        query[FieldMap[key]] = { $in: locValues }; 
      }
      break;
    case "location:contains"  :
      try {
        query[FieldMap[key]] = {"$regex": new BSON.ObjectId(queryParams[key]), "$options": "i"};
      } catch (error) {
        query[FieldMap[key]] = {"$regex": queryParams[key], "$options": "i"};
      }
      break;
    case "part-status":
      query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      break;
    case "patient":
      query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      break;
    case "practitioner":
      query[FieldMap[key]] = new BSON.ObjectId(queryParams[key]);
      break;
    case "status":
      const statusValues = queryParams[key].split(","); 
      query[FieldMap[key]] = { $in: statusValues }; 
      break;
    case "_count":
      dynamicPageSize = parseInt(queryParams[key]);
      break;
    case "_elements":
      const Params = queryParams[key].split(",");
      for (const param of Params) {
        if (FieldMap[param]) {
          project[FieldMap[param]] = 1;
        }
      }
      break;
    case "_sort":
      // sort logic
      const sortDirection = queryParams[key].startsWith("-") ? -1 : 1;
      const sortField = queryParams[key].replace(/^-/, ''); 
      sort[FieldMap[sortField]] = sortDirection;
      break;
    case "_maxresults":
      // sort logic
      limit["_maxresults"]=parseInt(queryParams[key])
      break;
    case "_total":
      tot = false;
      break;
    default:
      // Default case for other keys
      codeParams[key] = queryParams[key];
      break;
  }
}
  
  let findResult;
  const page = parseInt(codeParams.page) || 1;
  if (tot) {
    aggreg.push({'$match':query});
    if(Object.keys(sort).length > 0){
      aggreg.push({'$sort':sort});
    } else {
      aggreg.push({'$sort':{"start":1}});
    }
    if(Object.keys(project).length > 0){
      aggreg.push({'$project':project});
    }
    if(Object.keys(limit).length > 0){
      aggreg.push({'$limit':limit["_maxresults"]});
    }else{
      aggreg.push({'$limit':(dynamicPageSize||pageSize)*page});
    }
    try {
      //findResult = await collection.find(query).sort(sort).limit((dynamicPageSize||pageSize)*pageSize).toArray();
      findResult = await collection.aggregate(aggreg).toArray();
    } catch (err) {
      console.log("Error occurred while executing find:", err.message);
      response.setStatusCode(500);
      response.setHeader("Content-Type", "application/json");
      return { error: err.message };
    }
  } else {
    findResult = [];
  }
  let total
  if(Object.keys(limit).length > 0){
    total=limit["_maxresults"];
  }else{
     total = await collection.count(query);
  }
  const totalPages = Math.ceil(total / (dynamicPageSize || pageSize));
  const startIdx = (page - 1) * (dynamicPageSize || pageSize);
  const endIdx = startIdx + (dynamicPageSize || pageSize);
  const resultsInBundle = findResult.slice(startIdx, endIdx);

  const bundle = {
     resourceType: "Bundle",
     type: "searchset",
     total:total,
     link:[],
     entry: resultsInBundle.map((resource) => ({
       fullUrl: `${URL}?id=${resource._id}`, 
       resource,
       search: {
        mode: 'match'
        },
    })),
  };

  if (page <= totalPages) {
    if (page > 1 && page!==totalPages) {
      bundle.link = [
        { relation: "previous", url: `${URL}${getQueryString(queryParams,sort,page-1,dynamicPageSize || pageSize)}` },
        { relation: "self", url: `${URL}${getQueryString(queryParams,sort,page,dynamicPageSize || pageSize)}` },
        { relation: "next", url: `${URL}${getQueryString(queryParams,sort,page+1,dynamicPageSize || pageSize)}` },
      ];
    } else if(page==totalPages && totalPages!==1) {
      bundle.link = [
        { relation: "previous", url: `${URL}${getQueryString(queryParams,sort,page-1,dynamicPageSize || pageSize)}` },
        { relation: "self", url: `${URL}${getQueryString(queryParams,sort,page,dynamicPageSize || pageSize)}` }
      ];
    } else if(totalPages==1 || dynamicPageSize==0) {
      bundle.link = [
        { relation: "self", url: `${URL}${getQueryString(queryParams,null,0,0)}` },
      ];
    } else {
      bundle.link = [
        { relation: "self", url: `${URL}${getQueryString(queryParams,sort,page,dynamicPageSize || pageSize)}` },
        { relation: "next", url: `${URL}${getQueryString(queryParams,sort,page+1,dynamicPageSize || pageSize)}` },
      ];
    }
  }

  response.setStatusCode(200);
  response.setHeader("Content-Type", "application/json");
  response.setBody(JSON.stringify(bundle, null, 2));
};

// Helper function to generate query string from query parameters
function getQueryString(params,sort, p, pageSize) {
  
  let paramString = "";
  let queryString = "";

  if (params && Object.keys(params).length > 0) {
    paramString = Object.keys(params)
      .filter((key) => key !== "page" && key !== "_count")
      .map((key) => `${(key)}=${params[key]}`)
      .join("&");
  }
  
  if (paramString!==""){
    if (p > 1) {
      queryString = `?`+ paramString.replace(/ /g, "%20") + `&page=${(p)}&_count=${pageSize}`;
    } else {
      queryString += `?`+ paramString.replace(/ /g, "%20") +`&_count=${pageSize}`
    }
  } else if (p > 1) {
      queryString = `?page=${(p)}&_count=${pageSize}`;
  }
    
  return queryString;
}