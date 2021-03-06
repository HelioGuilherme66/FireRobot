var EXPORTED_SYMBOLS = [
	"getLocator",
	"getLocatorType",
	"getLocatorForGenericElement"
];

Components.utils.import("chrome://firerobot/content/fr-modules/utils.jsm");
Components.utils.import("chrome://firerobot/content/fr-modules/variables.jsm");


function getLocator(element) {
	var locatorPreferences = _getLocPrefs();
	var i;
	var validLocators;

	if (element.tagName == "A") {
		validLocators = _linkLocators;
	} else if (element.tagName == "BUTTON" ||
		(element.tagName == "INPUT" &&
			(element.type == "button" ||
				element.type == "submit"))) {
		validLocators = _btnLocators;
	} else if (element.tagName == "INPUT" &&
		(element.type == "text" ||
			element.type == "email" ||
			element.type == "tel" ||
			element.type == "url" ||
			element.type == "search" ||
			element.type == "color" ||
			element.type == "number" ||
			element.type == "range" ||
			element.type == "date" ||
			element.type == "password")) {
		validLocators = _textFieldLocators;
	} else if (element.tagName == "TEXTAREA") {
		validLocators = _textFieldLocators;
	} else if (element.tagName == "INPUT" && element.type == "radio") {
		validLocators = _radioBtnLocators;
	} else if (element.tagName == "INPUT" && element.type == "checkbox") {
		validLocators = _checkBoxLocators;
	} else if (element.tagName == "IMG") {
		validLocators = _imageLocators;
	} else if (element.tagName == "SELECT") {
		validLocators = _listLocators;
	} else if (element.tagName == "OPTION") {
		validLocators = _optionLocators;
	} else if (element.tagName == "FRAME" || element.tagName == "IFRAME") {
		validLocators = _frameLocators;
	} else {
		validLocators = _elementLocators;
	}

	var selLocType;
	var loc;
	for (i = 0; i < locatorPreferences.length; i++) {
		if (validLocators.indexOf(locatorPreferences[i]) != -1) {
			selLocType = locatorPreferences[i];
			if (selLocType == "id" && element.id) {
				loc = element.id;
			} else if (selLocType == "name" && element.name) {
				loc = element.name;
			} else if (selLocType == "href" && element.href) {
				loc = element.getAttribute("href");
			} else if (selLocType == "src" && element.src) {
				loc = element.getAttribute("src");
			} else if (selLocType == "value" &&
				element.getAttribute("value") &&
				element.getAttribute("value") !== "") {
				loc = element.getAttribute("value");
			} else if (selLocType == "index") {
				loc = element.index;
			} else if (selLocType == "alt" && element.alt) {
				loc = element.alt;
			} else if (selLocType == "label" &&
				element.label &&
				element.label !== "") {
				loc = element.label;
			} else if (selLocType == "link" && getNodeValue(element) !== "") {
				loc = getNodeValue(element);
			} else if (selLocType == "xpath") {
				loc = "xpath=" + (element.xpath || getTextBasedXPath(element));
			} else if (selLocType == "class_xpath" && element.getAttribute("class")) {
				loc = "xpath=" + getClassBasedXPath(element);
			}
		}
		if (loc) break;
	}
	if (!loc) {
		loc = "xpath=" + (element.xpath || getTextBasedXPath(element));
	}

	loc = escapeRobot(loc);

	if (prefService.getBoolPref("extensions.firerobot.variables.create-for-loc")) {
		var varName = getVarNameFromValue(loc);
		if (!varName) {
			var args = ["locator-", element];
			varName = createVarNameFromText.apply(null, args);
			if (!varName) {
				varName = createVarNameForInput.apply(null, args);
			}
			addVariable(varName, loc);
		}
	}
	if (prefService.getBoolPref("extensions.firerobot.variables.use-for-loc")) {
		var varName = getVarNameFromValue(loc);
		if (varName) {
			loc = "${" + varName + "}";
		}
	}
	return loc;
}

function getLocatorType(element) {
	var locatorPreferences = _getLocPrefs();
	var i;
	var validLocators;

	if (element.tagName == "A") {
		validLocators = _linkLocators;
	} else if (element.tagName == "BUTTON" ||
		(element.tagName == "INPUT" &&
			(element.type == "button" ||
				element.type == "submit"))) {
		validLocators = _btnLocators;
	} else if (element.tagName == "INPUT" &&
		(element.type == "text" ||
			element.type == "email" ||
			element.type == "tel" ||
			element.type == "url" ||
			element.type == "search" ||
			element.type == "color" ||
			element.type == "number" ||
			element.type == "range" ||
			element.type == "date" ||
			element.type == "password")) {
		validLocators = _textFieldLocators;
	} else if (element.tagName == "TEXTAREA") {
		validLocators = _textFieldLocators;
	} else if (element.tagName == "INPUT" && element.type == "radio") {
		validLocators = _radioBtnLocators;
	} else if (element.tagName == "INPUT" && element.type == "checkbox") {
		validLocators = _checkBoxLocators;
	} else if (element.tagName == "IMG") {
		validLocators = _imageLocators;
	} else if (element.tagName == "SELECT") {
		validLocators = _listLocators;
	} else if (element.tagName == "OPTION") {
		validLocators = _optionLocators;
	} else if (element.tagName == "FRAME" || element.tagName == "IFRAME") {
		validLocators = _frameLocators;
	} else {
		validLocators = _elementLocators;
	}

	var selLocType;
	for (i = 0; i < locatorPreferences.length; i++) {
		if (validLocators.indexOf(locatorPreferences[i]) != -1) {
			selLocType = locatorPreferences[i];
			if (selLocType == "id" && element.id) {
				return "id";
			} else if (selLocType == "name" && element.name) {
				return "name";
			} else if (selLocType == "href" && element.href) {
				return "href";
			} else if (selLocType == "src" && element.src) {
				return "src";
			} else if (selLocType == "value" && element.getAttribute("value")) {
				return "value";
			} else if (selLocType == "index") {
				return "index";
			} else if (selLocType == "label" && element.label) {
				return "label";
			} else if (selLocType == "link" && getNodeValue(element) !== "") {
				return "link";
			} else if (selLocType == "xpath") {
				return "xpath";
			} else if (selLocType == "class_xpath" && element.getAttribute("class")) {
				return "class_xpath";
			} 
		}
	}
	return "xpath";
}

//More specific. Only supports the _elementLocators list.
function getLocatorForGenericElement(element) {
	var locatorPreferences = _getLocPrefs();
	var i;
	var validLocators = _elementLocators;
	var selLocType;
	var loc;

	for (i = 0; i < locatorPreferences.length; i++) {
		if (validLocators.indexOf(locatorPreferences[i]) != -1) {
			selLocType = locatorPreferences[i];
			if (selLocType == "id" && element.id) {
				loc = element.id;
			} else if (selLocType == "name" && element.name) {
				loc = element.name;
			}  else if (selLocType == "xpath") {
				loc = "xpath=" + (element.xpath || getTextBasedXPath(element));
			} else if (selLocType == "class_xpath" && element.getAttribute("class")) {
				loc = "xpath=" + getClassBasedXPath(element);			
			}
		}
		if (loc) break;
	}
	if (!loc) {
		loc = "xpath=" + (element.xpath || getTextBasedXPath(element));
	}

	loc = escapeRobot(loc);

	if (prefService.getBoolPref("extensions.firerobot.variables.create-for-loc")) {
		var varName = getVarNameFromValue(loc);
		if (!varName) {
			var args = ["locator-", element];
			varName = createVarNameFromText.apply(null, args);
			if (!varName) {
				varName = createVarNameForInput.apply(null, args);
			}
			addVariable(varName, loc);
		}
	}
	if (prefService.getBoolPref("extensions.firerobot.variables.use-for-loc")) {
		var varName = getVarNameFromValue(loc);
		if (varName) {
			loc = "${" + varName + "}";
		}
	}
	return loc;
}


var _linkLocators = [
	"id",
	"name",
	"href",
	"link",
	"xpath",
	"class_xpath"
];

var _btnLocators = [
	"id",
	"name",
	"value",
	"xpath",
	"class_xpath"
];

var _radioBtnLocators = [
	"id",
	"name",
	"value",
	"xpath",
	"class_xpath"
];

var _checkBoxLocators = [
	"id",
	"name",
	"value",
	"xpath",
	"class_xpath"
];

var _listLocators = [
	"id",
	"name",
	"xpath",
	"class_xpath"
];

var _optionLocators = [
	"value",
	"label",
	"index"
];

var _textFieldLocators = [
	"id",
	"name",
	"xpath",
	"class_xpath"
];

var _imageLocators = [
	"id",
	"src",
	"alt",
	"xpath",
	"class_xpath"
];

var _frameLocators = [
	"id",
	"name",
	"xpath",
	"class_xpath"
];

var _elementLocators = [
	"id",
	"name",
	"xpath",
	"class_xpath"
];

function _getLocPrefs() {
	var enabledLocPreferences = prefService.getCharPref(
		"extensions.firerobot.enabled-locators");
	return enabledLocPreferences.split(",");
}