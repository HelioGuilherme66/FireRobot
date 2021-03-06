	var EXPORTED_SYMBOLS = [
	"runTest",
	"showReport",
	"openTest",
	"saveAs",
	"save"
	];

	Components.utils.import("resource://gre/modules/FileUtils.jsm");
	Components.utils.import("resource://gre/modules/devtools/Console.jsm");
	Components.utils.import("resource://gre/modules/Timer.jsm");

	//Components.utils.import("chrome://firerobot/content/external-modules/subprocess.jsm");
	Components.utils.import("chrome://firerobot/content/fr-modules/variables.jsm");
	Components.utils.import("chrome://firerobot/content/fr-modules/utils.jsm");


	function runTest() {

		var testRunning = Application.storage.get("testRunning", undefined);
		if (testRunning) return;

		var frWindow = Application.storage.get("frWindow", undefined);
		var testDir = FileUtils.getDir("ProfD", ["extensions",
			"{91d9d8dc-09f8-4890-b6d8-32cbbf0a2f0e}",
			"run"
			],
			true);

		//Remove old screen shots, we don't want to keep old logs if the test is interrupted in the middle
		//This may fail if we are using the Open Browser ... ff_profile_dir option, ence the try/catch
		try {
			testDir.remove(true);
		} catch (err) {
			//We do nothing because content will be re-written anyway, unless test is interrupted in the middle
		}
		//Create new test execution folder
		testDir = FileUtils.getDir("ProfD", ["extensions",
			"{91d9d8dc-09f8-4890-b6d8-32cbbf0a2f0e}",
			"run"
			],
			true);

		var testDirPath = testDir.path;
		var shell;
		var args;
		var testFile;
		var pybotErrMsg;
		var pybotTestArgs;

		var OSName = getOSName();
		if (OSName == "Windows") {
			testFile = new FileUtils.File(testDirPath + "\\FireRobot.txt");

			_saveTest(testFile);
			var env = Components.classes["@mozilla.org/process/environment;1"]
			.getService(Components.interfaces.nsIEnvironment);
			shell = new FileUtils.File(env.get("COMSPEC"));

			args = ["/C",
			"pybot",
			"-d",
			testDirPath,
			testFile.path
			];

			pybotTestArgs = ["/C", "pybot", "-h"];
			pybotErrMsg = "\'pybot\' is not recognized as an internal or external command";

		} else if (OSName == "MacOS") {
			testFile = new FileUtils.File(testDirPath + "/FireRobot.txt");

			_saveTest(testFile);
			shell = new FileUtils.File("/bin/sh");
			var testScript = new FileUtils.File(testDirPath + "/osx-script.txt");
			var outStream = FileUtils.openFileOutputStream(testScript);
			var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
			createInstance(Components.interfaces.nsIConverterOutputStream);
			converter.init(outStream, "UTF-8", 0, 0);

			var script = "osascript -e 'tell app \"Terminal\" to do script \"pybot -d" +
			testDirPath.replace(/ /g, "\\\\ ") +
			" " +
			testFile.path.replace(/ /g, "\\\\ ") +
			"\"'";

			converter.writeString(script);
			converter.close();
			args = [testScript.path];

			pybotTestArgs = ["pybot", "-h"];

			pybotErrMsg = "pybot: No such file or directory";

		} else {
			testFile = new FileUtils.File(testDirPath + "/FireRobot.txt");

			_saveTest(testFile);
			shell = new FileUtils.File("/bin/sh");
			args = ["-c",
			"x-terminal-emulator -e pybot -d " +
			testDirPath.replace(/ /g, "\\ ") +
			" " +
			testFile.path.replace(/ /g, "\\ ")
			];

			pybotTestArgs = ["-c", "pybot -h"];
			pybotErrMsg = "pybot: not found";
		}

		const COMMONJS_URI = 'resource://gre/modules/commonjs';
		const { require } = Components.utils.import(COMMONJS_URI + '/toolkit/require.js', {});
		var child_process = require('sdk/system/child_process');

		var p = child_process.spawn(shell.path, pybotTestArgs);

		p.stderr.on('data', function (data) {
			console.log("ERROR DATA: ", data + "\n");
			var pos = data.indexOf(pybotErrMsg);
			if (pos != -1) {
				windowWatcher.openWindow(null,
					"chrome://firerobot/content/noRFWarning.xul",
					"fire-robot-preferences", "chrome, dialog, centerscreen",
					null);
				Application.storage.set("rfIsInstalled", false);
			}
		});

		//This is a very inelegant solution, but since I'm not allowed by Mozilla to use p.wait it seems to be the simplest.
		//This is just to avoid trying to run a test without the Robot Framework installed.
		//The warning popup would be shown anyway, but eventually on the bakground, due to the error messages regarding an unrecognized command.
		setTimeout(function() {

			if (!Application.storage.get("rfIsInstalled", true)) return;

			var playButton = frWindow.document.getElementById("fire-robot-playButton");
			playButton.setAttribute("class", "playOn");
			Application.storage.set("testRunning", true);

			/***********************************************************************************
			Note to Mozilla reviewers:
			The next line of code will produce the following message in the automatic validation process:
			"The use of nsIProcess is potentially dangerous and requires careful review by an administrative reviewer."
			The purpose of this extension is to build test scripts by selecting web page elements,
			and selecting specific keywords from the context menu.
			These tests can then be run by making a call to the Robot Framework (that should be allready installed in your system), by means of the "pybot" command. That is the sole usage scope for nsIProcess.
			The Robot Framework has been extensivly used for thousands of software testers around the worlld,
			so I belive this is a legitimate usage of the Mozilla nsIProcess interface.
			For more info visit robotframework.org
			************************************************************************************/
			var process = Components.classes["@mozilla.org/process/util;1"]
			.createInstance(Components.interfaces.nsIProcess);

			process.init(shell);

			Application.storage.set("testRunning", true);

			playButton.setAttribute("class", "playOn");

			process.runAsync(args, args.length, function(subject, topic, data) {
				Application.storage.set("testRunning", false);

				//The window might have been closed or switched mode.
				frWindow = Application.storage.get("frWindow", undefined);
				if (frWindow) {
					playButton = frWindow.document.getElementById("fire-robot-playButton");
					playButton.setAttribute("class", "btn");
				}
				//nsIProcess doesn't seem to work as expected in Linux and OS X.
				//It returns immediatelly and tries to open a report that does not yet exist.
				//This induces the "No Report Found" popup
				//TODO report at bugzilla?
				if (OSName == "Windows") {
					showReport();
				}
			});
		}, 100);

}

function showReport() {
	Components.utils.import("resource://gre/modules/FileUtils.jsm");

	var reportFile = FileUtils.getFile("ProfD", ["extensions",
		"{91d9d8dc-09f8-4890-b6d8-32cbbf0a2f0e}",
		"run",
		"report.html"
		]);

	if (reportFile.exists()) {
		var OSName = getOSName();
		var reportFilePath = reportFile.path;
		var reportURL;

		if (OSName == "Windows") {
			reportURL = "file:\\\\\\" + reportFilePath;
		} else {
			reportURL = "file:///" + reportFilePath;
		}

		var url = Components.classes["@mozilla.org/supports-string;1"].
		createInstance(Components.interfaces.nsISupportsString);
		url.data = reportURL;

		windowWatcher.openWindow(null, "chrome://browser/content/browser.xul", "_blank",
			"chrome,centerscreen,location=yes,dialog=no,width=920,height=680,resizable=yes,scrollbars=yes", url);

	} else {
		warning("firerobot.warn.no-report");
	}
}

function save() {
	var testFile = Application.storage.get("testFile", undefined);
	if (testFile) {
		_saveTest(testFile);
	} else {
		saveAs();
	}
}

function saveAs() {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.defaultExtension = "txt";
	fp.init(windowWatcher.activeWindow, "Save your robot test suite", nsIFilePicker.modeSave);
	fp.appendFilter("RF Text Files (*.txt, *.robot)", "*.txt; *.robot");

	var res = fp.show();
	if (res != nsIFilePicker.returnCancel) {
		Application.storage.set("testFile", fp.file);
		var test = "";
		var frWindow = Application.storage.get("frWindow", undefined);

		//Add settings table
		var newSettings = frWindow.document.getElementById("fire-robot-settingsTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");
		test += "*** Settings ***\r\n\r\n" + newSettings;

				//Add variables table
				var rows = frWindow.document.getElementById("fire-robot-varListBox").childNodes;
				var newVariables = "";
				for (var i = 0; i < rows.length; i++) {
					newVariables += "${" + rows[i].childNodes[1].value + "}" +
					" \t" +
					rows[i].childNodes[3].value +
					"\r\n";
				}
				newVariables = newVariables.trim();
				test += "\r\n\r\n\r\n*** Variables ***\r\n\r\n" + newVariables;

		//Add test cases table
		var newTestCases = frWindow.document.getElementById("fire-robot-testCaseTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");
		test += "\r\n\r\n\r\n*** Test Cases ***\r\n\r\n" + newTestCases;

		//Add keywords table
		var newKeywords = frWindow.document.getElementById("fire-robot-keywordsTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");

		if (newKeywords !== "") {
			test += "\r\n\r\n\r\n*** Keywords ***\r\n\r\n" + newKeywords;
		}

		//Open the file for writting
		var outStream = FileUtils.openFileOutputStream(fp.file);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
		createInstance(Components.interfaces.nsIConverterOutputStream);
		converter.init(outStream, "UTF-8", 0, 0);
		converter.writeString(test);
		converter.close();
	}
}


function openTest() {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(windowWatcher.activeWindow, "Load your robot test suite", nsIFilePicker.modOpen);
	fp.appendFilter("RF Text Files (*.txt, *.robot)", "*.txt; *.robot");

	var res = fp.show();
	if (res != nsIFilePicker.returnCancel) {
		var testFile = fp.file;
		Application.storage.set("testFile", testFile);
		Components.utils.import("resource://gre/modules/NetUtil.jsm");
		NetUtil.asyncFetch(testFile, function(inputStream, status) {
			if (!Components.isSuccessCode(status)) {
				return;
			}
			var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
			var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
			getService(Components.interfaces.nsIUTF8ConverterService);

			data = utf8Converter.convertURISpecToUTF8(data, "UTF-8");

			var headPattern = /^\s?\*+\s*.+/mi;
			var settPattern = /^\s?\*+\s*(?:settings?|metadata|setting table)(?:$|\s*\*+|\s{2,})/mi;
			var varPattern = /^\s?\*+\s*(?:variables?|variable table)(?:$|\s*\*+|\s{2,})/mi;
			var testPattern = /^\s?\*+\s*(?:test\scases?|test\scase table)(?:$|\s*\*+|\s{2,})/mi;
			var keyPattern = /^\s?\*+\s*(?:keywords?|user keywords?|keyword table)(?:$|\s*\*+|\s{2,})/mi;

			var frWindow = Application.storage.get("frWindow", undefined);

			if (data.match(varPattern)) {
				var variables = data.split(varPattern)[1].split(headPattern)[0].trim();
				if(!onlyScalarVariables(variables)) {
					warning("firerobot.warn.unsupported-variables");
					return;
				}
				loadVariables(variables);
			} else {
				warning("firerobot.warn.no-variables");
				varListBox = frWindow.document.getElementById("fire-robot-varListBox");
				while (varListBox.firstChild) {
					varListBox.removeChild(varListBox.firstChild);
				}
			}
			if (data.match(settPattern)) {
				var settings = data.split(settPattern)[1].split(headPattern)[0].trim();
				frWindow.document.getElementById("fire-robot-settingsTextArea").value = settings;
			} else {
				warning("firerobot.warn.no-settings");
				frWindow.document.getElementById("fire-robot-settingsTextArea").value = "";
			}
			if (data.match(testPattern)) {
				var tests = data.split(testPattern)[1].split(headPattern)[0].trim();
				frWindow.document.getElementById("fire-robot-testCaseTextArea").value = tests;
			} else {
				warning("firerobot.warn.no-tests");
				frWindow.document.getElementById("fire-robot-testCaseTextArea").value = "";
			}
			if (data.match(keyPattern)) {
				var keywords = data.split(keyPattern)[1].split(headPattern)[0].trim();
				frWindow.document.getElementById("fire-robot-keywordsTextArea").value = keywords;
			} else {
				frWindow.document.getElementById("fire-robot-keywordsTextArea").value = "";
			}
		});
	}
}

function _saveTest(file) {

	var frWindow = Application.storage.get("frWindow", undefined);
	var oldContent;
	var newContent;

	var headPattern = /^\s?\*+\s*.+/mi;
	var settPattern = /^\s?\*+\s*(?:settings?|metadata|setting table)(?:$|\s*\*+|\s{2,})/mi;
	var varPattern = /^\s?\*+\s*(?:variables?|variable table)(?:$|\s*\*+|\s{2,})/mi;
	var testPattern = /^\s?\*+\s*(?:test\scases?|test\scase table)(?:$|\s*\*+|\s{2,})/mi;
	var keyPattern = /^\s?\*+\s*(?:keywords?|user keywords?|keyword table)(?:$|\s*\*+|\s{2,})/mi;

		//Start by opening the file and reading current content
	Components.utils.import("resource://gre/modules/NetUtil.jsm");
	NetUtil.asyncFetch(file, function(inputStream, status) {
		if (!Components.isSuccessCode(status)) {
			oldContent = "";
		} else {
			try {
				oldContent = NetUtil.readInputStreamToString(inputStream, inputStream.available());
				var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
				getService(Components.interfaces.nsIUTF8ConverterService);
				oldContent = utf8Converter.convertURISpecToUTF8(oldContent, "UTF-8");
			}
			//Overwrite existing file
			//TODO this kinda works, but is it the correct way?
			catch (err) {
				oldContent = "";
			}
		}

		newContent = oldContent;

		//Add or replace settings table
		var newSettings = frWindow.document.getElementById("fire-robot-settingsTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");

		if (oldContent && oldContent.match(settPattern)) {
			var oldSettings = oldContent.split(settPattern)[1].split(headPattern)[0].trim();
			newContent = newContent.replace(oldSettings, newSettings);
		} else {
			newContent += "*** Settings ***\r\n\r\n" + newSettings;
		}

		//Add or replace variables table
		var rows = frWindow.document.getElementById("fire-robot-varListBox").childNodes;
		var newVariables = "";
		for (var i = 0; i < rows.length; i++) {
			newVariables += "${" + rows[i].childNodes[1].value + "}" +
			" \t" +
			rows[i].childNodes[3].value +
			"\r\n";
		}
		newVariables = newVariables.trim();

		if (oldContent && oldContent.match(varPattern)) {
			var oldVariables = oldContent.split(varPattern)[1].split(headPattern)[0].trim();
			newContent = newContent.replace(oldVariables, newVariables);
		} else {
			newContent += "\r\n\r\n\r\n*** Variables ***\r\n\r\n" + newVariables;
		}

		//Add or repalce test cases table
		var newTestCases = frWindow.document.getElementById("fire-robot-testCaseTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");

		if (oldContent && oldContent.match(testPattern)) {
			var oldTestCases = oldContent.split(testPattern)[1].split(headPattern)[0].trim();
			newContent = newContent.replace(oldTestCases, newTestCases);
		} else {
			newContent += "\r\n\r\n\r\n*** Test Cases ***\r\n\r\n" + newTestCases;
		}

		//Add or replace keywords table
		var newKeywords = frWindow.document.getElementById("fire-robot-keywordsTextArea").
		value.
		replace(/(\r\n|\n|\r)/gm, "\r\n");
		if (oldContent && oldContent.match(keyPattern)) {
			var oldKeywords = oldContent.split(keyPattern)[1].split(headPattern)[0].trim();
			newContent = newContent.replace(oldKeywords, newKeywords);
		} else {
			if (newKeywords !== "") {
				newContent += "\r\n\r\n\r\n*** Keywords ***\r\n\r\n" + newKeywords;
			}
		}
		//Open the file for writting
		var outStream = FileUtils.openFileOutputStream(file);
		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
		createInstance(Components.interfaces.nsIConverterOutputStream);
		converter.init(outStream, "UTF-8", 0, 0);
		converter.writeString(newContent);
		converter.close();
	});
}