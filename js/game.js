const DEBUG = true;
const PREFIX_PROMPT_QUERY = "Your task is to convert an SQL query, which the user recorded through a speech-to-text input, into correct syntax. Supported SQL commands are SELECT, INSERT, UPDATE, DELETE. Note that during the recording, some words and special characters might not have been understood correctly (e.g. staff instead of star, queen or screen instead of green), or special characters might have been omitted. That is okay and and small understanding errors should be compensated for by you. Please output only a JSON containing query:the_query. Nothing else. If the user input does not make sense as a SQL query (e.g., 'delete green ones') or is completely unrelated to SQL, **do not** attempt to generate a valid SQL query. Instead, return a JSON with query: null. The schema of the table is: @@@SCHEMA@@@. Now follows the user input:";
const PREFIX_PROMPT_CORRECT = "We are in an exciting space invaders game controlled by the user via SQL commands. Here is the database schema @@@SCHEMA@@@. This was the task: @@@TASK@@@. You are an overly enthusiastic, dramatic game character, sending radio messages from a control center, always ready to cheer or tease the user. After evaluating the user query, return a JSON with: correct:true if the user solved the task correctly, otherwise correct:false. And add a very short and extremely enthusiastic or dramatic phrase (no emojis) in the JSON field comment:your_comment to give feedback to the user about their solution. Be playful, exaggerated, and add humor, as if you're reacting to a high-stakes moment in the game. Nothing else. The comment should be very short. Now follows the user query: ";

var current_level = 0;

const GAME = [
  { 
    level: 1, 
    show: ["alien1", "alien2", "alien3", "alien4", "alien5", "alien6", "alien7", "rocket1", "satellite"]
   },
  { 
    level: 2, 
    suffix: "Use an UPDATE command. There is only one rocket in space, and that is a gray one. But there are other gray objects as well.",
    show: ["rocket2"],
    hide: ["rocket1"],
   },
   { 
    level: 3,
    suffix: "Mind that the correct number of columns have to be used in the INSERT command.",
    show: ["rocket3"],
    effect: ["alien4", "alien7"]
   },
   {
    level: 4,
    suffix: "A DELETE command should be used to delete objects with name 'alien' and color 'red', no other red objects, and no other aliens!",
    explode: ["alien4", "alien7"],
    show: ["alien1f", "alien2f", "alien4f"],
    hide: ["alien1", "alien2", "alien4"],
   },
   {
    level: 5,
    hide: ["alien1", "alien2", "alien3", "alien4", "alien5", "alien6", "alien7", "rocket2", "rocket3", "satellite"],
   },
]

try {
let log_start;
function log(msg, data="", level="log", reset_time=false) {
  if (!DEBUG && level=="debug") return;
  if (log_start === undefined || reset_time) {
    log_start = Date.now();
  }
  let time = (Date.now() - log_start) / 1000;
  //$('#log').append('<tr style="color:'+(level=="error"?"red": level=="debug"?"gray": "black")+'"><td>' + time + "</td><td>"+msg+"</td><td>" + (level=="code"?"<code>":"") + data + (level=="code"?"</code>":"") + '</td><td></td></tr>');
  console.log(msg, data);
}

var recognition;
try {
  recognition = speech_recognition('en-US', log);
} catch (error) { 
  recognition = {};
  $('#record').hide();
  $('#query').show();
}

$('#record').on('click', function() {
  if (recognition.recording) {
    recognition.recording = false;
    log("... stopped.", "", "log", true);
    recognition.stop();
    $('#record').text('🔴 Record SQL Query');
    return;
  }
  $('#log').empty();
  recognition.recording = true;
  recognition.start();
  log("Listening...", "", "log", true);
  $('#record').text('⬜ Stop Recording');
});

recognition.onend = function() {
  transcript = recognition.recorded_text.join(" ");
  log("Transcript: ", transcript);
  recognition.recorded_text = [];
  ai_query(transcript);
};

window.onload = function() {
  document.getElementById('query').focus();
}

$('#query').on('input', function() {
  let query = $('#query').val();
  $('#log').empty();
  $('#query').val('');
  ai_query(query);
});

function ai_query(query) {
  use_ai(query, PREFIX_PROMPT_QUERY.replace("@@@SCHEMA@@@", $("#schema").text()), 
    function(json) {
      if(json.query !== undefined) {
        if(json.query == null) {
          log("Query: ", "null", "error");
          return;
        }
        log("Query: ", json.query, "code");
        showToast(json.query);
        if(current_level == 0 || current_level > GAME.length) {
          return;
        }
        let task = $("#text-level-"+current_level).text();
        if(GAME[current_level-1].suffix !== undefined) {
          task += " "+GAME[current_level-1].suffix;
        }
        use_ai(json.query, PREFIX_PROMPT_CORRECT.replace("@@@SCHEMA@@@", $("#schema").text()).replace("@@@TASK@@@", task), function(json) {
          if(json.correct !== undefined) {
            log("Correct: ", json.correct, "code");
            if(json.correct) {
              if(GAME[current_level-1].show !== undefined) {
                for(let i=0; i<GAME[current_level-1].show.length; i++) {
                    $('#'+GAME[current_level-1].show[i]).css('display', 'inline-block').show();
                }
              }
              if(GAME[current_level-1].hide !== undefined) {
                for(let i=0; i<GAME[current_level-1].hide.length; i++) {
                  $('#'+GAME[current_level-1].hide[i]).hide();
                }
              }
              if(GAME[current_level-1].explode !== undefined) {
                for(let i=0; i<GAME[current_level-1].explode.length; i++) {
                  explode(document.getElementById(GAME[current_level-1].explode[i]));
                }
              }
              if(GAME[current_level-1].effect !== undefined) {
                for(let i=0; i<GAME[current_level-1].effect.length; i++) {
                  $('#'+GAME[current_level-1].effect[i]).addClass('flicker');
                }
              }
              start_level(current_level+1);
            }
          }
          if(json.comment !== undefined) {
            log("Comment: ", json.comment, "code");
            speak(json.comment);
          } 
        });
      }  
    }, log);
}

} catch (error) {
  $('#errorList').append('<li>'+error+'</li>');
}

window.onload = function() {
  document.getElementById('query').focus();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.style.animation = 'none';
  void toast.offsetWidth;  
  toast.innerText = message;
  toast.style.animation = 'slideInFadeOut 5s forwards';
}

function explode(element) {
  const rect = element.getBoundingClientRect();
  const explosionContainer = document.createElement('div');
  explosionContainer.style.position = 'absolute';
  explosionContainer.style.top = `${rect.top}px`;
  explosionContainer.style.left = `${rect.left}px`;
  explosionContainer.style.width = `${rect.width}px`;
  explosionContainer.style.height = `${rect.height}px`;
  explosionContainer.style.pointerEvents = 'none';  
  document.body.appendChild(explosionContainer);

  for (let i = 0; i < 5; i++) {
      const explosion = document.createElement('div');
      explosion.classList.add('explosion');
      
      explosion.style.top = `${Math.random() * 100}%`;
      explosion.style.left = `${Math.random() * 100}%`;

      explosion.style.animation = `explode 1s forwards`;
      
      explosionContainer.appendChild(explosion);
  }

  setTimeout(() => {
      explosionContainer.remove();
  }, 1000);

  setTimeout(() => {
      element.remove();
  }, 1100);
}

function start_level(level) {
  current_level = level;
  $('#btn-start').hide();
  $('.star-wars').hide();
  document.getElementById("text-level-"+level).style.display = "flex";
  if(level > 1) { // move text down
    document.getElementById("text-level-"+level).style.bottom = "-25vh";
  }
}