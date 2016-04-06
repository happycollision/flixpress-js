// to depend on a bower installed component:
// define(['components/componentName/file'])

define([
  "./core",
  "./contexts/editor-window",
  "./editor-menu",
  "components/jxon/index",
  /*d-> "components/js-beautify/js/index", <-d*/
  "./editor"
  ],
function( Flixpress, frameContext, menu, jxon /*d-> , jsb <-d*/ ) {

  var context = function(){
    try{
      return frameContext();
    } catch (e) {
      return window;
    }
  }

  var prettyXml = function (str) {
    if (Flixpress.mode === 'development') {
      return jsb.html(str);
    } else {
      return str;
    }
  }

  jxon.config({
    parseValues: true
  });

  // Monkey patch to fix for a change in JXON at 2.0.0
  // (the v2.0.0 branch adds an errant 'xmlns' property as 'undefined')
  // jxon.jsToString2 = jxon.jsToString;
  // jxon.jsToString = function (jsObj) {
  //   return jxon.jsToString2(jsObj).replace('xmlns="undefined" ','');
  // }

  var exampleWorkingOrderTemplate83 = {
    OrderRequestOfTextOnlyRndTemplate: {
      "$xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
      "$xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      ResolutionOptions: {
        ListItemViewModel: [
          {
            Name: "720p",
            Id: 5
          },{
            Name: "1080p",
            Id: 3
          },{
            Name: "4K",
            Id: 4
          }
        ]
      },
      ResolutionId: "5",
      RenderedData: {
        Specs: {
          $name: "Specs",
          $val: "",
          SpCx: {
            CSp: {
              $name: "Properties",
              $val: "CD|Properties|",
              SpCx: {
                Sp: [
                  {
                    $name: "Top Line",
                    $val: "Is Working?"
                  },{
                    $name: "Bottom Line",
                    $val: ""
                  }
                ]
              }
            }
          }
        },
        AudioInfo: {
          Name: "",
          Length: "0",
          AudioType: "NoAudio",
          Id: "0",
          AudioUrl: "",
        }
      },
      IsPreview: false
    }
  };

  var startingPoint = {
    OrderRequestOfTextOnlyRndTemplate: {
      "$xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "$xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
      ResolutionId: 0,
      RenderedData: {
        Specs: {
          $name: "Specs",
          $val: "",
          SpCx: {
            CSp: []
          }
        },
        AudioInfo: {
          Name: null,
          Length: "0",
          AudioType: "NoAudio",
          Id: "0",
          AudioUrl: null,
        }
      },
      IsPreview: false
    }
  };

  var xmlContainerDiv = function () {return context().$('#RndTemplate_HF')[0];};

  var getLoadedXmlAsString = function () {
    return prettyXml(xmlContainerDiv().value);
  };

  var getLoadedXmlAsObject = function () {
    return jxon.stringToJs(getLoadedXmlAsString(xmlContainerDiv().value));
  };

  var getEditorTemplateSettings = function () {
    return context().editorTemplateSettings;
  };

  var getTemplateId = function () {
    return getEditorTemplateSettings().templateId;
  };
  
  var getTopLevelXmlName = function () {
    return 'OrderRequestOfTextOnlyRndTemplate';
  };
  
  function changePropsInitialCase (obj, whichCase) {
    var makeAspVersion = (whichCase === 'UpperFirst') ? true : false ;
    var newObject = obj;
    if (makeAspVersion) {
      var regex = /[a-z]/;
    } else {
      var regex = /[A-z]/;
    }
    for (var key in newObject) {
      if (newObject.hasOwnProperty(key) === false) continue;
      if (typeof key !== 'string') continue;
      if (key.charAt(0).match(regex) === null) continue;

      var prop = newObject[key];
      var newName = '';
      if (makeAspVersion){
        newName = key.charAt(0).toUpperCase() + key.slice(1);
      } else {
        newName = key.charAt(0).toLowerCase() + key.slice(1);
      }
      delete newObject[key];
      newObject[newName] = prop;
    }
    return newObject;
  }

  function clone(obj) {
    var target = {};
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        target[i] = obj[i];
      }
    }
    return target;
  }


  var convertSpecsToReactData = function (xmlObj) {
    var result = {};
    if (xmlObj.RenderedData === undefined) {
      return result;
    } else {
      xmlObj = xmlObj.RenderedData;
    }
    
    // Audio Info
    if (xmlObj.AudioInfo !== undefined) {
      result.audioInfo = changePropsInitialCase(xmlObj.AudioInfo, 'lowerFirst');
    }

    var what = Object.prototype.toString;
    if (xmlObj.Specs !== undefined) {
      result.nameValuePairs = [];
      if (what.call(xmlObj.Specs.SpCx.CSp) !== '[object Array]'){
        // Make it into an array for consistency
        xmlObj.Specs.SpCx.CSp = [clone(xmlObj.Specs.SpCx.CSp)]
      }
      for (var i = 0; i < xmlObj.Specs.SpCx.CSp.length; i++) {
        var currentFieldsArray = xmlObj.Specs.SpCx.CSp[i].SpCx.Sp;
        var name = '';
        var value = '';
        for ( var j = 0; currentFieldsArray.length > j; j++ ) {
          name = currentFieldsArray[j].$name;
          value = currentFieldsArray[j].$val;
          result.nameValuePairs.push({name: name, value: value});
        }
      }
    }
    
    return result;
  };

  var getReactStartingData = function () {
    var obj = getLoadedXmlAsObject();
    var topLvlName = getTopLevelXmlName();
    var result = convertSpecsToReactData(obj[topLvlName]);

    var givenResolutions = obj[topLvlName].ResolutionOptions.ListItemViewModel;
    // Eventual refactor for arrays of Objects?
    var resolutions = []
    for (var i=0; i < givenResolutions.length; i++) {
      resolutions.push(changePropsInitialCase(givenResolutions[i],'lowerFirst'));
    }
    result.resolutions = resolutions;
    result.resolutionId = resolutions[0].id;

    // The easy one:
    result.isPreview = obj[topLvlName].IsPreview;

    return result;
  };

  var promiseTemplateUIConfigObject = function(){
    var prom = $.getJSON('/templates/Template' + getTemplateId() + '.js');
    prom.done(function(data){
      console.log(data);
    })
    return prom;
  };

  function xmlToObject (xmlString) {
    return jxon.stringToJs(xmlString);
  }

  function objectToXml (object) {
    return '<?xml version="1.0" encoding="utf-16"?>\n' + prettyXml(jxon.jsToString(object));
  }
  
  var updateXmlForOrder = function (reactObj) {
    var promise = $.Deferred();
    var orderObject = startingPoint;
    var topLvlName = getTopLevelXmlName();
    var finalOrderXml = '';

    // Pick a resolution
    if (reactObj.resolutionId === undefined || reactObj.ResolutionId === 0) {
      promise.reject('No ResolutionId was present');
    }
    orderObject[topLvlName].ResolutionId = reactObj.resolutionId;

    // Distribute Specs
    if (reactObj.ui === undefined) {
      promise.reject('No Specs were sent');
    }
    for (var i = 0; i < reactObj.ui.length; i++) {
      
      for (var key in reactObj.ui[i]) {
        if (reactObj.ui[i].hasOwnProperty(key)){
          var SpArray = [];
          
          for (var j = 0; j < reactObj.ui[i][key].length; j++) {
             SpArray.push({
              $name: reactObj.ui[i][key][j].name,
              $val: reactObj.ui[i][key][j].value
            });
          }
          
          orderObject[topLvlName].RenderedData.Specs.SpCx.CSp.push({
            $name: key,
            $val: 'CD|' + key + '|',
            SpCx: {
              Sp: SpArray
            }
          });

        }
      }
      
    }

    //Preview?
    orderObject[topLvlName].IsPreview = reactObj.isPreview;

    finalOrderXml = objectToXml(orderObject);
    xmlContainerDiv().value = finalOrderXml;
    promise.resolve();

    return promise;
  };

  Flixpress.td = {
    getLoadedXmlAsString: getLoadedXmlAsString,
    getLoadedXmlAsObject: getLoadedXmlAsObject,
    xmlToObject: xmlToObject,
    objectToXml: objectToXml,
    promiseTemplateUIConfigObject: promiseTemplateUIConfigObject,
    xmlContainerDiv: xmlContainerDiv,
    getReactStartingData: getReactStartingData,
    updateXmlForOrder: updateXmlForOrder
  };

});
