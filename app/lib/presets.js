// to depend on a bower installed component:
// define(['components/componentName/file'])

define([
  "./core",
  "./contexts/editor-window",
  "./editor-menu",
  "components/jxon/index",
  "./switch-modes",
  /*d-> "components/js-beautify/js/index", <-d*/
  "./editor"
  ],
function( Flixpress, context, menu, jxon, switchModes/*d-> , jsb <-d*/ ) {

  jxon.config({
    lowerCaseTags: false
  });

  var replaceDivId = 'Template_FlashContent_Div';
  var xmlContainerDiv = function () {return context().$('#RndTemplate_HF')[0];};

  function prepareDOM () {
    context().$('object').parent().prepend($('<div id="' + replaceDivId + '"></div>'));
    context().$('object').remove();
  }

  // This could probably get moved to another module and
  // required for this one.
  function safeQueryStringToJSON(string) {            
    pairs = string.slice().split('&');
    
    var result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = pair[1] || '';
    });

    return JSON.parse(JSON.stringify(result));
  }


  var getCurrentConditions = function (returnType) {
    var currentConditions = jxon.stringToJs( xmlContainerDiv().value );
    var pipedImagesExists = context().$('#CroppedImageFilenames')[0].value !== '';
    
    // in "Add" mode, RenderedData won't be there yet, so we have to add it.
    if (currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData === undefined) {
      currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData = {};
      currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls = {};
      currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String = [];
    }

    // pipedImgages will exist whenever user images have first been uploaded to the template before saving a preview
    if (pipedImagesExists) {
      // Combine everything into on json object
      
      // Image file names are pipe delineated
      var pipedImagesArray = context().$('#CroppedImageFilenames').attr('value').split('|');

      // Finally add in the piped images.
      for (var i = pipedImagesArray.length - 1; i >= 0; i--) {
        if (pipedImagesArray[i] !== ''){
          currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String.unshift(pipedImagesArray[i])
        }
      };

    }

    if (returnType === 'xml') {
      var curXML = jxon.jsToString( currentConditions );
      if (Flixpress.mode === 'development') {
        curXML = jsb.html(curXML);
      }
      return curXML;
    } else {
      return currentConditions;
    }
  };

  // Returns an array of values (of any individual type)
  // for the arguments used in SetupRndTemplateFlash
  var getVarValues = function () {
    if (Flixpress.editor.flashvars !== undefined) {
      return Flixpress.editor.flashvars;
    } else if (context().editorFlashvars !== undefined) {
      return context().editorFlashvars;
    } else {
      return false;
    }
  }
  
  // Returns an array of strings representing the variable names
  // for the arguments used in SetupRndTemplateFlash
  var getVarNames = function () {
    var funcString = context().SetupRndTemplateFlash.toString();
    var argNames = funcString.match(/SetupRndTemplateFlash *\((.*?)\)/)[1];
    argNames = argNames.split(',').map( function(str){ return str.trim(); } );
    return argNames;
  }
  
  // Returns an array of values (of any individual type)
  // for the arguments used in SetupRndTemplateFlash
  var getVarsObject = function () {
    var result = {};
    var names = getVarNames();
    var values = getVarValues();
    // build the object
    for (var i = names.length - 1; i >= 0; i--) {
      result[names[i]] = values[i];
    }
  }
  
  var getSanitizedVars = function () {
    var arr = getVarValues();
    var hasEdit = false;
    
    arr = arr.map( function(thing) {
      if (thing === "Add" || thing === "Edit") {
        hasEdit = true;
        return "Edit";
      }
      return thing;
    });
    
    if (hasEdit) {
      return arr;
    }
    
    return false;
  }
  
  var getMode = function () {
    var values = getVarValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (values[i] === "Add" || values[i] === "Edit") {
        return values[i];
      }
    }
    return false;
  }

  var getTemplateId = function () {
    var names = getVarNames();
    for (var i = names.length - 1; i >= 0; i--) {
      if ( names[i].match(/template(_|-)*id/i) !== null ) {
        return getVarValues()[i];
      }
    }
    return false;
  }

  /*
   * preset: (object) JXON.stringToJs version of an XML preset
   */
  var addCurrentPhotosToPreset = function (preset) {
    var currentConditions = getCurrentConditions();
    var currentPhotosArray = currentConditions.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String;
    
    if (preset.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls === undefined){
      preset.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls = {};
    }
    if (preset.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String === undefined){
      preset.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String = []
    }

    var newPhotosArray = preset.OrderRequestOfESlidesRndTemplate.RenderedData.UnusedImageUrls.String;
    

    for (var i = currentPhotosArray.length - 1; i >= 0; i--) {
      if (newPhotosArray.indexOf(currentPhotosArray[i]) === -1){
        // Then the new array doesn't contain the old value. Add it.
        newPhotosArray.unshift(currentPhotosArray[i]);
      }
    };
    
    return preset;
  }

  var loadPreset = function (xmlObject) {
    var el = xmlContainerDiv();
    var flashvars = getSanitizedVars();
    if (!el) {return false;}
    el.value = jxon.jsToString(xmlObject);
    prepareDOM();

    context().SetupRndTemplateFlash.apply(context(), flashvars);
  };

  // Reloads the presets that were on the page when it
  // first loaded
  var reloadCurrent = function () {
    if (getMode() === "Add") {
      // We cannot reload the previous state if it was in Add mode to begin.
      // Well, we can... but it's pointless.
      return false;
    } else {
      loadPreset(getCurrentConditions());
      return true;      
    }
  };
  
  var prettyDisplayXML = function () {
    var $div = $('#FlixpressJs-XML-PresetInformation');
    if ($div.length < 1 ) {
      $div = $('<div id="FlixpressJs-XML-PresetInformation"><a class="exit">close</a><div><textarea></textarea></div></div>');
    }
    
    $('body').css('overflow', 'hidden');
    var closeDiv = function(){
      $div.hide();
      $('body').css('overflow', 'auto');
    }
    
    $div
      .css({
        position: 'absolute',
        background: '#eee',
        color: '#222',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100000
        })
      .prependTo($('#colorbox'))
      .show();

    $div.find('textarea')
      .css({
        width: '100%',
        height: '100%',
        fontFamily: 'Consolas,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New, monospace'
        })
      .text(getCurrentConditions('xml'));

    $div.find('.exit')
      .css('cursor','pointer')
      .on('click', closeDiv);

    $(document).bind('cbox_closed', function(){$div.hide()});
  };
  
  var displayXMLButton = function () {
    var $div = $('#FlixpressJS-DisplayXMLButton');
    if ($div.length < 1){
      $div = $('<div id="FlixpressJS-DisplayXMLButton">Get XML</div>');
    }
    $div
      .css({
        position: 'fixed',
        left: 24,
        bottom: 24,
        background: '#fff',
        padding: '12px',
        zIndex: '100000',
        cursor: 'pointer'
        })
      .on('click', prettyDisplayXML)
      .appendTo('body');
    
    $(document).bind('cbox_closed', function(){$div.remove()});

  }

  // Used by Flixpress.editor-menu
  Flixpress.editor.getPresetFile = function(url){
    //get file
    var data;
    var presetXML = $.ajax(url,{dataType: 'text'});
    presetXML.done(function(data){
      data = jxon.stringToJs(data);
      data = addCurrentPhotosToPreset(data);
      loadPreset(data);
    });
  };


  Flixpress.editor.presets = function (folderUrlOverride) {
    var folderUrl = folderUrlOverride ? folderUrlOverride : '/templates/presets/';
    //wait for object:
    var $promise = new $.Deferred();
    var count = 0;
    function tryObject () {
      if( context().$('object param[name="flashvars"]').length > 0 ) {
        $promise.resolve();
        return true;
      }
      if (++count < 100) { setTimeout(tryObject, 200); }
    }
    tryObject();

    $promise.done(function(){
      menu.registerNewMenu('presets', true, Flixpress.smartUrlPrefix(folderUrl) + 'template' + getTemplateId() + '.js');
      if (Flixpress.mode === 'development') {
        displayXMLButton();
      }
    });
  };

  Flixpress.editor.getPresetXML = function () { 
    return getCurrentConditions('xml');
  }
  
  switchModes.registerBeforeBothTask( function(){
    window.flixpressEditorPresetNeeds = getVarValues();
  });
  switchModes.registerAfterBothTask( function(){
    if (window.flixpressEditorPresetNeeds !== undefined) {
      Flixpress.editor.flashvars = window.flixpressEditorPresetNeeds;
    }
  });

});
