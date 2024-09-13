var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

const recognition = new SpeechRecognition();
recording = false;
recorded_text = [];

const DEBUG = true;
const PREFIX_PROMPT_QUERY = "Your task is to convert an SQL query, which the user recorded through a speech-to-text input, into correct syntax. Supported SQL commands are SELECT, INSERT, UPDATE, DELETE. Note that during the recording, some words and special characters might not have been understood correctly (e.g. staff instead of star, queen or screen instead of green), or special characters might have been omitted. That is okay and and small understanding errors should be compensated for by you. Please output only a JSON containing query:the_query. Nothing else. If the user input does not make sense as a SQL query (e.g., 'delete green ones') or is completely unrelated to SQL, **do not** attempt to generate a valid SQL query. Instead, return a JSON with query: null. The schema of the table is: @@@SCHEMA@@@. Now follows the user input:";
const PREFIX_PROMPT_CORRECT = "We are in an exciting space invaders game controlled by the user via SQL commands. Here is the database schema @@@SCHEMA@@@. This was the task: @@@TASK@@@. You are an overly enthusiastic, dramatic game character, sending radio messages from a control center, always ready to cheer or tease the user. After evaluating the user query, return a JSON with: correct:true if the user solved the task correctly, otherwise correct:false. And add a very short and extremely enthusiastic or dramatic phrase (no emojis) in the JSON field comment:your_comment to give feedback to the user about their solution. Be playful, exaggerated, and add humor, as if you're reacting to a high-stakes moment in the game. Nothing else. The comment should be very short. Now follows the user query: ";

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let log_start;
function log(msg, data="", level="log", reset_time=false) {
  if (!DEBUG && level=="debug") return;
  if (log_start === undefined || reset_time) {
    log_start = Date.now();
  }
  let time = (Date.now() - log_start) / 1000;
  $('#log').append('<tr style="color:'+(level=="error"?"red": level=="debug"?"gray": "black")+'"><td>' + time + "</td><td>"+msg+"</td><td>" + (level=="code"?"<code>":"") + data + (level=="code"?"</code>":"") + '</td><td></td></tr>');
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

$('#record').on('click', function() {
  if (recording) {
    recording = false;
    log("... stopped.", "", "log", true);
    recognition.stop();
    $('#record').text('Record');
    return;
  }
  $('#log').empty();
  recording = true;
  recognition.start();
  log("Listening...", "", "log", true);
  $('#record').text('Stop');
});

recognition.onresult = function(event) {
  transcript = event.results[event.results.length-1][0].transcript;
  log("Result "+(event.results.length-1)+": ", transcript, "debug");
  recorded_text.push(transcript);
};

recognition.onend = function() {
  transcript = recorded_text.join(" ");
  log("Transcript: ", transcript);
  recorded_text = [];
  use_ai(transcript, PREFIX_PROMPT_QUERY.replace("@@@SCHEMA@@@", $("#schema").text()));
};

recognition.onerror = function(event) {
  log("Error: ", event.error, "error");
}

function use_ai(inputText, prefix="") {
  log("AI Request: ", prefix+" \n"+inputText, "debug");
  $.ajax({
    url: './api.php',
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
      if(json.query !== undefined) {
        if(json.query == null) {
          log("Query: ", "null", "error");
          return;
        }
        log("Query: ", json.query, "code");
        use_ai(json.query, PREFIX_PROMPT_CORRECT.replace("@@@SCHEMA@@@", $("#schema").text()).replace("@@@TASK@@@", $("#task").text()));
      }
      if(json.correct !== undefined) {
        log("Correct: ", json.correct, "code");
      }
      if(json.comment !== undefined) {
        log("Comment: ", json.comment, "code");
        speak(json.comment);
      }      
    },
    error: function(xhr, status, error) {
        log("AI Error: ", error, "error");
    }
});
}