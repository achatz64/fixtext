import * as Diff from "https://cdn.skypack.dev/diff@5.0.0";

// Anonymous firebase authentication 

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    var uid = user.uid;
    console.log(uid);
  } 
});

firebase.auth().signInAnonymously()
  .then(() => {
    console.log('Anonymous id requested'); 
  })
  .catch((error) => {
    console.error('Error requesting anonymous id from Firebase Auth', error);
  });

// Language
let lang;

const lang2code = {"0": "en", "1": "de"};
const langPair = {"en": "sv", "de": "sv"};

function findLanguage() {
  return lang2code[document.getElementById("languageSelection").value];
}

// Placeholders logic

const lang2placeholderInput = {"en": "Your text...", "de": "Dein Text..."};

function changePlaceholders(){
  let lang = findLanguage();
  document.getElementById("input-text-field").placeholder = lang2placeholderInput[lang];
  //document.getElementById("output-text-field").placeholder = lang2placeholderOutput[lang];
}

window.changePlaceholders = changePlaceholders;

function removePlaceholder(){
  document.getElementById('input-text-field').placeholder = '';  
}

window.removePlaceholder = removePlaceholder;

// Clear buttons

function addClear(){
  document.getElementById("button-reset").style.display = 'inline-block';
}

window.addClear = addClear;

function removeClear(){
  document.getElementById("button-reset").style.display = 'none';
}

window.removeClear = removeClear;

function clearInput(){
  document.getElementById("input-text-field").value='';
  /*changePlaceholders(); */
  removeClear();
}

window.clearInput = clearInput;

// Output (from translation) display

function addOutput(outtext, text) {
  displayDiff(outtext, text);
  document.getElementById("display-green").hidden = false;
  document.getElementById("copyButton").style.display = 'inline-block';
}

// Translation helper

async function translate(text, sourceLang, targetLang){
      var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl="
              + sourceLang + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(text);
  var result = fetch(url);
  return result;
}

//Error handling

function errorDisplay(error){
  document.getElementById("error").innerHTML = "Ooops, something went wrong... If you share your network connection then a different computer using the same IP address may be responsible.";
}

async function errorHandling(response){
  if (response.ok){
    let value = await response.json();
    if (value[0]){
      let join="";
      for (const sentence of value[0]){
        join = join + sentence[0];
      }
      return join;
    }
    else return "";  
  }
  else throw new Error('Something went wrong');
}

// Main translation action

async function myFunction() {
  let fixedText;
  let inputElement = document.getElementById("input-text-field");
  let text = document.getElementById("input-text-field").value;
  
  if (text!=""){
    let sourceLang = findLanguage();
    let targetLang = langPair[sourceLang];
    
    let response = translate(text, sourceLang, targetLang);
    try {
      let outSV = await response.then(response => errorHandling(response));
      let textSV = translate(outSV, targetLang, sourceLang);
      let fixedText = await textSV.then(response => errorHandling(response)); 
      addOutput(fixedText, text);
      saveFix({sourceLang, targetLang, text, outSV, fixedText});
    }
    catch (error) {console.log(error); errorDisplay(error);}
  }  
}

window.myFunction = myFunction;

// Diff logic
const displayDiff = function(outtext, text) {
  let one = text;
  let other = outtext;
  const diff = Diff.diffWords(one, other),
        displayGreen = document.getElementById('display-green'),
        fragmentGreen = document.createDocumentFragment();

  displayGreen.innerHTML='';

diff.forEach((part) => {
  // green for additions, red for deletions
  if (!part.removed){
  let span = document.createElement('span');
    if (part.added){
  span.style.backgroundColor = "#82FF47";
    } span.appendChild(document.createTextNode(part.value));
  fragmentGreen.appendChild(span);}
}); 
  displayGreen.appendChild(fragmentGreen);
}

// Copy to clipboard

function copy() {
  window.getSelection()
    .selectAllChildren(
      document.getElementById("display-green"));
  document.execCommand("copy");
}

window.copy = copy;

// adding firebase store support to save requests/responses

var db = firebase.firestore();

function saveFix({sourceLang, targetLang, text, outSV, fixedText}){
   // Add a new message entry to the Firebase database.
   let collection = 'users/fixes/'+firebase.auth().currentUser.uid;
   return db.collection(collection).add({
    sourceLang: sourceLang,
    targetLang: targetLang,
    inputText: text,
    translation: outSV,
    backTranslation: fixedText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function(error) {
    console.error('Error writing request to Firebase Database', error);
  });
}

//window.db = db;