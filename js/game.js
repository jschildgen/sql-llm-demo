const DEBUG = true;
const PREFIX_PROMPT_QUERY = "Your task is to convert an SQL query, which the user recorded through a speech-to-text input, into correct syntax. Supported SQL commands are SELECT, INSERT, UPDATE, DELETE. Note that during the recording, some words and special characters might not have been understood correctly (e.g. staff instead of star, queen or screen instead of green), or special characters might have been omitted. That is okay and and small understanding errors should be compensated for by you. Please output only a JSON containing query:the_query. Nothing else. If the user input does not make sense as a SQL query (e.g., 'delete green ones') or is completely unrelated to SQL, **do not** attempt to generate a valid SQL query. Instead, return a JSON with query: null. The schema of the table is: @@@SCHEMA@@@. Now follows the user input:";
const PREFIX_PROMPT_CORRECT = "We are in an exciting space invaders game controlled by the user via SQL commands. Here is the database schema @@@SCHEMA@@@. This was the task: @@@TASK@@@. You are an overly enthusiastic, dramatic game character, sending radio messages from a control center, always ready to cheer or tease the user. After evaluating the user query, return a JSON with: correct:true if the user solved the task correctly, otherwise correct:false. And add a very short and extremely enthusiastic or dramatic phrase (no emojis) in the JSON field comment:your_comment to give feedback to the user about their solution. Be playful, exaggerated, and add humor, as if you're reacting to a high-stakes moment in the game. Nothing else. The comment should be very short. Now follows the user query: ";

let log_start;
function log(msg, data="", level="log", reset_time=false) {
  if (!DEBUG && level=="debug") return;
  if (log_start === undefined || reset_time) {
    log_start = Date.now();
  }
  let time = (Date.now() - log_start) / 1000;
  $('#log').append('<tr style="color:'+(level=="error"?"red": level=="debug"?"gray": "black")+'"><td>' + time + "</td><td>"+msg+"</td><td>" + (level=="code"?"<code>":"") + data + (level=="code"?"</code>":"") + '</td><td></td></tr>');
}

const recognition = speech_recognition('en-US', log);

$('#record').on('click', function() {
  if (recognition.recording) {
    recognition.recording = false;
    log("... stopped.", "", "log", true);
    recognition.stop();
    $('#record').text('Record');
    return;
  }
  $('#log').empty();
  recognition.recording = true;
  recognition.start();
  log("Listening...", "", "log", true);
  $('#record').text('Stop');
});

recognition.onend = function() {
  transcript = recognition.recorded_text.join(" ");
  log("Transcript: ", transcript);
  recognition.recorded_text = [];
  use_ai(transcript, PREFIX_PROMPT_QUERY.replace("@@@SCHEMA@@@", $("#schema").text()), 
    function(json) {
      if(json.query !== undefined) {
        if(json.query == null) {
          log("Query: ", "null", "error");
          return;
        }
        log("Query: ", json.query, "code");
        use_ai(json.query, PREFIX_PROMPT_CORRECT.replace("@@@SCHEMA@@@", $("#schema").text()).replace("@@@TASK@@@", $("#task").text()), function(json) {
          if(json.correct !== undefined) {
            log("Correct: ", json.correct, "code");
          }
          if(json.comment !== undefined) {
            log("Comment: ", json.comment, "code");
            speak(json.comment);
          } 
        });
      }  
    }, log);
};