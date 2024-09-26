var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

var API_URL = "http://localhost/t63/crud-invaders/api.php";

function default_log(msg, data="", level="log", reset_time=false) {
  if (!DEBUG && level=="debug") return;
  if (level == "debug") { level = "log"; }
  console[level](msg, data);
}

function speech_recognition(lang="en-US", log=default_log) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.log = log;
  recognition.recording = false;
  recognition.recorded_text = [];

  recognition.onresult = function(event) {
    transcript = event.results[event.results.length-1][0].transcript;
    log("Result "+(event.results.length-1)+": ", transcript, "debug");
    recognition.recorded_text.push(transcript);
  };
  
  recognition.onerror = function(event) {
    log("Error: ", event.error, "error");
  }

  return recognition;
}

function speak(msg) {
  /*window.speechSynthesis.cancel();
  let speech = new SpeechSynthesisUtterance(msg);
  let voices = window.speechSynthesis.getVoices();
  speech.lang = 'en-US';
  speech.rate = 8;
  speech.voice = voices[3];
  window.speechSynthesis.speak(speech);*/
  responsiveVoice.speak(msg, "Australian Male", { 
    rate:1.05,
    onend: function() { log("Speaking done."); }
   } );
}

function use_ai(inputText, prefix="", callback, log=default_log) {
  log("AI Request: ", prefix+" \n"+inputText, "debug");
  $.ajax({
    url: API_URL,
    type: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    data: JSON.stringify({ q: prefix+" \n"+inputText }),
    success: function(response) {
      let content = JSON.parse(response).choices[0].message.content;
      log("AI Response: ", content, "debug");
      if (!content.includes("{")) {
        log("AI Error: ", "No JSON found", "error");
        return;
      }
      json = content.substring(content.indexOf("{"), content.lastIndexOf("}")+1);
      log("JSON: ", json, "debug");
      try {
        json = JSON.parse(json);
      } catch (e) {
        log("JSON Error: ", e, "error");
        return;
      }
      callback(json);     
    },
    error: function(xhr, status, error) {
        log("AI Error: ", error, "error");
    }
});
}